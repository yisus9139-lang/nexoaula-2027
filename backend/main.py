import hashlib
import hmac
import os
import re
import sys
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote

# Asegurar que el directorio de backend esté en sys.path independientemente de cómo se invoque uvicorn
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pandas as pd
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from database import SessionLocal, get_db, init_db
from models import Auditoria2027, ControlSalon, CorteAuditoria, Estudiante, Usuario
from schemas import (
    AuditoriaUpdate,
    ControlSalonOut,
    CorteAuditoriaOut,
    CorteCreateRequest,
    EstudianteConAuditoriaOut,
    FinalizarSalonRequest,
    LiberarSalonRequest,
    LoginRequest,
    MOTIVOS_RETIRO_VALIDOS,
    PreasignarSalonesRequest,
    RecuperarAdminRequest,
    REQUISITOS_VALIDOS,
    ResolverSolicitudSalonRequest,
    SalonAsignadoResumen,
    SalonAsistenciaMasivaRequest,
    SolicitarSalonRequest,
    TomarSalonRequest,
    UsuarioCreateRequest,
    UsuarioOut,
    UsuarioUpdateRequest,
)
from seed import seed_database, sincronizar_salones_con_estudiantes

LLAVE_MAESTRA_RESPALDO = os.getenv("NEXO_LLAVE_MAESTRA", "NEXO-RECTORIA")
NEXO_SECRET_KEY = os.getenv(
    "NEXO_SECRET_KEY", "nexoaula-2027-hmac-secret-key-v4-rectoria"
)
SESSION_TOKEN_TTL_SECONDS = 24 * 60 * 60  # 24 horas
MAX_EXCEL_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB límite contra DoS en memoria

_CORS_ENV = os.getenv("NEXO_CORS_ORIGINS", "")
ALLOWED_CORS_ORIGINS = [
    o.strip()
    for o in _CORS_ENV.split(",")
    if o.strip()
] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]


def generar_token_sesion(usuario_id: int, rol: str, exp_ts: Optional[int] = None) -> str:
    """Genera un token firmado con HMAC-SHA256: '{uid}.{rol}.{exp}.{firma}'."""
    exp = exp_ts if exp_ts is not None else int(time.time()) + SESSION_TOKEN_TTL_SECONDS
    mensaje = f"{usuario_id}.{rol}.{exp}"
    firma = hmac.new(
        NEXO_SECRET_KEY.encode("utf-8"),
        mensaje.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{mensaje}.{firma}"


def verificar_token_sesion(token: str) -> Tuple[int, str]:
    """Verifica firma HMAC-SHA256 y vigencia temporal del token de sesión."""
    partes = (token or "").strip().split(".")
    if len(partes) != 4:
        raise HTTPException(
            status_code=401,
            detail="Tu sesión no es válida. Vuelve a ingresar con tu PIN de 4 dígitos.",
        )
    uid_str, rol, exp_str, firma_recibida = partes
    if not uid_str.isdigit() or not exp_str.isdigit():
        raise HTTPException(
            status_code=401,
            detail="Formato de token de sesión no válido.",
        )
    mensaje = f"{uid_str}.{rol}.{exp_str}"
    firma_esperada = hmac.new(
        NEXO_SECRET_KEY.encode("utf-8"),
        mensaje.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(firma_recibida, firma_esperada):
        raise HTTPException(
            status_code=401,
            detail="Firma de sesión no válida. Inicia sesión nuevamente.",
        )
    if int(exp_str) < int(time.time()):
        raise HTTPException(
            status_code=401,
            detail="Tu sesión expiró. Ingresa tu PIN de 4 dígitos para continuar.",
        )
    return int(uid_str), rol


def resolver_uid_autenticado(
    fallback_uid: Optional[int] = None,
    x_usuario_id: Optional[int] = None,
    x_session_token: Optional[str] = None,
) -> Optional[int]:
    """Prioriza la identidad criptográfica firmada en X-Session-Token sobre X-Usuario-Id."""
    if x_session_token and x_session_token.strip():
        uid_firmado, _ = verificar_token_sesion(x_session_token)
        if x_usuario_id is not None and int(x_usuario_id) != uid_firmado:
            raise HTTPException(
                status_code=403,
                detail="No coincide la identidad del usuario con el token de sesión activo.",
            )
        return uid_firmado
    return fallback_uid or x_usuario_id

# Protección anti-fuerza bruta en memoria por IP (ventana deslizante de 60s)
_AUTH_FAILED_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
MAX_AUTH_FAILURES_PER_MINUTE = 8


def _verificar_rate_limit_auth(client_ip: str):
    ahora = time.time()
    ventana = [t for t in _AUTH_FAILED_ATTEMPTS[client_ip] if ahora - t < 60.0]
    _AUTH_FAILED_ATTEMPTS[client_ip] = ventana
    if len(ventana) >= MAX_AUTH_FAILURES_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos fallidos. Espera 1 minuto antes de volver a intentar.",
        )


def _registrar_fallo_auth(client_ip: str):
    _AUTH_FAILED_ATTEMPTS[client_ip].append(time.time())


def _limpiar_fallos_auth(client_ip: str):
    _AUTH_FAILED_ATTEMPTS.pop(client_ip, None)


def _sanitizar_celda_excel(valor: str) -> str:
    """Previene Excel Formula Injection (CSV/XLSX Injection) neutralizando prefijos ejecutables."""
    if not valor:
        return ""
    texto = str(valor)
    if texto.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{texto}"
    return texto


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def generar_usuario_interno(db: Session, nombre: str) -> str:
    limpio = (
        nombre.strip()
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )
    slug = re.sub(r"[^a-z0-9]+", ".", limpio).strip(".")
    if not slug:
        slug = "funcionario"
    base = slug.split(".")[0][:16]
    candidato = base
    contador = 1
    while db.query(Usuario).filter(Usuario.usuario == candidato).first() is not None:
        contador += 1
        candidato = f"{base}{contador}"
    return candidato


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    yield


app = FastAPI(
    title="NexoAula 2027 — Cortes de Auditoría, Rutas y Matrícula 2027",
    description="API RESTful con SQLite WAL, múltiples cortes de auditoría (periodos), login por PIN único y semáforo de salones.",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_origin_regex=r"^https?:\/\/.*(\.onrender\.com|\.railway\.app|\.vercel\.app|\.netlify\.app|localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Usuario-Id", "X-Session-Token"],
)


# ==========================================
# FUNCIONES AUXILIARES DE CORTES Y PERMISOS
# ==========================================


def obtener_corte_activo_o_especifico(
    db: Session, corte_id: Optional[int] = None
) -> CorteAuditoria:
    if corte_id is not None:
        corte = db.query(CorteAuditoria).filter(CorteAuditoria.id == corte_id).first()
        if not corte:
            raise HTTPException(
                status_code=404,
                detail="No encontramos el corte de auditoría solicitado.",
            )
        return corte

    corte_activo = (
        db.query(CorteAuditoria)
        .filter(CorteAuditoria.activo.is_(True))
        .order_by(CorteAuditoria.id.desc())
        .first()
    )
    if corte_activo:
        return corte_activo

    ultimo_corte = db.query(CorteAuditoria).order_by(CorteAuditoria.id.desc()).first()
    if ultimo_corte:
        return ultimo_corte

    nuevo_corte = CorteAuditoria(
        nombre="Corte 2 - Auditoría Actual",
        descripcion="Periodo activo de auditoría de matrícula 2027",
        fecha_inicio=utc_now().strftime("%Y-%m-%d"),
        activo=True,
        cerrado=False,
    )
    db.add(nuevo_corte)
    db.commit()
    db.refresh(nuevo_corte)
    return nuevo_corte


def obtener_corte_anterior(
    db: Session, corte_actual_id: int
) -> Optional[CorteAuditoria]:
    return (
        db.query(CorteAuditoria)
        .filter(CorteAuditoria.id < corte_actual_id)
        .order_by(CorteAuditoria.id.desc())
        .first()
    )


def nombre_corto_corte(corte: Optional[CorteAuditoria]) -> str:
    if not corte or not corte.nombre:
        return "Corte anterior"
    partes = corte.nombre.split(" - ")
    return partes[0].strip() if partes else corte.nombre


def verificar_corte_abierto(corte: CorteAuditoria):
    if corte.cerrado:
        raise HTTPException(
            status_code=403,
            detail=f"Estás viendo el historial de {corte.nombre}. Este periodo ya cerró y no se puede modificar.",
        )


def verificar_es_admin(
    db: Session,
    admin_id: Optional[int] = None,
    x_usuario_id: Optional[int] = None,
    x_session_token: Optional[str] = None,
) -> Usuario:
    uid = resolver_uid_autenticado(
        fallback_uid=admin_id,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    if not uid:
        raise HTTPException(
            status_code=403,
            detail="Necesitas entrar con perfil de Coordinador / Administrador para realizar esta acción.",
        )

    user = db.query(Usuario).filter(Usuario.id == uid).first()
    if not user or user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo el perfil de Coordinador / Administrador puede realizar esta acción.",
        )
    return user


def obtener_o_crear_salon(
    db: Session, sede: str, grado: str, grupo: str, corte_id: int
) -> ControlSalon:
    salon = (
        db.query(ControlSalon)
        .options(joinedload(ControlSalon.funcionario))
        .filter(
            ControlSalon.corte_id == corte_id,
            ControlSalon.sede == sede,
            ControlSalon.grado == grado,
            ControlSalon.grupo == grupo,
        )
        .first()
    )
    if not salon:
        salon = ControlSalon(
            corte_id=corte_id,
            sede=sede,
            grado=grado,
            grupo=grupo,
            estado="DISPONIBLE",
        )
        db.add(salon)
        db.flush()
    return salon


def verificar_permiso_edicion_salon(
    db: Session,
    salon: ControlSalon,
    usuario: Optional[Usuario],
    corte: Optional[CorteAuditoria] = None,
):
    if corte and corte.cerrado:
        verificar_corte_abierto(corte)

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="¡Hola! Escribe tu PIN de 4 dígitos para entrar a tu recorrido.",
        )

    if usuario.rol == "ADMIN":
        return

    nombre_ocupante = (
        salon.funcionario.nombre if salon.funcionario else "Otro compañero"
    )
    etiqueta_grupo = f"{salon.grado}{salon.grupo}"

    if salon.estado == "COMPLETADO":
        raise HTTPException(
            status_code=403,
            detail=f"¡Listo! {nombre_ocupante} ya completó la auditoría de este salón. No necesitas volver a llamarlo.",
        )

    if salon.estado == "ASIGNADO":
        if salon.funcionario_id != usuario.id:
            raise HTTPException(
                status_code=403,
                detail=f"Coordinación reservó este salón para {nombre_ocupante}. Elige uno de tu lista o solicita un salón libre.",
            )
        salon.estado = "EN_AUDITORIA"
        salon.fecha_inicio = utc_now()
        salon.fecha_cierre = None
        db.flush()
        return

    if salon.estado == "DISPONIBLE":
        raise HTTPException(
            status_code=403,
            detail="Este salón está libre. Tómalo para empezar a llamar lista.",
        )

    if salon.estado == "EN_AUDITORIA" and salon.funcionario_id != usuario.id:
        raise HTTPException(
            status_code=403,
            detail=f"{nombre_ocupante} ya está auditando {etiqueta_grupo} en este momento. Elige otro grupo para no repetir el llamado.",
        )


