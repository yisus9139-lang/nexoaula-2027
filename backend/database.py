from pathlib import Path
import os
import sqlite3

# Cargar automáticamente variables de entorno locales desde archivo .env si existe
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base

raw_database_url = os.getenv("DATABASE_URL") or os.getenv("NEXO_DATABASE_URL")

if raw_database_url:
    # Soporte para prefijo postgres:// común en Render, Supabase y Neon
    if raw_database_url.startswith("postgres://"):
        raw_database_url = raw_database_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URL = raw_database_url
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )
    IS_SQLITE = False
else:
    env_db = os.getenv("NEXO_DB_PATH")
    if env_db:
        DB_FILE = Path(env_db)
        DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    else:
        DB_FILE = Path(__file__).resolve().parent / "nexoaula.db"

    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE.as_posix()}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30},
    )
    IS_SQLITE = True

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


EXACT_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    pin_acceso TEXT NOT NULL UNIQUE,
    telefono TEXT,
    rol TEXT NOT NULL DEFAULT 'AUDITOR'
);

CREATE TABLE IF NOT EXISTS cortes_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN NOT NULL DEFAULT 0,
    cerrado BOOLEAN NOT NULL DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS control_salones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corte_id INTEGER NOT NULL,
    sede TEXT NOT NULL,
    grado TEXT NOT NULL,
    grupo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'DISPONIBLE',
    funcionario_id INTEGER,
    solicitado_por_id INTEGER,
    solicitado_por_nombre TEXT,
    fecha_solicitud DATETIME,
    fecha_inicio DATETIME,
    fecha_cierre DATETIME,
    UNIQUE(corte_id, sede, grado, grupo),
    FOREIGN KEY (corte_id) REFERENCES cortes_auditoria(id) ON DELETE CASCADE,
    FOREIGN KEY (funcionario_id) REFERENCES usuarios(id),
    FOREIGN KEY (solicitado_por_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS estudiantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    grado TEXT NOT NULL,
    grupo TEXT NOT NULL,
    sede TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auditoria_2027 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante_id INTEGER NOT NULL,
    corte_id INTEGER NOT NULL,
    asistio BOOLEAN NOT NULL DEFAULT 0,
    estado_auditoria TEXT NOT NULL DEFAULT 'PENDIENTE',
    continua_2027 BOOLEAN,
    motivo_retiro TEXT,
    requisitos_matricula TEXT,
    observaciones TEXT,
    auditado_por_id INTEGER,
    auditado_por_nombre TEXT,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estudiante_id, corte_id),
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (corte_id) REFERENCES cortes_auditoria(id) ON DELETE CASCADE,
    FOREIGN KEY (auditado_por_id) REFERENCES usuarios(id)
);
"""


def init_db():
    if not IS_SQLITE:
        # Modo PostgreSQL (Neon, Supabase o Render PostgreSQL)
        import models  # Asegura el registro de modelos en Base.metadata
        Base.metadata.create_all(bind=engine)
        return

    with engine.begin() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL;"))

        # Verificar si existen tablas de una versión anterior sin corte_id para recrearlas limpiamente
        aud_cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(auditoria_2027);")).fetchall()
        }
        sal_cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(control_salones);")).fetchall()
        }
        if (aud_cols and "corte_id" not in aud_cols) or (
            sal_cols and "corte_id" not in sal_cols
        ):
            conn.execute(text("DROP TABLE IF EXISTS auditoria_2027;"))
            conn.execute(text("DROP TABLE IF EXISTS control_salones;"))

        for statement in EXACT_SCHEMA_SQL.strip().split(";"):
            stmt = statement.strip()
            if stmt:
                conn.execute(text(stmt))

        # Migración segura para tabla usuarios (columna telefono e índice único en pin_acceso)
        user_cols_res = conn.execute(text("PRAGMA table_info(usuarios);")).fetchall()
        existing_user_cols = {row[1] for row in user_cols_res}
        if "telefono" not in existing_user_cols:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN telefono TEXT;"))

        # Migración segura para tabla control_salones (solicitud de salones adicionales)
        sal_cols_res = conn.execute(text("PRAGMA table_info(control_salones);")).fetchall()
        existing_sal_cols = {row[1] for row in sal_cols_res}
        if "solicitado_por_id" not in existing_sal_cols:
            conn.execute(text("ALTER TABLE control_salones ADD COLUMN solicitado_por_id INTEGER;"))
        if "solicitado_por_nombre" not in existing_sal_cols:
            conn.execute(text("ALTER TABLE control_salones ADD COLUMN solicitado_por_nombre TEXT;"))
        if "fecha_solicitud" not in existing_sal_cols:
            conn.execute(text("ALTER TABLE control_salones ADD COLUMN fecha_solicitud DATETIME;"))

        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_pin_acceso ON usuarios(pin_acceso);"
            )
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