def serialize_estudiante(
    est: Estudiante,
    aud: Optional[Auditoria2027],
    corte_id: int,
    salon_completado_100: bool = False,
    estado_salon: str = "DISPONIBLE",
    aud_anterior: Optional[Auditoria2027] = None,
    corte_anterior: Optional[CorteAuditoria] = None,
) -> EstudianteConAuditoriaOut:
    nombre_corto_ant = nombre_corto_corte(corte_anterior) if corte_anterior else None

    if corte_anterior and aud_anterior and aud_anterior.continua_2027 is not None:
        if aud_anterior.continua_2027 is True:
            estado_corte_anterior = f"En el {nombre_corto_ant} dijo: Sí continúa"
            etiqueta_corte_anterior = "Corte anterior: Continúa"
            continua_corte_anterior = True
        else:
            estado_corte_anterior = f"En el {nombre_corto_ant} dijo: No continúa"
            etiqueta_corte_anterior = "Corte anterior: Dudoso / Se retira"
            continua_corte_anterior = False
    else:
        estado_corte_anterior = "Sin dato previo"
        etiqueta_corte_anterior = "Sin dato previo"
        continua_corte_anterior = None

    continua_actual = aud.continua_2027 if aud else None
    cambio_opinion_negativo = bool(
        continua_corte_anterior is True and continua_actual is False
    )

    return EstudianteConAuditoriaOut(
        id=est.id,
        corte_id=corte_id,
        nombres=est.nombres,
        apellidos=est.apellidos,
        grado=est.grado,
        grupo=est.grupo,
        sede=est.sede,
        asistio=bool(aud.asistio) if aud else False,
        estado_auditoria=aud.estado_auditoria if aud else "PENDIENTE",
        continua_2027=continua_actual,
        motivo_retiro=aud.motivo_retiro if aud else None,
        requisitos_matricula=aud.requisitos_matricula if aud else None,
        observaciones=aud.observaciones if aud else None,
        auditado_por_id=aud.auditado_por_id if aud else None,
        auditado_por_nombre=aud.auditado_por_nombre if aud else None,
        fecha_actualizacion=aud.fecha_actualizacion if aud else None,
        salon_completado_100=salon_completado_100,
        estado_salon=estado_salon,
        estado_corte_anterior=estado_corte_anterior,
        etiqueta_corte_anterior=etiqueta_corte_anterior,
        continua_corte_anterior=continua_corte_anterior,
        nombre_corte_anterior=nombre_corto_ant,
        cambio_opinion_negativo=cambio_opinion_negativo,
    )


def enriquecer_usuarios(
    db: Session, corte_id: Optional[int] = None
) -> List[UsuarioOut]:
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    usuarios = db.query(Usuario).order_by(Usuario.id.asc()).all()

    conteo_auditados = dict(
        db.query(Auditoria2027.auditado_por_id, func.count(Auditoria2027.id))
        .filter(
            Auditoria2027.corte_id == corte.id,
            Auditoria2027.auditado_por_id.isnot(None),
            Auditoria2027.estado_auditoria == "AUDITADO",
        )
        .group_by(Auditoria2027.auditado_por_id)
        .all()
    )

    todos_salones = (
        db.query(ControlSalon)
        .filter(
            ControlSalon.corte_id == corte.id,
            ControlSalon.funcionario_id.isnot(None),
            ControlSalon.estado.in_(["ASIGNADO", "EN_AUDITORIA", "COMPLETADO"]),
        )
        .order_by(
            ControlSalon.sede.asc(),
            ControlSalon.grado.asc(),
            ControlSalon.grupo.asc(),
        )
        .all()
    )

    mapa_salones_por_func = {}
    for s in todos_salones:
        mapa_salones_por_func.setdefault(s.funcionario_id, []).append(
            SalonAsignadoResumen(
                sede=s.sede,
                grado=s.grado,
                grupo=s.grupo,
                estado=s.estado,
            )
        )

    resultado = []
    for u in usuarios:
        lista_salones = mapa_salones_por_func.get(u.id, [])
        resultado.append(
            UsuarioOut(
                id=u.id,
                nombre=u.nombre,
                usuario=u.usuario,
                rol=u.rol,
                pin_acceso=u.pin_acceso,
                telefono=u.telefono,
                estudiantes_auditados_hoy=conteo_auditados.get(u.id, 0),
                salones_asignados_count=len(lista_salones),
                salones_asignados=lista_salones,
            )
        )
    return resultado


def construir_corte_out(
    db: Session, corte: CorteAuditoria, total_estudiantes: int
) -> CorteAuditoriaOut:
    auds = (
        db.query(Auditoria2027)
        .filter(Auditoria2027.corte_id == corte.id)
        .all()
    )
    auditados = sum(1 for a in auds if a.estado_auditoria == "AUDITADO")
    continuan = sum(1 for a in auds if a.continua_2027 is True)
    retiros = sum(1 for a in auds if a.continua_2027 is False)
    pct = round((auditados / total_estudiantes) * 100, 1) if total_estudiantes > 0 else 0.0

    return CorteAuditoriaOut(
        id=corte.id,
        nombre=corte.nombre,
        descripcion=corte.descripcion,
        fecha_inicio=corte.fecha_inicio,
        fecha_fin=corte.fecha_fin,
        activo=bool(corte.activo),
        cerrado=bool(corte.cerrado),
        creado_en=corte.creado_en,
        total_estudiantes=total_estudiantes,
        auditados=auditados,
        porcentaje_avance=pct,
        continuan_2027=continuan,
        retiros_2027=retiros,
    )


# ==========================================
# 0. ENDPOINTS DE CORTES DE AUDITORÍA (PERIODOS)
# ==========================================


@app.get("/cortes", response_model=List[CorteAuditoriaOut])
def listar_cortes(db: Session = Depends(get_db)):
    total_estudiantes = db.query(Estudiante).count()
    cortes = db.query(CorteAuditoria).order_by(CorteAuditoria.id.asc()).all()
    return [construir_corte_out(db, c, total_estudiantes) for c in cortes]


@app.post("/cortes")
def crear_corte(
    payload: CorteCreateRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)

    nombre_limpio = payload.nombre.strip()
    if not nombre_limpio:
        raise HTTPException(
            status_code=400,
            detail="Escribe un nombre para identificar este nuevo corte de auditoría.",
        )

    duplicado = (
        db.query(CorteAuditoria)
        .filter(func.lower(CorteAuditoria.nombre) == nombre_limpio.lower())
        .first()
    )
    if duplicado:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un corte con ese nombre. Prueba con otro nombre, como 'Corte 3 - Cierre Matrículas'.",
        )

    # Identificar el corte anterior como base
    corte_anterior = (
        db.query(CorteAuditoria)
        .filter(CorteAuditoria.activo.is_(True))
        .order_by(CorteAuditoria.id.desc())
        .first()
    )
    if not corte_anterior:
        corte_anterior = (
            db.query(CorteAuditoria).order_by(CorteAuditoria.id.desc()).first()
        )

    # Desactivar los cortes previos
    db.query(CorteAuditoria).update({"activo": False})

    hoy_str = utc_now().strftime("%Y-%m-%d")
    nuevo_corte = CorteAuditoria(
        nombre=nombre_limpio,
        descripcion=(payload.descripcion or "").strip() or None,
        fecha_inicio=payload.fecha_inicio or hoy_str,
        fecha_fin=payload.fecha_fin or None,
        activo=True,
        cerrado=False,
        creado_en=utc_now(),
    )
    db.add(nuevo_corte)
    db.flush()

    # Configurar los salones del nuevo corte (limpios en DISPONIBLE o copiando rutas asignadas)
    grupos_est = (
        db.query(Estudiante.sede, Estudiante.grado, Estudiante.grupo)
        .distinct()
        .all()
    )
    mapa_rutas_previas = {}
    if payload.mantener_rutas_asignadas and corte_anterior:
        salones_previos = (
            db.query(ControlSalon)
            .filter(ControlSalon.corte_id == corte_anterior.id)
            .all()
        )
        for sp in salones_previos:
            if sp.funcionario_id:
                mapa_rutas_previas[(sp.sede, sp.grado, sp.grupo)] = sp.funcionario_id

    for sede, grado, grupo in grupos_est:
        func_asignado = mapa_rutas_previas.get((sede, grado, grupo))
        db.add(
            ControlSalon(
                corte_id=nuevo_corte.id,
                sede=sede,
                grado=grado,
                grupo=grupo,
                estado="ASIGNADO" if func_asignado else "DISPONIBLE",
                funcionario_id=func_asignado,
                fecha_inicio=None,
                fecha_cierre=None,
            )
        )

    # Crear registros de auditoría para todos los estudiantes en el nuevo corte
    estudiantes_todos = db.query(Estudiante).all()
    mapa_aud_previa: Dict[int, Auditoria2027] = {}
    if payload.pre_cargar_respuestas_anteriores and corte_anterior:
        auds_prev = (
            db.query(Auditoria2027)
            .filter(Auditoria2027.corte_id == corte_anterior.id)
            .all()
        )
        mapa_aud_previa = {a.estudiante_id: a for a in auds_prev}

    now = utc_now()
    for est in estudiantes_todos:
        prev = (
            mapa_aud_previa.get(est.id)
            if payload.pre_cargar_respuestas_anteriores
            else None
        )
        db.add(
            Auditoria2027(
                estudiante_id=est.id,
                corte_id=nuevo_corte.id,
                asistio=False,
                estado_auditoria="PENDIENTE",
                continua_2027=prev.continua_2027 if prev else None,
                requisitos_matricula=prev.requisitos_matricula if prev else None,
                motivo_retiro=prev.motivo_retiro if prev else None,
                observaciones=prev.observaciones if prev else "",
                auditado_por_id=None,
                auditado_por_nombre=None,
                fecha_actualizacion=now,
            )
        )

    db.commit()
    db.refresh(nuevo_corte)

    corte_out = construir_corte_out(db, nuevo_corte, len(estudiantes_todos))
    return {
        "mensaje": f"¡Listo! Abrimos {nuevo_corte.nombre} como el periodo activo en terreno.",
        "corte": corte_out,
    }


@app.put("/cortes/{corte_id}/activar")
def activar_corte(
    corte_id: int,
    admin_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, admin_id, x_usuario_id)

    corte = db.query(CorteAuditoria).filter(CorteAuditoria.id == corte_id).first()
    if not corte:
        raise HTTPException(
            status_code=404,
            detail="No encontramos este corte de auditoría.",
        )

    db.query(CorteAuditoria).update({"activo": False})
    corte.activo = True
    corte.cerrado = False
    db.commit()
    sincronizar_salones_con_estudiantes(db, corte_id=corte.id)
    db.refresh(corte)

    total_est = db.query(Estudiante).count()
    return {
        "mensaje": f"Activamos {corte.nombre} como el periodo actual de trabajo.",
        "corte": construir_corte_out(db, corte, total_est),
    }


@app.put("/cortes/{corte_id}/cerrar")
def cerrar_corte(
    corte_id: int,
    admin_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, admin_id, x_usuario_id)

    corte = db.query(CorteAuditoria).filter(CorteAuditoria.id == corte_id).first()
    if not corte:
        raise HTTPException(
            status_code=404,
            detail="No encontramos este corte de auditoría.",
        )

    corte.cerrado = True
    if not corte.fecha_fin:
        corte.fecha_fin = utc_now().strftime("%Y-%m-%d")
    db.commit()
    db.refresh(corte)

    total_est = db.query(Estudiante).count()
    return {
        "mensaje": f"Cerramos {corte.nombre}. Sus datos quedaron guardados en modo consulta histórica.",
        "corte": construir_corte_out(db, corte, total_est),
    }


# ==========================================
# 1. RUTAS DE LOGIN POR PIN ÚNICO, RECUPERACIÓN Y CRUD DE EQUIPO
# ==========================================


@app.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(
    corte_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
):
    uid = resolver_uid_autenticado(
        fallback_uid=None,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    solicitante = (
        db.query(Usuario).filter(Usuario.id == uid).first()
        if uid
        else None
    )
    es_admin = bool(solicitante and solicitante.rol == "ADMIN")
    lista = enriquecer_usuarios(db, corte_id=corte_id)
    if not es_admin:
        for u in lista:
            if not solicitante or u.id != solicitante.id:
                u.pin_acceso = "****"
    return lista


@app.post("/auth/login", response_model=UsuarioOut)
def iniciar_sesion_por_pin(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request and request.client else "local"
    _verificar_rate_limit_auth(client_ip)

    pin_limpio = payload.pin_acceso.strip()
    user = db.query(Usuario).filter(Usuario.pin_acceso == pin_limpio).first()

    if not user:
        _registrar_fallo_auth(client_ip)
        raise HTTPException(
            status_code=401,
            detail="No reconocemos ese PIN. Revisa los 4 números o pídele tu código al coordinador.",
        )

    _limpiar_fallos_auth(client_ip)
    token = generar_token_sesion(user.id, user.rol)
    usuarios_enriquecidos = enriquecer_usuarios(db)
    for item in usuarios_enriquecidos:
        if item.id == user.id:
            item.session_token = token
            return item
    out = UsuarioOut.model_validate(user)
    out.session_token = token
    return out


@app.post("/auth/recuperar-admin")
def recuperar_pin_admin(
    payload: RecuperarAdminRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request and request.client else "local"
    _verificar_rate_limit_auth(client_ip)

    llave_ingresada = payload.llave_maestra.strip()
    nuevo_pin = payload.nuevo_pin.strip()

    if not hmac.compare_digest(
        llave_ingresada.upper().encode("utf-8"),
        LLAVE_MAESTRA_RESPALDO.upper().encode("utf-8"),
    ):
        _registrar_fallo_auth(client_ip)
        raise HTTPException(
            status_code=403,
            detail="Esa llave de respaldo no es correcta. Verifica el código con Rectoría o Sistemas.",
        )

    _limpiar_fallos_auth(client_ip)

    if len(nuevo_pin) != 4 or not nuevo_pin.isdigit():
        raise HTTPException(
            status_code=400,
            detail="El nuevo PIN debe tener exactamente 4 números.",
        )

    admin_principal = (
        db.query(Usuario)
        .filter(Usuario.rol == "ADMIN")
        .order_by(Usuario.id.asc())
        .first()
    )
    if not admin_principal:
        raise HTTPException(
            status_code=404,
            detail="No encontramos un perfil de Coordinación en el sistema.",
        )

    conflicto_pin = (
        db.query(Usuario)
        .filter(
            Usuario.pin_acceso == nuevo_pin,
            Usuario.id != admin_principal.id,
        )
        .first()
    )
    if conflicto_pin:
        raise HTTPException(
            status_code=409,
            detail=f"Ese PIN ({nuevo_pin}) ya lo usa {conflicto_pin.nombre}. Elige otros 4 números.",
        )

    admin_principal.pin_acceso = nuevo_pin
    db.commit()
    db.refresh(admin_principal)

    usuarios_enriquecidos = enriquecer_usuarios(db)
    admin_out = next(
        (u for u in usuarios_enriquecidos if u.id == admin_principal.id),
        admin_principal,
    )
    if hasattr(admin_out, "session_token"):
        admin_out.session_token = generar_token_sesion(
            admin_principal.id, admin_principal.rol
        )

    return {
        "mensaje": f"¡Listo! Actualizamos tu PIN de Coordinación a {nuevo_pin}.",
        "usuario": admin_out,
    }


@app.post("/usuarios")
def crear_usuario(
    payload: UsuarioCreateRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)

    nombre_limpio = payload.nombre.strip()
    pin_limpio = payload.pin_acceso.strip()
    telefono_limpio = (
        re.sub(r"[^\d+]", "", payload.telefono.strip())
        if payload.telefono and payload.telefono.strip()
        else None
    )
    rol_limpio = (
        payload.rol.strip().upper()
        if payload.rol and payload.rol.strip().upper() in ("ADMIN", "AUDITOR")
        else "AUDITOR"
    )

    if not nombre_limpio or len(pin_limpio) != 4 or not pin_limpio.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Escribe el nombre completo y un PIN numérico de 4 dígitos.",
        )

    pin_existente = db.query(Usuario).filter(Usuario.pin_acceso == pin_limpio).first()
    if pin_existente:
        raise HTTPException(
            status_code=409,
            detail=f"El PIN {pin_limpio} ya lo tiene asignado {pin_existente.nombre}. Elige otros 4 números.",
        )

    if payload.usuario and payload.usuario.strip():
        usuario_interno = payload.usuario.strip().lower()
        if db.query(Usuario).filter(Usuario.usuario == usuario_interno).first():
            raise HTTPException(
                status_code=409,
                detail="Ese nombre de usuario ya está en uso. Prueba agregando su apellido o un número.",
            )
    else:
        usuario_interno = generar_usuario_interno(db, nombre_limpio)

    nuevo = Usuario(
        nombre=nombre_limpio,
        usuario=usuario_interno,
        pin_acceso=pin_limpio,
        telefono=telefono_limpio,
        rol=rol_limpio,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return {
        "mensaje": f"¡Listo! Ya creaste el perfil de {nuevo.nombre}. Comparte su PIN ({nuevo.pin_acceso}) para que entre desde su celular.",
        "usuario": UsuarioOut(
            id=nuevo.id,
            nombre=nuevo.nombre,
            usuario=nuevo.usuario,
            rol=nuevo.rol,
            pin_acceso=nuevo.pin_acceso,
            telefono=nuevo.telefono,
            estudiantes_auditados_hoy=0,
            salones_asignados_count=0,
            salones_asignados=[],
        ),
    }


@app.put("/usuarios/{usuario_id}")
def editar_usuario(
    usuario_id: int,
    payload: UsuarioUpdateRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)

    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No encontramos este perfil para editarlo.",
        )

    if (
        payload.rol
        and payload.rol.strip().upper() != "ADMIN"
        and user.rol == "ADMIN"
    ):
        total_admins = db.query(Usuario).filter(Usuario.rol == "ADMIN").count()
        if total_admins <= 1:
            raise HTTPException(
                status_code=400,
                detail="Debe quedar al menos un perfil Administrador activo en el equipo.",
            )

    if payload.pin_acceso is not None:
        nuevo_pin = payload.pin_acceso.strip()
        if len(nuevo_pin) != 4 or not nuevo_pin.isdigit():
            raise HTTPException(
                status_code=400,
                detail="El PIN debe tener exactamente 4 números.",
            )
        duplicado_pin = (
            db.query(Usuario)
            .filter(
                Usuario.pin_acceso == nuevo_pin,
                Usuario.id != usuario_id,
            )
            .first()
        )
        if duplicado_pin:
            raise HTTPException(
                status_code=409,
                detail=f"El PIN {nuevo_pin} ya lo tiene asignado {duplicado_pin.nombre}. Elige otros 4 números.",
            )
        user.pin_acceso = nuevo_pin

    if payload.nombre is not None and payload.nombre.strip():
        user.nombre = payload.nombre.strip()
        db.query(Auditoria2027).filter(
            Auditoria2027.auditado_por_id == user.id
        ).update({"auditado_por_nombre": user.nombre})

    if payload.telefono is not None:
        limpio_tel = re.sub(r"[^\d+]", "", payload.telefono.strip())
        user.telefono = limpio_tel if limpio_tel else None

    if payload.rol is not None and payload.rol.strip().upper() in ("ADMIN", "AUDITOR"):
        user.rol = payload.rol.strip().upper()

    db.commit()
    db.refresh(user)

    usuarios_enriquecidos = enriquecer_usuarios(db)
    actualizado = next(
        (item for item in usuarios_enriquecidos if item.id == user.id), None
    )

    return {
        "mensaje": f"Actualizamos los datos de {user.nombre}.",
        "usuario": actualizado,
    }


@app.delete("/usuarios/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    admin_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, admin_id, x_usuario_id)

    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No encontramos este perfil.",
        )

    if user.rol == "ADMIN":
        total_admins = db.query(Usuario).filter(Usuario.rol == "ADMIN").count()
        if total_admins <= 1:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar al único Administrador activo del sistema.",
            )

    nombre_eliminado = user.nombre

    salones_activos = (
        db.query(ControlSalon)
        .filter(
            ControlSalon.funcionario_id == user.id,
            ControlSalon.estado.in_(["ASIGNADO", "EN_AUDITORIA"]),
        )
        .all()
    )
    liberados = 0
    for s in salones_activos:
        s.estado = "DISPONIBLE"
        s.funcionario_id = None
        s.fecha_inicio = None
        s.fecha_cierre = None
        liberados += 1

    db.query(ControlSalon).filter(
        ControlSalon.funcionario_id == user.id,
        ControlSalon.estado == "COMPLETADO",
    ).update({"funcionario_id": None})

    db.query(ControlSalon).filter(
        ControlSalon.solicitado_por_id == user.id,
    ).update(
        {
            "estado": "DISPONIBLE",
            "solicitado_por_id": None,
            "solicitado_por_nombre": None,
            "fecha_solicitud": None,
        }
    )

    db.query(Auditoria2027).filter(
        Auditoria2027.auditado_por_id == user.id
    ).update({"auditado_por_id": None})

    db.delete(user)
    db.commit()

    return {
        "mensaje": f"Eliminamos el perfil de {nombre_eliminado} y liberamos sus {liberados} salones pendientes.",
        "salones_liberados": liberados,
    }


# ==========================================
# 2. RUTAS DE CONTROL Y PRE-ASIGNACIÓN DE SALONES POR CORTE
# ==========================================


@app.get("/salones", response_model=List[ControlSalonOut])
def listar_control_salones(
    sede: Optional[str] = Query(None),
    corte_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    sincronizar_salones_con_estudiantes(db, corte_id=corte.id)

    query_salones = (
        db.query(ControlSalon)
        .options(joinedload(ControlSalon.funcionario))
        .filter(ControlSalon.corte_id == corte.id)
    )
    if sede and sede != "TODAS":
        query_salones = query_salones.filter(ControlSalon.sede == sede)

    salones = query_salones.order_by(
        ControlSalon.sede.asc(),
        ControlSalon.grado.asc(),
        ControlSalon.grupo.asc(),
    ).all()

    estudiantes = db.query(Estudiante).all()
    auds_corte = (
        db.query(Auditoria2027)
        .filter(Auditoria2027.corte_id == corte.id)
        .all()
    )
    mapa_aud_por_est = {a.estudiante_id: a for a in auds_corte}

    mapa_stats = {}
    for est in estudiantes:
        key = (est.sede, est.grado, est.grupo)
        if key not in mapa_stats:
            mapa_stats[key] = {"total": 0, "auditados": 0, "presentes": 0}
        mapa_stats[key]["total"] += 1
        aud = mapa_aud_por_est.get(est.id)
        if aud and aud.estado_auditoria == "AUDITADO":
            mapa_stats[key]["auditados"] += 1
        if aud and aud.asistio:
            mapa_stats[key]["presentes"] += 1

    resultado = []
    for s in salones:
        st = mapa_stats.get(
            (s.sede, s.grado, s.grupo),
            {"total": 0, "auditados": 0, "presentes": 0},
        )
        total = st["total"]
        if total == 0:
            continue
        auditados = st["auditados"]
        pendientes = max(total - auditados, 0)
        pct = round((auditados / total) * 100, 1) if total > 0 else 0.0

        resultado.append(
            ControlSalonOut(
                id=s.id,
                corte_id=corte.id,
                sede=s.sede,
                grado=s.grado,
                grupo=s.grupo,
                estado=s.estado,
                funcionario_id=s.funcionario_id,
                funcionario_nombre=s.funcionario.nombre if s.funcionario else None,
                solicitado_por_id=s.solicitado_por_id,
                solicitado_por_nombre=s.solicitado_por_nombre,
                fecha_solicitud=s.fecha_solicitud,
                fecha_inicio=s.fecha_inicio,
                fecha_cierre=s.fecha_cierre,
                total_estudiantes=total,
                auditados=auditados,
                pendientes=pendientes,
                presentes=st["presentes"],
                porcentaje_avance=pct,
            )
        )

    return resultado


@app.post("/salones/preasignar")
def preasignar_salones_funcionario(
    payload: PreasignarSalonesRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    funcionario = (
        db.query(Usuario).filter(Usuario.id == payload.funcionario_id).first()
    )
    if not funcionario:
        raise HTTPException(
            status_code=404,
            detail="No encontramos al funcionario seleccionado.",
        )

    sincronizar_salones_con_estudiantes(db, corte_id=corte.id)

    claves_nuevas = {(s.sede, s.grado, s.grupo) for s in payload.salones}

    salones_previos_asignados = (
        db.query(ControlSalon)
        .filter(
            ControlSalon.corte_id == corte.id,
            ControlSalon.funcionario_id == funcionario.id,
            ControlSalon.estado == "ASIGNADO",
        )
        .all()
    )
    for s in salones_previos_asignados:
        if (s.sede, s.grado, s.grupo) not in claves_nuevas:
            s.estado = "DISPONIBLE"
            s.funcionario_id = None
            s.fecha_inicio = None
            s.fecha_cierre = None

    total_asignados = 0
    for item in payload.salones:
        salon = obtener_o_crear_salon(
            db, item.sede, item.grado, item.grupo, corte_id=corte.id
        )
        if salon.estado == "EN_AUDITORIA" and salon.funcionario_id == funcionario.id:
            total_asignados += 1
            continue

        salon.estado = "ASIGNADO"
        salon.funcionario_id = funcionario.id
        salon.fecha_inicio = None
        salon.fecha_cierre = None
        total_asignados += 1

    db.commit()

    return {
        "mensaje": f"¡Ruta lista! Le asignaste {total_asignados} salones a {funcionario.nombre}. Ya le aparecen en su celular.",
        "asignados": total_asignados,
        "funcionario_id": funcionario.id,
        "funcionario_nombre": funcionario.nombre,
    }


@app.post("/salones/tomar", response_model=ControlSalonOut)
def tomar_salon(payload: TomarSalonRequest, db: Session = Depends(get_db)):
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    usuario = db.query(Usuario).filter(Usuario.id == payload.funcionario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="No encontramos tu perfil de funcionario. Vuelve a iniciar sesión.",
        )

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )
    etiqueta_grupo = f"{salon.grado}{salon.grupo}"
    nombre_ocupante = (
        salon.funcionario.nombre if salon.funcionario else "Otro funcionario"
    )

    if salon.estado == "COMPLETADO" and usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=409,
            detail=f"¡Listo! {nombre_ocupante} ya completó la auditoría de este salón. No necesitas volver a llamarlo.",
        )

    if salon.estado in ("DISPONIBLE", "SOLICITADO") and usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Usa 'Solicitar salón' para que el coordinador te lo habilite en Mi Ruta.",
        )

    if (
        salon.estado == "ASIGNADO"
        and salon.funcionario_id is not None
        and salon.funcionario_id != usuario.id
        and usuario.rol != "ADMIN"
    ):
        raise HTTPException(
            status_code=403,
            detail=f"Coordinación reservó este salón para {nombre_ocupante}. Elige uno de tu lista o solicita un salón libre.",
        )

    if (
        salon.estado == "EN_AUDITORIA"
        and salon.funcionario_id is not None
        and salon.funcionario_id != usuario.id
        and usuario.rol != "ADMIN"
    ):
        raise HTTPException(
            status_code=409,
            detail=f"{nombre_ocupante} ya está auditando {etiqueta_grupo} en este momento. Elige otro grupo para no repetir el llamado.",
        )

    salon.estado = "EN_AUDITORIA"
    salon.funcionario_id = usuario.id
    salon.fecha_inicio = utc_now()
    salon.fecha_cierre = None
    db.commit()
    db.refresh(salon)

    salon_out = _obtener_salon_out(db, salon, corte.id)
    if salon_out:
        return salon_out

    return ControlSalonOut(
        id=salon.id,
        corte_id=corte.id,
        sede=salon.sede,
        grado=salon.grado,
        grupo=salon.grupo,
        estado=salon.estado,
        funcionario_id=usuario.id,
        funcionario_nombre=usuario.nombre,
        fecha_inicio=salon.fecha_inicio,
    )


def _formatear_grado(grado: str) -> str:
    grado_str = str(grado).strip()
    return grado_str if grado_str.endswith("°") else f"{grado_str}º"


def _construir_whatsapp_url(telefono: str, mensaje: str) -> str:
    base_wa = f"https://wa.me/{telefono}" if telefono else "https://wa.me/"
    return f"{base_wa}?text={quote(mensaje)}"


def _limpiar_solicitud_salon(salon: ControlSalon, reset_fechas: bool = True) -> None:
    salon.solicitado_por_id = None
    salon.solicitado_por_nombre = None
    salon.fecha_solicitud = None
    if reset_fechas:
        salon.fecha_inicio = None
        salon.fecha_cierre = None


def _obtener_salon_out(
    db: Session, salon: ControlSalon, corte_id: int
) -> Optional[ControlSalonOut]:
    salones_actualizados = listar_control_salones(
        sede=salon.sede, corte_id=corte_id, db=db
    )
    return next(
        (
            item
            for item in salones_actualizados
            if item.grado == salon.grado and item.grupo == salon.grupo
        ),
        None,
    )


@app.post("/salones/finalizar")
def finalizar_salon(payload: FinalizarSalonRequest, db: Session = Depends(get_db)):
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    usuario = db.query(Usuario).filter(Usuario.id == payload.funcionario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="No encontramos tu perfil de usuario.",
        )

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )
    if (
        usuario.rol != "ADMIN"
        and salon.funcionario_id is not None
        and salon.funcionario_id != usuario.id
    ):
        ocupante = salon.funcionario.nombre if salon.funcionario else "Otro compañero"
        raise HTTPException(
            status_code=403,
            detail=f"Solo {ocupante} o un coordinador puede cerrar este salón.",
        )

    salon.estado = "COMPLETADO"
    if not salon.funcionario_id:
        salon.funcionario_id = usuario.id
    if not salon.fecha_inicio:
        salon.fecha_inicio = utc_now()
    salon.fecha_cierre = utc_now()
    db.commit()

    return {
        "mensaje": f"¡Listo! Cerramos la auditoría de {salon.grado}{salon.grupo} en {salon.sede}.",
        "estado": "COMPLETADO",
    }


@app.post("/salones/liberar")
def liberar_o_reasignar_salon(
    payload: LiberarSalonRequest, db: Session = Depends(get_db)
):
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    admin_user = db.query(Usuario).filter(Usuario.id == payload.admin_id).first()
    if not admin_user or admin_user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo el perfil de Coordinador / Administrador puede liberar o reasignar salones.",
        )

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )

    if payload.nuevo_funcionario_id:
        nuevo_func = (
            db.query(Usuario)
            .filter(Usuario.id == payload.nuevo_funcionario_id)
            .first()
        )
        if not nuevo_func:
            raise HTTPException(
                status_code=404,
                detail="No encontramos al funcionario seleccionado para reasignar.",
            )
        salon.estado = "ASIGNADO"
        salon.funcionario_id = nuevo_func.id
        _limpiar_solicitud_salon(salon, reset_fechas=True)
        db.commit()
        return {
            "mensaje": f"Reservamos el salón {salon.grado}{salon.grupo} para {nuevo_func.nombre}.",
            "estado": salon.estado,
        }

    salon.estado = "DISPONIBLE"
    salon.funcionario_id = None
    _limpiar_solicitud_salon(salon, reset_fechas=True)
    db.commit()

    return {
        "mensaje": f"El salón {salon.grado}{salon.grupo} ya está libre para que otro compañero lo tome.",
        "estado": "DISPONIBLE",
    }


@app.post("/salones/solicitar")
def solicitar_salon_adicional(
    payload: SolicitarSalonRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    uid = payload.funcionario_id or x_usuario_id
    auditor = db.query(Usuario).filter(Usuario.id == uid).first() if uid else None
    if not auditor:
        raise HTTPException(
            status_code=404,
            detail="No encontramos tu perfil de usuario. Vuelve a iniciar sesión.",
        )

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )

    if salon.estado not in ("DISPONIBLE", "SOLICITADO"):
        raise HTTPException(
            status_code=409,
            detail="Este salón ya no está libre.",
        )

    if (
        salon.estado == "SOLICITADO"
        and salon.solicitado_por_id is not None
        and salon.solicitado_por_id != auditor.id
    ):
        raise HTTPException(
            status_code=409,
            detail=f"{salon.solicitado_por_nombre or 'Otro auditor'} ya solicitó este salón y espera aprobación.",
        )

    # Verificar si el auditor aún tiene salones pendientes en MI RUTA
    if auditor.rol == "AUDITOR":
        salones_ruta_activos = (
            db.query(ControlSalon)
            .filter(
                ControlSalon.corte_id == corte.id,
                ControlSalon.funcionario_id == auditor.id,
                ControlSalon.estado.in_(["ASIGNADO", "EN_AUDITORIA"]),
            )
            .all()
        )
        if salones_ruta_activos:
            # Revisar si alguno de esos salones aún tiene alumnos sin auditar
            for sr in salones_ruta_activos:
                ids_est_sr = [
                    r[0]
                    for r in db.query(Estudiante.id)
                    .filter(
                        Estudiante.sede == sr.sede,
                        Estudiante.grado == sr.grado,
                        Estudiante.grupo == sr.grupo,
                    )
                    .all()
                ]
                if not ids_est_sr:
                    continue
                auditados_sr = (
                    db.query(Auditoria2027)
                    .filter(
                        Auditoria2027.corte_id == corte.id,
                        Auditoria2027.estudiante_id.in_(ids_est_sr),
                        Auditoria2027.estado_auditoria == "AUDITADO",
                    )
                    .count()
                )
                if auditados_sr < len(ids_est_sr):
                    raise HTTPException(
                        status_code=400,
                        detail="Termina primero tus salones de Mi Ruta para pedir otro.",
                    )

    salon.estado = "SOLICITADO"
    salon.solicitado_por_id = auditor.id
    salon.solicitado_por_nombre = auditor.nombre
    salon.fecha_solicitud = utc_now()
    db.commit()
    db.refresh(salon)

    admin_principal = (
        db.query(Usuario)
        .filter(Usuario.rol == "ADMIN")
        .order_by(Usuario.id.asc())
        .first()
    )
    telefono_coord = (
        re.sub(r"\D", "", admin_principal.telefono or "")
        if admin_principal
        else ""
    )

    grado_fmt = _formatear_grado(salon.grado)
    mensaje_wa = (
        f"¡Hola, Coordinador! Soy {auditor.nombre}. "
        f"Ya terminé mi ruta inicial en NexoAula 2027 y acabo de solicitar en la app "
        f"el salón {grado_fmt} {salon.grupo} ({salon.sede}) para seguir apoyando. "
        f"¿Me lo apruebas por favor?"
    )

    return {
        "mensaje": "¡Solicitud enviada a la app! Toca abajo para avisarle también al WhatsApp del coordinador y que te lo habilite de una vez.",
        "telefono_coordinador": telefono_coord,
        "coordinador_nombre": admin_principal.nombre if admin_principal else "Coordinación",
        "whatsapp_mensaje": mensaje_wa,
        "whatsapp_url": _construir_whatsapp_url(telefono_coord, mensaje_wa),
        "salon": _obtener_salon_out(db, salon, corte.id),
    }


@app.post("/salones/aprobar-solicitud")
def aprobar_solicitud_salon(
    payload: ResolverSolicitudSalonRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )
    if not salon.solicitado_por_id:
        raise HTTPException(
            status_code=400,
            detail="Este salón no tiene una solicitud pendiente para aprobar.",
        )

    auditor = (
        db.query(Usuario).filter(Usuario.id == salon.solicitado_por_id).first()
    )
    if not auditor:
        raise HTTPException(
            status_code=404,
            detail="No encontramos al auditor que solicitó este salón.",
        )

    salon.estado = "ASIGNADO"
    salon.funcionario_id = auditor.id
    _limpiar_solicitud_salon(salon, reset_fechas=True)
    db.commit()
    db.refresh(salon)

    grado_fmt = _formatear_grado(salon.grado)
    tel_auditor = re.sub(r"\D", "", auditor.telefono or "")
    msg_confirmacion = (
        f"¡Listo, {auditor.nombre}! Ya te habilité {grado_fmt} {salon.grupo} ({salon.sede}) "
        f"en NexoAula 2027. Ya aparece en Mi Ruta para que llames asistencia."
    )

    return {
        "mensaje": f"Habilitaste {grado_fmt} {salon.grupo} en la ruta de {auditor.nombre}.",
        "auditor_id": auditor.id,
        "auditor_nombre": auditor.nombre,
        "auditor_telefono": tel_auditor,
        "whatsapp_url": _construir_whatsapp_url(tel_auditor, msg_confirmacion),
        "salon": _obtener_salon_out(db, salon, corte.id),
    }


@app.post("/salones/rechazar-solicitud")
def rechazar_solicitud_salon(
    payload: ResolverSolicitudSalonRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, payload.admin_id, x_usuario_id)
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    salon = obtener_o_crear_salon(
        db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
    )
    nombre_solicitante = salon.solicitado_por_nombre or "el auditor"

    salon.estado = "DISPONIBLE"
    _limpiar_solicitud_salon(salon, reset_fechas=False)
    db.commit()

    return {
        "mensaje": f"Rechazaste la solicitud de {nombre_solicitante}. El salón volvió a quedar Libre.",
        "estado": "DISPONIBLE",
    }


@app.get("/salones/solicitudes-pendientes", response_model=List[ControlSalonOut])
def listar_solicitudes_pendientes(
    corte_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    todos = listar_control_salones(sede=None, corte_id=corte.id, db=db)
    return [s for s in todos if s.estado == "SOLICITADO"]


# ==========================================
# 3. RUTAS DE ESTUDIANTES Y AUDITORÍA EN FILA POR CORTE
# ==========================================


@app.get("/estudiantes", response_model=List[EstudianteConAuditoriaOut])
def listar_estudiantes(
    sede: Optional[str] = Query(None, description="Filtra por sede"),
    grado: Optional[str] = Query(None, description="Filtra por grado"),
    grupo: Optional[str] = Query(None, description="Filtra por grupo"),
    busqueda: Optional[str] = Query(None, description="Busca por nombre o apellido"),
    estado_auditoria: Optional[str] = Query(None, description="Filtra por estado de auditoría"),
    corte_id: Optional[int] = Query(None, description="ID del corte de auditoría"),
    funcionario_id: Optional[int] = Query(None, description="ID del usuario en sesión"),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    corte_anterior = obtener_corte_anterior(db, corte.id)

    uid = resolver_uid_autenticado(
        fallback_uid=funcionario_id,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    usuario_sesion = (
        db.query(Usuario).filter(Usuario.id == uid).first() if uid else None
    )

    salones_permitidos_auditor = None
    if usuario_sesion and usuario_sesion.rol == "AUDITOR":
        salones_mios = (
            db.query(ControlSalon)
            .filter(
                ControlSalon.corte_id == corte.id,
                ControlSalon.funcionario_id == usuario_sesion.id,
            )
            .all()
        )
        salones_permitidos_auditor = {
            (s.sede, s.grado, s.grupo) for s in salones_mios
        }
        if not salones_permitidos_auditor:
            return []

    query = db.query(Estudiante)

    if sede and sede != "TODAS":
        query = query.filter(Estudiante.sede == sede)
    if grado and grado != "TODOS":
        query = query.filter(Estudiante.grado == grado)
    if grupo and grupo != "TODOS":
        query = query.filter(Estudiante.grupo == grupo)
    if busqueda and busqueda.strip():
        termino = f"%{busqueda.strip()}%"
        query = query.filter(
            or_(
                Estudiante.nombres.ilike(termino),
                Estudiante.apellidos.ilike(termino),
            )
        )

    estudiantes = query.order_by(
        Estudiante.sede.asc(),
        Estudiante.grado.asc(),
        Estudiante.grupo.asc(),
        Estudiante.apellidos.asc(),
        Estudiante.nombres.asc(),
    ).all()

    if salones_permitidos_auditor is not None:
        estudiantes = [
            e
            for e in estudiantes
            if (e.sede, e.grado, e.grupo) in salones_permitidos_auditor
        ]

    auds_actuales = (
        db.query(Auditoria2027)
        .filter(Auditoria2027.corte_id == corte.id)
        .all()
    )
    mapa_aud_actual = {a.estudiante_id: a for a in auds_actuales}

    mapa_aud_anterior: Dict[int, Auditoria2027] = {}
    if corte_anterior:
        auds_prev = (
            db.query(Auditoria2027)
            .filter(Auditoria2027.corte_id == corte_anterior.id)
            .all()
        )
        mapa_aud_anterior = {a.estudiante_id: a for a in auds_prev}

    mapa_salones = {
        (s.sede, s.grado, s.grupo): s.estado
        for s in db.query(ControlSalon)
        .filter(ControlSalon.corte_id == corte.id)
        .all()
    }

    resultado = []
    for est in estudiantes:
        aud = mapa_aud_actual.get(est.id)
        estado_est = aud.estado_auditoria if aud else "PENDIENTE"
        if estado_auditoria and estado_auditoria != "TODOS":
            if estado_est != estado_auditoria:
                continue

        resultado.append(
            serialize_estudiante(
                est=est,
                aud=aud,
                corte_id=corte.id,
                estado_salon=mapa_salones.get(
                    (est.sede, est.grado, est.grupo), "DISPONIBLE"
                ),
                aud_anterior=mapa_aud_anterior.get(est.id),
                corte_anterior=corte_anterior,
            )
        )

    return resultado


@app.put("/auditoria/{estudiante_id}", response_model=EstudianteConAuditoriaOut)
def actualizar_auditoria(
    estudiante_id: int,
    payload: AuditoriaUpdate,
    corte_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
):
    corte_target_id = payload.corte_id or corte_id
    corte = obtener_corte_activo_o_especifico(db, corte_target_id)
    verificar_corte_abierto(corte)

    est = db.query(Estudiante).filter(Estudiante.id == estudiante_id).first()
    if not est:
        raise HTTPException(
            status_code=404,
            detail="No encontramos a este estudiante. Actualiza la lista e intenta de nuevo.",
        )

    uid = resolver_uid_autenticado(
        fallback_uid=payload.funcionario_id,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    usuario = db.query(Usuario).filter(Usuario.id == uid).first() if uid else None
    salon = obtener_o_crear_salon(
        db, est.sede, est.grado, est.grupo, corte_id=corte.id
    )

    verificar_permiso_edicion_salon(db, salon, usuario, corte=corte)

    aud = (
        db.query(Auditoria2027)
        .filter(
            Auditoria2027.estudiante_id == est.id,
            Auditoria2027.corte_id == corte.id,
        )
        .first()
    )
    if not aud:
        aud = Auditoria2027(
            estudiante_id=est.id,
            corte_id=corte.id,
            asistio=False,
            estado_auditoria="PENDIENTE",
        )
        db.add(aud)
        db.flush()

    if payload.asistio is not None:
        aud.asistio = payload.asistio

    if payload.clear_continua:
        aud.continua_2027 = None
        aud.requisitos_matricula = None
        aud.motivo_retiro = None
        aud.estado_auditoria = "PENDIENTE"
    else:
        if payload.continua_2027 is not None:
            aud.continua_2027 = payload.continua_2027
            if payload.continua_2027 is True:
                aud.motivo_retiro = None
                if payload.requisitos_matricula is not None:
                    aud.requisitos_matricula = payload.requisitos_matricula
                elif not aud.requisitos_matricula:
                    aud.requisitos_matricula = "Cupo directo"
            else:
                aud.requisitos_matricula = None
                if payload.motivo_retiro is not None:
                    aud.motivo_retiro = payload.motivo_retiro
                elif not aud.motivo_retiro:
                    aud.motivo_retiro = "Otro"

        if payload.requisitos_matricula is not None and aud.continua_2027 is True:
            aud.requisitos_matricula = payload.requisitos_matricula

        if payload.motivo_retiro is not None and aud.continua_2027 is False:
            aud.motivo_retiro = payload.motivo_retiro

        if payload.observaciones is not None:
            aud.observaciones = payload.observaciones.strip()

        # Cualquier acción de llamado a lista (marcar asistencia o continuidad 2027)
        # deja al estudiante en estado AUDITADO (Listo)
        if payload.estado_auditoria in ("AUDITADO", "COMPLETO"):
            aud.estado_auditoria = "AUDITADO"
        elif payload.asistio is not None or aud.continua_2027 is not None:
            aud.estado_auditoria = "AUDITADO"
        elif payload.estado_auditoria == "PENDIENTE":
            aud.estado_auditoria = "PENDIENTE"

    if usuario:
        aud.auditado_por_id = usuario.id
        aud.auditado_por_nombre = usuario.nombre

    aud.fecha_actualizacion = utc_now()
    db.commit()
    db.refresh(aud)

    # Verificar si se completó el 100% del salón en este corte
    ids_salon = [
        r[0]
        for r in db.query(Estudiante.id)
        .filter(
            Estudiante.sede == est.sede,
            Estudiante.grado == est.grado,
            Estudiante.grupo == est.grupo,
        )
        .all()
    ]
    total_salon = len(ids_salon)
    auditados_salon = (
        db.query(Auditoria2027)
        .filter(
            Auditoria2027.corte_id == corte.id,
            Auditoria2027.estudiante_id.in_(ids_salon),
            Auditoria2027.estado_auditoria == "AUDITADO",
        )
        .count()
        if ids_salon
        else 0
    )
    salon_completado_100 = total_salon > 0 and auditados_salon == total_salon

    corte_anterior = obtener_corte_anterior(db, corte.id)
    aud_anterior = (
        db.query(Auditoria2027)
        .filter(
            Auditoria2027.estudiante_id == est.id,
            Auditoria2027.corte_id == corte_anterior.id,
        )
        .first()
        if corte_anterior
        else None
    )

    return serialize_estudiante(
        est=est,
        aud=aud,
        corte_id=corte.id,
        salon_completado_100=salon_completado_100,
        estado_salon=salon.estado,
        aud_anterior=aud_anterior,
        corte_anterior=corte_anterior,
    )


@app.put("/auditoria-salon/asistencia")
def marcar_asistencia_salon(
    payload: SalonAsistenciaMasivaRequest,
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, payload.corte_id)
    verificar_corte_abierto(corte)

    uid = payload.funcionario_id or x_usuario_id
    usuario = db.query(Usuario).filter(Usuario.id == uid).first() if uid else None

    if (
        payload.sede
        and payload.sede != "TODAS"
        and payload.grado
        and payload.grado != "TODOS"
        and payload.grupo
        and payload.grupo != "TODOS"
    ):
        salon = obtener_o_crear_salon(
            db, payload.sede, payload.grado, payload.grupo, corte_id=corte.id
        )
        verificar_permiso_edicion_salon(db, salon, usuario, corte=corte)
    elif not usuario or usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Filtra e inicia el llamado en tu salón específico para marcar la asistencia del grupo.",
        )

    query = db.query(Estudiante)
    if payload.sede and payload.sede != "TODAS":
        query = query.filter(Estudiante.sede == payload.sede)
    if payload.grado and payload.grado != "TODOS":
        query = query.filter(Estudiante.grado == payload.grado)
    if payload.grupo and payload.grupo != "TODOS":
        query = query.filter(Estudiante.grupo == payload.grupo)

    estudiantes = query.all()
    if not estudiantes:
        raise HTTPException(
            status_code=404,
            detail="No hay estudiantes en este filtro para marcar asistencia.",
        )

    ids_est = [e.id for e in estudiantes]
    auds_existentes = {
        a.estudiante_id: a
        for a in db.query(Auditoria2027)
        .filter(
            Auditoria2027.corte_id == corte.id,
            Auditoria2027.estudiante_id.in_(ids_est),
        )
        .all()
    }

    now = utc_now()
    actualizados = 0
    for est in estudiantes:
        aud = auds_existentes.get(est.id)
        if not aud:
            aud = Auditoria2027(
                estudiante_id=est.id,
                corte_id=corte.id,
                asistio=payload.asistio,
                estado_auditoria="AUDITADO",
                auditado_por_id=usuario.id if usuario else None,
                auditado_por_nombre=usuario.nombre if usuario else None,
                fecha_actualizacion=now,
            )
            db.add(aud)
        else:
            aud.asistio = payload.asistio
            aud.estado_auditoria = "AUDITADO"
            if usuario:
                aud.auditado_por_id = usuario.id
                aud.auditado_por_nombre = usuario.nombre
            aud.fecha_actualizacion = now
        actualizados += 1

    db.commit()
    return {
        "mensaje": f"¡Listo! Marcamos asistencia para {actualizados} estudiantes del salón.",
        "actualizados": actualizados,
    }


# ==========================================
# 4. CARGA EXCEL, ESTADÍSTICAS CON VARIACIÓN ENTRE CORTES Y REPORTES
# ==========================================


@app.post("/upload-excel")
async def subir_excel(
    file: UploadFile = File(...),
    reemplazar: bool = Query(False, description="Si es True, reemplaza el listado actual"),
    corte_id: Optional[int] = Query(None),
    admin_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, admin_id=admin_id, x_usuario_id=x_usuario_id)

    corte = obtener_corte_activo_o_especifico(db, corte_id)
    verificar_corte_abierto(corte)

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formato no compatible. Sube un archivo Excel (.xlsx) e intenta de nuevo.",
        )

    try:
        content = await file.read(MAX_EXCEL_UPLOAD_BYTES + 1)
        if len(content) > MAX_EXCEL_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="El archivo Excel supera el tamaño máximo permitido de 10 MB.",
            )
        df = pd.read_excel(BytesIO(content), engine="openpyxl")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="No pudimos leer tu Excel. Revisa que tenga las 5 columnas e intenta de nuevo.",
        )

    mapa_columnas = {}
    for col in df.columns:
        limpia = (
            str(col)
            .strip()
            .lower()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
        )
        mapa_columnas[limpia] = col

    columnas_requeridas = ["nombres", "apellidos", "grado", "grupo", "sede"]
    faltantes = [c for c in columnas_requeridas if c not in mapa_columnas]

    if faltantes:
        raise HTTPException(
            status_code=400,
            detail="No pudimos leer tu Excel. Revisa que tenga las 5 columnas (nombres, apellidos, grado, grupo y sede) e intenta de nuevo.",
        )

    df_limpio = df[
        [
            mapa_columnas["nombres"],
            mapa_columnas["apellidos"],
            mapa_columnas["grado"],
            mapa_columnas["grupo"],
            mapa_columnas["sede"],
        ]
    ].copy()
    df_limpio.columns = columnas_requeridas
    df_limpio = df_limpio.dropna(how="all")

    if df_limpio.empty:
        raise HTTPException(
            status_code=400,
            detail="Tu archivo Excel está vacío. Agrega al menos un estudiante y vuelve a subirlo.",
        )

    if reemplazar:
        db.query(Auditoria2027).delete()
        db.query(Estudiante).delete()
        db.query(ControlSalon).delete()
        db.commit()

    insertados = 0
    now = utc_now()

    for _, row in df_limpio.iterrows():
        nombres = str(row["nombres"]).strip() if pd.notna(row["nombres"]) else ""
        apellidos = str(row["apellidos"]).strip() if pd.notna(row["apellidos"]) else ""
        grado = str(row["grado"]).strip() if pd.notna(row["grado"]) else ""
        grupo = str(row["grupo"]).strip() if pd.notna(row["grupo"]) else ""
        sede = str(row["sede"]).strip() if pd.notna(row["sede"]) else ""

        if not (nombres and apellidos and grado and grupo and sede):
            continue

        nuevo_est = Estudiante(
            nombres=nombres,
            apellidos=apellidos,
            grado=grado,
            grupo=grupo,
            sede=sede,
        )
        db.add(nuevo_est)
        db.flush()

        nueva_aud = Auditoria2027(
            estudiante_id=nuevo_est.id,
            corte_id=corte.id,
            asistio=False,
            estado_auditoria="PENDIENTE",
            fecha_actualizacion=now,
        )
        db.add(nueva_aud)
        insertados += 1

    if insertados == 0:
        raise HTTPException(
            status_code=400,
            detail="No encontramos filas completas en tu Excel. Verifica que ningún estudiante tenga celdas vacías.",
        )

    db.commit()
    sincronizar_salones_con_estudiantes(db, corte_id=corte.id)

    return {
        "mensaje": f"¡Todo listo! Cargamos {insertados} estudiantes en {corte.nombre} y actualizamos el mapa de salones.",
        "insertados": insertados,
    }


@app.get("/estadisticas")
def obtener_estadisticas(
    sede: Optional[str] = Query(None),
    grado: Optional[str] = Query(None),
    grupo: Optional[str] = Query(None),
    corte_id: Optional[int] = Query(None),
    funcionario_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    corte_anterior = obtener_corte_anterior(db, corte.id)

    uid = resolver_uid_autenticado(
        fallback_uid=funcionario_id,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    usuario_sesion = (
        db.query(Usuario).filter(Usuario.id == uid).first() if uid else None
    )
    es_auditor = bool(usuario_sesion and usuario_sesion.rol == "AUDITOR")

    salones_permitidos_auditor = None
    salones_mios_objs: List[ControlSalon] = []
    if es_auditor and usuario_sesion:
        salones_mios_objs = (
            db.query(ControlSalon)
            .filter(
                ControlSalon.corte_id == corte.id,
                ControlSalon.funcionario_id == usuario_sesion.id,
            )
            .order_by(
                ControlSalon.sede.asc(),
                ControlSalon.grado.asc(),
                ControlSalon.grupo.asc(),
            )
            .all()
        )
        salones_permitidos_auditor = {
            (s.sede, s.grado, s.grupo) for s in salones_mios_objs
        }

    query = db.query(Estudiante)
    if sede and sede != "TODAS":
        query = query.filter(Estudiante.sede == sede)
    if grado and grado != "TODOS":
        query = query.filter(Estudiante.grado == grado)
    if grupo and grupo != "TODOS":
        query = query.filter(Estudiante.grupo == grupo)

    estudiantes = query.all()
    if salones_permitidos_auditor is not None:
        estudiantes = [
            e
            for e in estudiantes
            if (e.sede, e.grado, e.grupo) in salones_permitidos_auditor
        ]
    total_estudiantes = len(estudiantes)
    ids_est = [e.id for e in estudiantes]

    if ids_est:
        if len(ids_est) <= 500:
            auds_corte = (
                db.query(Auditoria2027)
                .filter(
                    Auditoria2027.corte_id == corte.id,
                    Auditoria2027.estudiante_id.in_(ids_est),
                )
                .all()
            )
        else:
            set_ids = set(ids_est)
            todas_auds = (
                db.query(Auditoria2027)
                .filter(Auditoria2027.corte_id == corte.id)
                .all()
            )
            auds_corte = [a for a in todas_auds if a.estudiante_id in set_ids]
    else:
        auds_corte = []
    mapa_aud = {a.estudiante_id: a for a in auds_corte}

    auditados = 0
    en_proceso = 0
    presentes = 0
    continuan = 0
    retiros = 0

    conteo_motivos = {m: 0 for m in MOTIVOS_RETIRO_VALIDOS}
    conteo_requisitos = {r: 0 for r in REQUISITOS_VALIDOS}
    mapa_sedes = {}

    for est in estudiantes:
        aud = mapa_aud.get(est.id)
        asistio = bool(aud.asistio) if aud else False
        estado = aud.estado_auditoria if aud else "PENDIENTE"
        continua = aud.continua_2027 if aud else None
        motivo = aud.motivo_retiro if aud else None
        requisito = aud.requisitos_matricula if aud else None

        if asistio:
            presentes += 1

        if estado == "AUDITADO":
            auditados += 1
        elif estado == "EN_PROCESO":
            en_proceso += 1

        if continua is True:
            continuan += 1
            if requisito:
                clave_req = requisito if requisito in conteo_requisitos else "Otro"
                conteo_requisitos[clave_req] += 1
        elif continua is False:
            retiros += 1
            if motivo:
                clave_mot = motivo if motivo in conteo_motivos else "Otro"
                conteo_motivos[clave_mot] += 1

        if est.sede not in mapa_sedes:
            mapa_sedes[est.sede] = {
                "sede": est.sede,
                "total": 0,
                "auditados": 0,
                "presentes": 0,
                "continuan": 0,
                "retiros": 0,
            }
        mapa_sedes[est.sede]["total"] += 1
        if estado == "AUDITADO":
            mapa_sedes[est.sede]["auditados"] += 1
        if asistio:
            mapa_sedes[est.sede]["presentes"] += 1
        if continua is True:
            mapa_sedes[est.sede]["continuan"] += 1
        elif continua is False:
            mapa_sedes[est.sede]["retiros"] += 1

    ausentes = max(total_estudiantes - presentes, 0)
    pendientes = max(total_estudiantes - auditados, 0)
    sin_definir_2027 = max(total_estudiantes - continuan - retiros, 0)

    pct_avance = (
        round((auditados / total_estudiantes) * 100, 1)
        if total_estudiantes > 0
        else 0.0
    )
    pct_asistencia = (
        round((presentes / total_estudiantes) * 100, 1)
        if total_estudiantes > 0
        else 0.0
    )
    pct_ausencia = (
        round((ausentes / total_estudiantes) * 100, 1)
        if total_estudiantes > 0
        else 0.0
    )
    pct_continuan = (
        round((continuan / total_estudiantes) * 100, 1)
        if total_estudiantes > 0
        else 0.0
    )
    pct_retiros = (
        round((retiros / total_estudiantes) * 100, 1)
        if total_estudiantes > 0
        else 0.0
    )

    # Calcular diferencia porcentual frente al corte anterior para el KPI 3 (Proyección 2027)
    variacion_vs_corte_anterior = None
    nombre_corte_ant = None
    pct_continuan_anterior = None
    continuan_anterior = None

    if corte_anterior and total_estudiantes > 0:
        if len(ids_est) <= 500:
            auds_prev = (
                db.query(Auditoria2027)
                .filter(
                    Auditoria2027.corte_id == corte_anterior.id,
                    Auditoria2027.estudiante_id.in_(ids_est),
                )
                .all()
            )
        else:
            set_ids = set(ids_est)
            todas_prev = (
                db.query(Auditoria2027)
                .filter(Auditoria2027.corte_id == corte_anterior.id)
                .all()
            )
            auds_prev = [a for a in todas_prev if a.estudiante_id in set_ids]
        continuan_anterior = sum(1 for a in auds_prev if a.continua_2027 is True)
        pct_continuan_anterior = round(
            (continuan_anterior / total_estudiantes) * 100, 1
        )
        variacion_vs_corte_anterior = round(
            pct_continuan - pct_continuan_anterior, 1
        )
        nombre_corte_ant = nombre_corto_corte(corte_anterior)

    desglose_motivos = [
        {
            "nombre": nombre,
            "total": total,
            "porcentaje": round((total / retiros) * 100, 1) if retiros > 0 else 0.0,
        }
        for nombre, total in conteo_motivos.items()
    ]

    desglose_requisitos = [
        {
            "nombre": nombre,
            "total": total,
            "porcentaje": round((total / continuan) * 100, 1) if continuan > 0 else 0.0,
        }
        for nombre, total in conteo_requisitos.items()
    ]

    mi_ruta_resumen = None
    bitacora_usuarios = []
    bitacora_eventos = []

    if es_auditor:
        est_por_salon: Dict[tuple, List[Estudiante]] = {}
        for est in estudiantes:
            est_por_salon.setdefault((est.sede, est.grado, est.grupo), []).append(est)

        detalle_salones = []
        for s_obj in salones_mios_objs:
            clave = (s_obj.sede, s_obj.grado, s_obj.grupo)
            ests_s = est_por_salon.get(clave, [])
            tot_s = len(ests_s)
            aud_s = 0
            pres_s = 0
            cont_s = 0
            ret_s = 0
            for e_s in ests_s:
                a_s = mapa_aud.get(e_s.id)
                if a_s and a_s.estado_auditoria == "AUDITADO":
                    aud_s += 1
                if a_s and a_s.asistio:
                    pres_s += 1
                if a_s and a_s.continua_2027 is True:
                    cont_s += 1
                elif a_s and a_s.continua_2027 is False:
                    ret_s += 1
            pct_s = round((aud_s / tot_s) * 100, 1) if tot_s > 0 else 0.0
            detalle_salones.append(
                {
                    "sede": s_obj.sede,
                    "grado": s_obj.grado,
                    "grupo": s_obj.grupo,
                    "estado": s_obj.estado,
                    "total_estudiantes": tot_s,
                    "auditados": aud_s,
                    "pendientes": max(tot_s - aud_s, 0),
                    "presentes": pres_s,
                    "continuan": cont_s,
                    "retiros": ret_s,
                    "porcentaje_avance": pct_s,
                }
            )

        mi_ruta_resumen = {
            "salones_totales": len(salones_mios_objs),
            "salones_completados": sum(
                1 for s in salones_mios_objs if s.estado == "COMPLETADO"
            ),
            "salones_en_curso": sum(
                1 for s in salones_mios_objs if s.estado == "EN_AUDITORIA"
            ),
            "salones_pendientes": sum(
                1 for s in salones_mios_objs if s.estado == "ASIGNADO"
            ),
            "detalle_salones": detalle_salones,
        }
    else:
        # Bitácora en tiempo real para el Coordinador (ADMIN)
        todos_usuarios = db.query(Usuario).order_by(Usuario.id.asc()).all()
        todos_salones_corte = (
            db.query(ControlSalon)
            .filter(ControlSalon.corte_id == corte.id)
            .order_by(
                ControlSalon.sede.asc(),
                ControlSalon.grado.asc(),
                ControlSalon.grupo.asc(),
            )
            .all()
        )
        todos_est_global = db.query(Estudiante).all()
        mapa_est_por_id = {e.id: e for e in todos_est_global}
        conteo_est_salon: Dict[tuple, int] = {}
        ids_est_por_salon: Dict[tuple, List[int]] = {}
        for e in todos_est_global:
            k = (e.sede, e.grado, e.grupo)
            conteo_est_salon[k] = conteo_est_salon.get(k, 0) + 1
            ids_est_por_salon.setdefault(k, []).append(e.id)

        todas_auds_corte = (
            db.query(Auditoria2027)
            .filter(Auditoria2027.corte_id == corte.id)
            .all()
        )
        mapa_aud_global = {a.estudiante_id: a for a in todas_auds_corte}

        # Última acción por usuario
        ultima_aud_por_usuario: Dict[int, Auditoria2027] = {}
        for a in todas_auds_corte:
            if a.auditado_por_id and a.estado_auditoria == "AUDITADO" and a.fecha_actualizacion:
                prev_a = ultima_aud_por_usuario.get(a.auditado_por_id)
                if not prev_a or (
                    prev_a.fecha_actualizacion
                    and a.fecha_actualizacion > prev_a.fecha_actualizacion
                ):
                    ultima_aud_por_usuario[a.auditado_por_id] = a

        for u in todos_usuarios:
            salones_u = [
                s for s in todos_salones_corte if s.funcionario_id == u.id
            ]
            solicitados_u = [
                s
                for s in todos_salones_corte
                if s.estado == "SOLICITADO" and s.solicitado_por_id == u.id
            ]
            en_curso_u = [s for s in salones_u if s.estado == "EN_AUDITORIA"]
            asignados_u = [s for s in salones_u if s.estado == "ASIGNADO"]
            completados_u = [s for s in salones_u if s.estado == "COMPLETADO"]

            est_ruta_total = 0
            est_ruta_auditados = 0
            for su in salones_u:
                k_su = (su.sede, su.grado, su.grupo)
                ids_su = ids_est_por_salon.get(k_su, [])
                est_ruta_total += len(ids_su)
                est_ruta_auditados += sum(
                    1
                    for eid in ids_su
                    if (
                        mapa_aud_global.get(eid)
                        and mapa_aud_global[eid].estado_auditoria == "AUDITADO"
                    )
                )

            pct_ruta = (
                round((est_ruta_auditados / est_ruta_total) * 100, 1)
                if est_ruta_total > 0
                else 0.0
            )

            # Determinar estado en terreno y ubicación actual en tiempo real
            salon_foco = None
            if en_curso_u:
                estado_operativo = "Auditando en vivo"
                salon_foco = en_curso_u[0]
            elif solicitados_u:
                estado_operativo = "Solicitando salón"
                salon_foco = solicitados_u[0]
            elif asignados_u:
                estado_operativo = "En ruta asignada"
                salon_foco = asignados_u[0]
            elif completados_u:
                estado_operativo = "Ruta completada"
                salon_foco = completados_u[-1]
            else:
                estado_operativo = "Sin ruta asignada"

            ult_aud = ultima_aud_por_usuario.get(u.id)
            ult_est = (
                mapa_est_por_id.get(ult_aud.estudiante_id) if ult_aud else None
            )
            if not salon_foco and ult_est:
                ubicacion_str = f"{_formatear_grado(ult_est.grado)} {ult_est.grupo}"
                sede_str = ult_est.sede
                salon_foco_dict = {
                    "sede": ult_est.sede,
                    "grado": ult_est.grado,
                    "grupo": ult_est.grupo,
                }
            elif salon_foco:
                ubicacion_str = f"{_formatear_grado(salon_foco.grado)} {salon_foco.grupo}"
                sede_str = salon_foco.sede
                salon_foco_dict = {
                    "sede": salon_foco.sede,
                    "grado": salon_foco.grado,
                    "grupo": salon_foco.grupo,
                }
            else:
                ubicacion_str = "Sin salón activo"
                sede_str = "—"
                salon_foco_dict = None

            if ult_aud and ult_est and ult_aud.fecha_actualizacion:
                hora_ult = ult_aud.fecha_actualizacion.strftime("%H:%M:%S")
                ultima_accion_str = (
                    f"{hora_ult} — Auditó a {ult_est.apellidos} {ult_est.nombres} "
                    f"({_formatear_grado(ult_est.grado)} {ult_est.grupo})"
                )
            elif salon_foco and salon_foco.fecha_inicio:
                hora_ini = salon_foco.fecha_inicio.strftime("%H:%M:%S")
                ultima_accion_str = (
                    f"{hora_ini} — Inició llamado en {ubicacion_str}"
                )
            else:
                ultima_accion_str = "Sin actividad registrada hoy"

            bitacora_usuarios.append(
                {
                    "id": u.id,
                    "nombre": u.nombre,
                    "rol": u.rol,
                    "telefono": u.telefono,
                    "estado_operativo": estado_operativo,
                    "ubicacion_actual": ubicacion_str,
                    "sede_actual": sede_str,
                    "salon_foco": salon_foco_dict,
                    "salones_totales": len(salones_u),
                    "salones_en_curso": len(en_curso_u),
                    "salones_completados": len(completados_u),
                    "estudiantes_en_ruta": est_ruta_total,
                    "estudiantes_auditados": est_ruta_auditados,
                    "porcentaje_avance_ruta": pct_ruta,
                    "ultima_accion": ultima_accion_str,
                }
            )

        # Construir feed cronológico de eventos recientes en terreno
        eventos_raw = []
        mapa_usuarios_id = {u.id: u.nombre for u in todos_usuarios}
        for s in todos_salones_corte:
            etiqueta_s = f"{_formatear_grado(s.grado)} {s.grupo}"
            nombre_func = (
                mapa_usuarios_id.get(s.funcionario_id)
                if s.funcionario_id
                else None
            )
            if s.fecha_solicitud and s.solicitado_por_nombre:
                eventos_raw.append(
                    (
                        s.fecha_solicitud,
                        {
                            "hora": s.fecha_solicitud.strftime("%H:%M:%S"),
                            "funcionario": s.solicitado_por_nombre,
                            "accion": "Solicitó salón adicional",
                            "salon": etiqueta_s,
                            "sede": s.sede,
                            "detalle": "Pendiente de aprobación"
                            if s.estado == "SOLICITADO"
                            else "Solicitud procesada",
                        },
                    )
                )
            if s.fecha_inicio and nombre_func:
                eventos_raw.append(
                    (
                        s.fecha_inicio,
                        {
                            "hora": s.fecha_inicio.strftime("%H:%M:%S"),
                            "funcionario": nombre_func,
                            "accion": "Inició llamado en salón",
                            "salon": etiqueta_s,
                            "sede": s.sede,
                            "detalle": f"Estado actual: {s.estado}",
                        },
                    )
                )
            if s.fecha_cierre and nombre_func:
                eventos_raw.append(
                    (
                        s.fecha_cierre,
                        {
                            "hora": s.fecha_cierre.strftime("%H:%M:%S"),
                            "funcionario": nombre_func,
                            "accion": "Cerró salón completado",
                            "salon": etiqueta_s,
                            "sede": s.sede,
                            "detalle": "Salón finalizado",
                        },
                    )
                )

        auds_recientes = sorted(
            [
                a
                for a in todas_auds_corte
                if a.estado_auditoria == "AUDITADO"
                and a.auditado_por_nombre
                and a.fecha_actualizacion
            ],
            key=lambda x: x.fecha_actualizacion,
            reverse=True,
        )[:20]

        for a in auds_recientes:
            est_obj = mapa_est_por_id.get(a.estudiante_id)
            if not est_obj or not a.fecha_actualizacion:
                continue
            etiqueta_s = f"{_formatear_grado(est_obj.grado)} {est_obj.grupo}"
            resp_2027 = (
                "Sigue 2027"
                if a.continua_2027 is True
                else ("Retiro" if a.continua_2027 is False else "Asistencia")
            )
            eventos_raw.append(
                (
                    a.fecha_actualizacion,
                    {
                        "hora": a.fecha_actualizacion.strftime("%H:%M:%S"),
                        "funcionario": a.auditado_por_nombre,
                        "accion": "Auditó estudiante",
                        "salon": etiqueta_s,
                        "sede": est_obj.sede,
                        "detalle": f"{est_obj.apellidos}, {est_obj.nombres} ({resp_2027})",
                    },
                )
            )

        eventos_raw.sort(key=lambda item: item[0], reverse=True)
        bitacora_eventos = [ev[1] for ev in eventos_raw[:20]]

    return {
        "rol_vista": "AUDITOR" if es_auditor else "ADMIN",
        "corte_actual": {
            "id": corte.id,
            "nombre": corte.nombre,
            "activo": bool(corte.activo),
            "cerrado": bool(corte.cerrado),
        },
        "cobertura": {
            "total_estudiantes": total_estudiantes,
            "auditados": auditados,
            "en_proceso": en_proceso,
            "pendientes": pendientes,
            "porcentaje_avance": pct_avance,
        },
        "asistencia": {
            "total_estudiantes": total_estudiantes,
            "presentes": presentes,
            "ausentes": ausentes,
            "porcentaje_asistencia": pct_asistencia,
            "porcentaje_ausencia": pct_ausencia,
        },
        "proyeccion_2027": {
            "total_estudiantes": total_estudiantes,
            "continuan_2027": continuan,
            "retiros_2027": retiros,
            "sin_definir_2027": sin_definir_2027,
            "porcentaje_continuan": pct_continuan,
            "porcentaje_retiros": pct_retiros,
            "variacion_vs_corte_anterior": variacion_vs_corte_anterior,
            "nombre_corte_anterior": nombre_corte_ant,
            "porcentaje_continuan_anterior": pct_continuan_anterior,
            "continuan_corte_anterior": continuan_anterior,
        },
        "desglose_motivos_retiro": desglose_motivos,
        "desglose_requisitos_matricula": desglose_requisitos,
        "sedes_resumen": list(mapa_sedes.values()),
        "mi_ruta_resumen": mi_ruta_resumen,
        "bitacora_usuarios": bitacora_usuarios,
        "bitacora_eventos": bitacora_eventos,
    }


@app.get("/exportar-reporte")
def exportar_reporte(
    sede: Optional[str] = Query(None),
    grado: Optional[str] = Query(None),
    grupo: Optional[str] = Query(None),
    corte_id: Optional[int] = Query(None),
    funcionario_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
):
    corte = obtener_corte_activo_o_especifico(db, corte_id)
    corte_anterior = obtener_corte_anterior(db, corte.id)
    nombre_corto_ant = nombre_corto_corte(corte_anterior) if corte_anterior else None

    uid = resolver_uid_autenticado(
        fallback_uid=funcionario_id,
        x_usuario_id=x_usuario_id,
        x_session_token=x_session_token,
    )
    usuario_sesion = (
        db.query(Usuario).filter(Usuario.id == uid).first() if uid else None
    )

    salones_permitidos_auditor = None
    if usuario_sesion and usuario_sesion.rol == "AUDITOR":
        salones_mios = (
            db.query(ControlSalon)
            .filter(
                ControlSalon.corte_id == corte.id,
                ControlSalon.funcionario_id == usuario_sesion.id,
            )
            .all()
        )
        salones_permitidos_auditor = {
            (s.sede, s.grado, s.grupo) for s in salones_mios
        }

    query = db.query(Estudiante)
    if sede and sede != "TODAS":
        query = query.filter(Estudiante.sede == sede)
    if grado and grado != "TODOS":
        query = query.filter(Estudiante.grado == grado)
    if grupo and grupo != "TODOS":
        query = query.filter(Estudiante.grupo == grupo)

    estudiantes = query.order_by(
        Estudiante.sede.asc(),
        Estudiante.grado.asc(),
        Estudiante.grupo.asc(),
        Estudiante.apellidos.asc(),
    ).all()

    if salones_permitidos_auditor is not None:
        estudiantes = [
            e
            for e in estudiantes
            if (e.sede, e.grado, e.grupo) in salones_permitidos_auditor
        ]

    auds_actuales = {
        a.estudiante_id: a
        for a in db.query(Auditoria2027)
        .filter(Auditoria2027.corte_id == corte.id)
        .all()
    }
    auds_previas = (
        {
            a.estudiante_id: a
            for a in db.query(Auditoria2027)
            .filter(Auditoria2027.corte_id == corte_anterior.id)
            .all()
        }
        if corte_anterior
        else {}
    )

    filas = []
    for est in estudiantes:
        aud = auds_actuales.get(est.id)
        aud_ant = auds_previas.get(est.id)
        continua_val = (
            "Sí"
            if (aud and aud.continua_2027 is True)
            else ("No" if (aud and aud.continua_2027 is False) else "Sin definir")
        )
        if corte_anterior and aud_ant and aud_ant.continua_2027 is not None:
            resp_ant = (
                f"En el {nombre_corto_ant} dijo: Sí continúa"
                if aud_ant.continua_2027
                else f"En el {nombre_corto_ant} dijo: No continúa"
            )
        else:
            resp_ant = "Sin dato previo"

        filas.append(
            {
                "ID": est.id,
                "Periodo / Corte": _sanitizar_celda_excel(corte.nombre),
                "Sede": _sanitizar_celda_excel(est.sede),
                "Grado": _sanitizar_celda_excel(est.grado),
                "Grupo": _sanitizar_celda_excel(est.grupo),
                "Apellidos": _sanitizar_celda_excel(est.apellidos),
                "Nombres": _sanitizar_celda_excel(est.nombres),
                "Asistió Hoy": "Presente" if (aud and aud.asistio) else "Ausente",
                "Continúa en 2027": continua_val,
                "Historial Corte Anterior": resp_ant,
                "Requisitos de Matrícula": _sanitizar_celda_excel((aud.requisitos_matricula or "") if aud else ""),
                "Motivo de Retiro": _sanitizar_celda_excel((aud.motivo_retiro or "") if aud else ""),
                "Estado Auditoría": aud.estado_auditoria if aud else "PENDIENTE",
                "Auditado Por": _sanitizar_celda_excel((aud.auditado_por_nombre or "Sin registrar") if aud else "Sin registrar"),
                "Observaciones": _sanitizar_celda_excel((aud.observaciones or "") if aud else ""),
                "Última Actualización": (
                    aud.fecha_actualizacion.strftime("%Y-%m-%d %H:%M")
                    if (aud and aud.fecha_actualizacion)
                    else ""
                ),
            }
        )

    columnas_reporte = [
        "ID",
        "Periodo / Corte",
        "Sede",
        "Grado",
        "Grupo",
        "Apellidos",
        "Nombres",
        "Asistió Hoy",
        "Continúa en 2027",
        "Historial Corte Anterior",
        "Requisitos de Matrícula",
        "Motivo de Retiro",
        "Estado Auditoría",
        "Auditado Por",
        "Observaciones",
        "Última Actualización",
    ]
    df_reporte = pd.DataFrame(filas, columns=columnas_reporte)
    fecha_str = datetime.now().strftime("%Y%m%d_%H%M")
    slug_corte = re.sub(r"[^a-zA-Z0-9]+", "_", corte.nombre).strip("_")
    prefijo = (
        "Mi_Ruta_Auditoria_2027"
        if (usuario_sesion and usuario_sesion.rol == "AUDITOR")
        else "Auditoria_2027"
    )
    filename = f"{prefijo}_{slug_corte}_{fecha_str}.xlsx"
    return _generar_respuesta_excel(df_reporte, "Auditoria_2027", filename)


def _generar_respuesta_excel(
    df: pd.DataFrame, sheet_name: str, filename: str
) -> StreamingResponse:
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
        worksheet = writer.sheets[sheet_name]
        for col_cells in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col_cells)
            col_letter = col_cells[0].column_letter
            worksheet.column_dimensions[col_letter].width = min(
                max(max_len + 4, 14), 42
            )
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/plantilla-excel")
def descargar_plantilla():
    df_plantilla = pd.DataFrame(
        [
            {
                "nombres": "Laura Camila",
                "apellidos": "Restrepo Cano",
                "grado": "9°",
                "grupo": "A",
                "sede": "Sede Central Bicentenario",
            },
            {
                "nombres": "Andrés Felipe",
                "apellidos": "Lozano Díaz",
                "grado": "10°",
                "grupo": "B",
                "sede": "Sede Norte El Prado",
            },
        ]
    )
    return _generar_respuesta_excel(
        df_plantilla, "Listado_Estudiantes", "Plantilla_Estudiantes_NexoAula.xlsx"
    )


@app.post("/seed-reset")
def restaurar_datos_prueba(
    admin_id: Optional[int] = Query(None),
    x_usuario_id: Optional[int] = Header(None, alias="X-Usuario-Id"),
    db: Session = Depends(get_db),
):
    verificar_es_admin(db, admin_id=admin_id, x_usuario_id=x_usuario_id)
    total = seed_database(db, force_reset=True, populate_mock=True)
    return {
        "mensaje": f"Restauramos los {total} estudiantes, 2 cortes históricos y 4 perfiles con PIN único.",
        "total": total,
    }


# =====================================================================
# SERVICIO ESTÁTICO DE FRONTEND EN PRODUCCIÓN (UNIFIED DEPLOYMENT)
# =====================================================================
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_spa(full_path: str):
        if full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404)
        target = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        index_html = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
