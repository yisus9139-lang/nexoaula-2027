import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SEED_USUARIOS = [
    {
        "id": 1,
        "nombre": "Coordinación General",
        "usuario": "admin",
        "pin_acceso": "2027",
        "telefono": "573001002027",
        "rol": "ADMIN",
    },
    {
        "id": 2,
        "nombre": "Ana Gómez",
        "usuario": "ana",
        "pin_acceso": "1111",
        "telefono": "573001112233",
        "rol": "AUDITOR",
    },
    {
        "id": 3,
        "nombre": "Carlos Pérez",
        "usuario": "carlos",
        "pin_acceso": "2222",
        "telefono": "573002223344",
        "rol": "AUDITOR",
    },
    {
        "id": 4,
        "nombre": "Laura Restrepo",
        "usuario": "laura",
        "pin_acceso": "3333",
        "telefono": "573003334455",
        "rol": "AUDITOR",
    },
]

SEED_CORTES = [
    {
        "id": 1,
        "nombre": "Corte 1 - Sondeo Inicial",
        "descripcion": "Primer barrido exploratorio de intención de matrícula 2027 en todos los salones.",
        "fecha_inicio": "2026-08-10",
        "fecha_fin": "2026-09-20",
        "activo": False,
        "cerrado": True,
    },
    {
        "id": 2,
        "nombre": "Corte 2 - Auditoría Actual",
        "descripcion": "Segundo barrido en terreno para confirmar continuidad y requisitos de matrícula 2027.",
        "fecha_inicio": "2026-11-01",
        "fecha_fin": None,
        "activo": True,
        "cerrado": False,
    },
]

SEED_ESTUDIANTES = [
    # Sede 1: Sede Central Bicentenario - Grado 9° A (Salón COMPLETADO por Carlos Pérez)
    {
        "nombres": "Mateo Alejandro",
        "apellidos": "Gómez Restrepo",
        "grado": "9°",
        "grupo": "A",
        "sede": "Sede Central Bicentenario",
        # Corte 2 (Activo)
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Cupo directo",
        "motivo_retiro": None,
        "observaciones": "Acudiente firmó pre-matrícula en jornada presencial.",
        "auditado_por_id": 3,
        "auditado_por_nombre": "Carlos Pérez",
        # Corte 1 (Histórico)
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "Intención confirmada en sondeo inicial.",
    },
    {
        "nombres": "Valentina Sofía",
        "apellidos": "Martínez Londoño",
        "grado": "9°",
        "grupo": "A",
        "sede": "Sede Central Bicentenario",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Actualizar documentos",
        "motivo_retiro": None,
        "observaciones": "Pendiente copia de documento de identidad renovado.",
        "auditado_por_id": 3,
        "auditado_por_nombre": "Carlos Pérez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Actualizar documentos",
        "c1_motivo": None,
        "c1_obs": "Trámite de tarjeta de identidad en curso.",
    },
    {
        "nombres": "Samuel David",
        "apellidos": "Rodríguez Peña",
        "grado": "9°",
        "grupo": "A",
        "sede": "Sede Central Bicentenario",
        # En Corte 1 decía que SÍ continuaba y en Corte 2 cambió a NO (Alerta de cambio de opinión)
        "asistio": False,
        "estado_auditoria": "AUDITADO",
        "continua_2027": False,
        "requisitos_matricula": None,
        "motivo_retiro": "Cambio de ciudad",
        "observaciones": "Familia se traslada a Medellín en diciembre.",
        "auditado_por_id": 3,
        "auditado_por_nombre": "Carlos Pérez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "En agosto planeaba continuar en la institución.",
    },
    # Sede 1: Sede Central Bicentenario - Grado 9° B (Salón DISPONIBLE)
    {
        "nombres": "Mariana Lucía",
        "apellidos": "Hernández Castro",
        "grado": "9°",
        "grupo": "B",
        "sede": "Sede Central Bicentenario",
        "asistio": True,
        "estado_auditoria": "PENDIENTE",
        "continua_2027": None,
        "requisitos_matricula": None,
        "motivo_retiro": None,
        "observaciones": "",
        "auditado_por_id": None,
        "auditado_por_nombre": None,
        "c1_asistio": True,
        "c1_continua": False,
        "c1_requisitos": None,
        "c1_motivo": "Traslado de colegio",
        "c1_obs": "Acudiente reportó posible cambio de barrio en Corte 1.",
    },
    # Sede 1: Sede Central Bicentenario - Grado 10° A (Salón EN_AUDITORIA por Ana Gómez)
    {
        "nombres": "Sebastián Camilo",
        "apellidos": "Vargas Quintero",
        "grado": "10°",
        "grupo": "A",
        "sede": "Sede Central Bicentenario",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Paz y salvo",
        "motivo_retiro": None,
        "observaciones": "Falta entrega de libro de laboratorio.",
        "auditado_por_id": 2,
        "auditado_por_nombre": "Ana Gómez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Paz y salvo",
        "c1_motivo": None,
        "c1_obs": "Confirmado para grado 11° en 2027.",
    },
    {
        "nombres": "Isabella",
        "apellidos": "Ramírez Orozco",
        "grado": "10°",
        "grupo": "A",
        "sede": "Sede Central Bicentenario",
        "asistio": True,
        "estado_auditoria": "PENDIENTE",
        "continua_2027": None,
        "requisitos_matricula": None,
        "motivo_retiro": None,
        "observaciones": "En entrevista con Ana Gómez.",
        "auditado_por_id": None,
        "auditado_por_nombre": None,
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "Dijo que sí continuaba en el Sondeo Inicial.",
    },
    # Sede 1: Sede Central Bicentenario - Grado 10° B (Salón ASIGNADO a Laura Restrepo)
    {
        "nombres": "Nicolás Andrés",
        "apellidos": "Mendoza Salazar",
        "grado": "10°",
        "grupo": "B",
        "sede": "Sede Central Bicentenario",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Beca/Apoyo",
        "motivo_retiro": None,
        "observaciones": "Postulado a beca municipal.",
        "auditado_por_id": 4,
        "auditado_por_nombre": "Laura Restrepo",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Beca/Apoyo",
        "c1_motivo": None,
        "c1_obs": "Solicitó continuidad de beca escolar.",
    },
    {
        "nombres": "Gabriela Fernanda",
        "apellidos": "Torres Giraldo",
        "grado": "10°",
        "grupo": "B",
        "sede": "Sede Central Bicentenario",
        "asistio": False,
        "estado_auditoria": "PENDIENTE",
        "continua_2027": None,
        "requisitos_matricula": None,
        "motivo_retiro": None,
        "observaciones": "",
        "auditado_por_id": None,
        "auditado_por_nombre": None,
        "c1_asistio": True,
        "c1_continua": False,
        "c1_requisitos": None,
        "c1_motivo": "Motivos económicos",
        "c1_obs": "En Corte 1 manifestó dificultad de transporte.",
    },
    # Sede 2: Sede Norte El Prado - Grado 9° A (Salón COMPLETADO por Carlos Pérez)
    {
        "nombres": "Juan José",
        "apellidos": "Morales Pineda",
        "grado": "9°",
        "grupo": "A",
        "sede": "Sede Norte El Prado",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Cupo directo",
        "motivo_retiro": None,
        "observaciones": "Confirmado por acudiente vía telefónica.",
        "auditado_por_id": 3,
        "auditado_por_nombre": "Carlos Pérez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "Continuidad ratificada desde el Corte 1.",
    },
    {
        "nombres": "Sara Valentina",
        "apellidos": "Cárdenas Ríos",
        "grado": "9°",
        "grupo": "A",
        "sede": "Sede Norte El Prado",
        # En Corte 1 decía que SÍ continuaba y en Corte 2 cambió a NO (Alerta de cambio de opinión)
        "asistio": False,
        "estado_auditoria": "AUDITADO",
        "continua_2027": False,
        "requisitos_matricula": None,
        "motivo_retiro": "Motivos económicos",
        "observaciones": "Remitido a orientación y bienestar estudiantil.",
        "auditado_por_id": 3,
        "auditado_por_nombre": "Carlos Pérez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Beca/Apoyo",
        "c1_motivo": None,
        "c1_obs": "En el Corte 1 esperaba apoyo de transporte.",
    },
    # Sede 2: Sede Norte El Prado - Grado 9° B (Salón ASIGNADO a Laura Restrepo)
    {
        "nombres": "Emiliano",
        "apellidos": "Suárez Ospina",
        "grado": "9°",
        "grupo": "B",
        "sede": "Sede Norte El Prado",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Actualizar documentos",
        "motivo_retiro": None,
        "observaciones": "Debe actualizar certificado EPS.",
        "auditado_por_id": 4,
        "auditado_por_nombre": "Laura Restrepo",
        "c1_asistio": False,
        "c1_continua": False,
        "c1_requisitos": None,
        "c1_motivo": "Traslado de colegio",
        "c1_obs": "En Corte 1 estaba dudoso; ahora confirma que sí continúa.",
    },
    {
        "nombres": "Luciana Andrea",
        "apellidos": "Pardo Velásquez",
        "grado": "9°",
        "grupo": "B",
        "sede": "Sede Norte El Prado",
        "asistio": True,
        "estado_auditoria": "PENDIENTE",
        "continua_2027": None,
        "requisitos_matricula": None,
        "motivo_retiro": None,
        "observaciones": "",
        "auditado_por_id": None,
        "auditado_por_nombre": None,
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "Confirmó continuidad en sondeo inicial.",
    },
    # Sede 2: Sede Norte El Prado - Grado 10° A (Salón ASIGNADO a Ana Gómez)
    {
        "nombres": "Tomás Esteban",
        "apellidos": "Navarro Mejía",
        "grado": "10°",
        "grupo": "A",
        "sede": "Sede Norte El Prado",
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": True,
        "requisitos_matricula": "Beca/Apoyo",
        "motivo_retiro": None,
        "observaciones": "Beneficiario de subsidio de transporte escolar.",
        "auditado_por_id": 2,
        "auditado_por_nombre": "Ana Gómez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Beca/Apoyo",
        "c1_motivo": None,
        "c1_obs": "Mantiene cupo y subsidio para 2027.",
    },
    {
        "nombres": "Valeria",
        "apellidos": "Acosta Bermúdez",
        "grado": "10°",
        "grupo": "A",
        "sede": "Sede Norte El Prado",
        # En Corte 1 decía que SÍ continuaba y en Corte 2 cambió a NO (Alerta de cambio de opinión)
        "asistio": True,
        "estado_auditoria": "AUDITADO",
        "continua_2027": False,
        "requisitos_matricula": None,
        "motivo_retiro": "Traslado de colegio",
        "observaciones": "Solicita traslado a modalidad técnica.",
        "auditado_por_id": 2,
        "auditado_por_nombre": "Ana Gómez",
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Cupo directo",
        "c1_motivo": None,
        "c1_obs": "En el Corte 1 había indicado que continuaba.",
    },
    # Sede 2: Sede Norte El Prado - Grado 10° B (Salón DISPONIBLE)
    {
        "nombres": "Daniel Santiago",
        "apellidos": "Duarte Fajardo",
        "grado": "10°",
        "grupo": "B",
        "sede": "Sede Norte El Prado",
        "asistio": False,
        "estado_auditoria": "PENDIENTE",
        "continua_2027": None,
        "requisitos_matricula": None,
        "motivo_retiro": None,
        "observaciones": "",
        "auditado_por_id": None,
        "auditado_por_nombre": None,
        "c1_asistio": True,
        "c1_continua": True,
        "c1_requisitos": "Actualizar documentos",
        "c1_motivo": None,
        "c1_obs": "Confirmó en Corte 1; pendiente validar hoy.",
    },
]

SEED_SALONES_CORTE_2 = [
    {
        "sede": "Sede Central Bicentenario",
        "grado": "9°",
        "grupo": "A",
        "estado": "COMPLETADO",
        "funcionario_id": 3,  # Carlos Pérez
    },
    {
        "sede": "Sede Central Bicentenario",
        "grado": "9°",
        "grupo": "B",
        "estado": "DISPONIBLE",
        "funcionario_id": None,
    },
    {
        "sede": "Sede Central Bicentenario",
        "grado": "10°",
        "grupo": "A",
        "estado": "EN_AUDITORIA",
        "funcionario_id": 2,  # Ana Gómez
    },
    {
        "sede": "Sede Central Bicentenario",
        "grado": "10°",
        "grupo": "B",
        "estado": "ASIGNADO",
        "funcionario_id": 4,  # Laura Restrepo
    },
    {
        "sede": "Sede Norte El Prado",
        "grado": "9°",
        "grupo": "A",
        "estado": "COMPLETADO",
        "funcionario_id": 3,  # Carlos Pérez
    },
    {
        "sede": "Sede Norte El Prado",
        "grado": "9°",
        "grupo": "B",
        "estado": "ASIGNADO",
        "funcionario_id": 4,  # Laura Restrepo
    },
    {
        "sede": "Sede Norte El Prado",
        "grado": "10°",
        "grupo": "A",
        "estado": "ASIGNADO",
        "funcionario_id": 2,  # Ana Gómez
    },
    {
        "sede": "Sede Norte El Prado",
        "grado": "10°",
        "grupo": "B",
        "estado": "DISPONIBLE",
        "funcionario_id": None,
    },
]


def sincronizar_salones_con_estudiantes(db, corte_id: int = None):
    from models import ControlSalon, CorteAuditoria, Estudiante

    if corte_id is None:
        corte_activo = (
            db.query(CorteAuditoria).filter(CorteAuditoria.activo.is_(True)).first()
        )
        if not corte_activo:
            corte_activo = (
                db.query(CorteAuditoria).order_by(CorteAuditoria.id.desc()).first()
            )
        if not corte_activo:
            return
        corte_id = corte_activo.id

    grupos_est = (
        db.query(Estudiante.sede, Estudiante.grado, Estudiante.grupo)
        .distinct()
        .all()
    )
    existentes = {
        (s.sede, s.grado, s.grupo)
        for s in db.query(ControlSalon)
        .filter(ControlSalon.corte_id == corte_id)
        .all()
    }
    nuevos = 0
    for sede, grado, grupo in grupos_est:
        if (sede, grado, grupo) not in existentes:
            db.add(
                ControlSalon(
                    corte_id=corte_id,
                    sede=sede,
                    grado=grado,
                    grupo=grupo,
                    estado="DISPONIBLE",
                )
            )
            nuevos += 1
    if nuevos > 0:
        db.commit()


def seed_database(db, force_reset: bool = False, populate_mock: bool = False) -> int:
    from models import Auditoria2027, ControlSalon, CorteAuditoria, Estudiante, Usuario

    if force_reset:
        db.query(Auditoria2027).delete()
        db.query(ControlSalon).delete()
        db.query(CorteAuditoria).delete()
        db.query(Estudiante).delete()
        db.query(Usuario).delete()
        db.commit()

    # Garantizar que siempre exista el perfil del Coordinador
    if db.query(Usuario).count() == 0:
        db.add(
            Usuario(
                id=1,
                nombre="Coordinación General",
                usuario="admin",
                pin_acceso="2027",
                telefono="573001002027",
                rol="ADMIN",
            )
        )
        if populate_mock:
            for u in SEED_USUARIOS[1:]:
                db.add(
                    Usuario(
                        id=u["id"],
                        nombre=u["nombre"],
                        usuario=u["usuario"],
                        pin_acceso=u["pin_acceso"],
                        telefono=u["telefono"],
                        rol=u["rol"],
                    )
                )
        db.commit()
    else:
        admin_principal = (
            db.query(Usuario).filter(Usuario.rol == "ADMIN").order_by(Usuario.id.asc()).first()
        )
        if admin_principal and not admin_principal.telefono:
            admin_principal.telefono = "573001002027"
            db.commit()

    # Garantizar que exista un Corte activo inicial
    if db.query(CorteAuditoria).count() == 0:
        if populate_mock:
            for c in SEED_CORTES:
                db.add(
                    CorteAuditoria(
                        id=c["id"],
                        nombre=c["nombre"],
                        descripcion=c["descripcion"],
                        fecha_inicio=c["fecha_inicio"],
                        fecha_fin=c["fecha_fin"],
                        activo=c["activo"],
                        cerrado=c["cerrado"],
                    )
                )
        else:
            db.add(
                CorteAuditoria(
                    id=1,
                    nombre="Corte 1 - Auditoría 2027",
                    descripcion="Barrido inicial de auditoría institucional y matrícula 2027.",
                    fecha_inicio=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    fecha_fin=None,
                    activo=True,
                    cerrado=False,
                )
            )
        db.commit()

    if not populate_mock:
        return db.query(Estudiante).count()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    fecha_corte_1 = datetime(2026, 9, 18, 15, 30, 0)

    existentes_est = db.query(Estudiante).count()
    existentes_aud = db.query(Auditoria2027).count()

    if existentes_est == 0:
        for idx, item in enumerate(SEED_ESTUDIANTES):
            est = Estudiante(
                nombres=item["nombres"],
                apellidos=item["apellidos"],
                grado=item["grado"],
                grupo=item["grupo"],
                sede=item["sede"],
            )
            db.add(est)
            db.flush()

            auditor_c1_id = 2 if idx % 2 == 0 else 3
            auditor_c1_nombre = "Ana Gómez" if idx % 2 == 0 else "Carlos Pérez"

            # Registro histórico en Corte 1 (id=1, cerrado=True)
            aud_c1 = Auditoria2027(
                estudiante_id=est.id,
                corte_id=1,
                asistio=item["c1_asistio"],
                estado_auditoria="AUDITADO",
                continua_2027=item["c1_continua"],
                requisitos_matricula=item["c1_requisitos"],
                motivo_retiro=item["c1_motivo"],
                observaciones=item["c1_obs"],
                auditado_por_id=auditor_c1_id,
                auditado_por_nombre=auditor_c1_nombre,
                fecha_actualizacion=fecha_corte_1,
            )
            db.add(aud_c1)

            # Registro actual en Corte 2 (id=2, activo=True)
            aud_c2 = Auditoria2027(
                estudiante_id=est.id,
                corte_id=2,
                asistio=item["asistio"],
                estado_auditoria=item["estado_auditoria"],
                continua_2027=item["continua_2027"],
                requisitos_matricula=item["requisitos_matricula"],
                motivo_retiro=item["motivo_retiro"],
                observaciones=item["observaciones"],
                auditado_por_id=item["auditado_por_id"],
                auditado_por_nombre=item["auditado_por_nombre"],
                fecha_actualizacion=now,
            )
            db.add(aud_c2)
        db.commit()
    elif existentes_aud == 0:
        # Si los estudiantes ya existían pero se recreó auditoria_2027 con corte_id
        estudiantes_db = db.query(Estudiante).order_by(Estudiante.id.asc()).all()
        for idx, est in enumerate(estudiantes_db):
            item = SEED_ESTUDIANTES[idx % len(SEED_ESTUDIANTES)]
            auditor_c1_id = 2 if idx % 2 == 0 else 3
            auditor_c1_nombre = "Ana Gómez" if idx % 2 == 0 else "Carlos Pérez"
            db.add(
                Auditoria2027(
                    estudiante_id=est.id,
                    corte_id=1,
                    asistio=item["c1_asistio"],
                    estado_auditoria="AUDITADO",
                    continua_2027=item["c1_continua"],
                    requisitos_matricula=item["c1_requisitos"],
                    motivo_retiro=item["c1_motivo"],
                    observaciones=item["c1_obs"],
                    auditado_por_id=auditor_c1_id,
                    auditado_por_nombre=auditor_c1_nombre,
                    fecha_actualizacion=fecha_corte_1,
                )
            )
            db.add(
                Auditoria2027(
                    estudiante_id=est.id,
                    corte_id=2,
                    asistio=item["asistio"],
                    estado_auditoria=item["estado_auditoria"],
                    continua_2027=item["continua_2027"],
                    requisitos_matricula=item["requisitos_matricula"],
                    motivo_retiro=item["motivo_retiro"],
                    observaciones=item["observaciones"],
                    auditado_por_id=item["auditado_por_id"],
                    auditado_por_nombre=item["auditado_por_nombre"],
                    fecha_actualizacion=now,
                )
            )
        db.commit()

    if db.query(ControlSalon).count() == 0:
        # Corte 1: Todos los salones COMPLETADO
        for idx, s in enumerate(SEED_SALONES_CORTE_2):
            func_c1 = 2 if idx % 2 == 0 else 3
            db.add(
                ControlSalon(
                    corte_id=1,
                    sede=s["sede"],
                    grado=s["grado"],
                    grupo=s["grupo"],
                    estado="COMPLETADO",
                    funcionario_id=func_c1,
                    fecha_inicio=fecha_corte_1,
                    fecha_cierre=fecha_corte_1,
                )
            )
        # Corte 2: Estado en vivo actual
        for s in SEED_SALONES_CORTE_2:
            db.add(
                ControlSalon(
                    corte_id=2,
                    sede=s["sede"],
                    grado=s["grado"],
                    grupo=s["grupo"],
                    estado=s["estado"],
                    funcionario_id=s["funcionario_id"],
                    fecha_inicio=now if s["estado"] in ("EN_AUDITORIA", "COMPLETADO") else None,
                    fecha_cierre=now if s["estado"] == "COMPLETADO" else None,
                )
            )
        db.commit()

    sincronizar_salones_con_estudiantes(db, corte_id=1)
    sincronizar_salones_con_estudiantes(db, corte_id=2)
    return db.query(Estudiante).count()


def seed_sqlite_direct(db_path: str = "nexoaula.db", force_reset: bool = True) -> int:
    conn = sqlite3.connect(db_path, timeout=30)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL;")
        cur.execute("PRAGMA foreign_keys=ON;")

        if force_reset:
            cur.executescript(
                """
                DROP TABLE IF EXISTS auditoria_2027;
                DROP TABLE IF EXISTS control_salones;
                DROP TABLE IF EXISTS cortes_auditoria;
                DROP TABLE IF EXISTS estudiantes;
                DROP TABLE IF EXISTS usuarios;
                """
            )

        cur.executescript(
            """
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
        )

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        corte1_str = "2026-09-18 15:30:00"

        for u in SEED_USUARIOS:
            cur.execute(
                """
                INSERT INTO usuarios (id, nombre, usuario, pin_acceso, telefono, rol)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    u["id"],
                    u["nombre"],
                    u["usuario"],
                    u["pin_acceso"],
                    u["telefono"],
                    u["rol"],
                ),
            )

        for c in SEED_CORTES:
            cur.execute(
                """
                INSERT INTO cortes_auditoria (
                    id, nombre, descripcion, fecha_inicio, fecha_fin, activo, cerrado, creado_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c["id"],
                    c["nombre"],
                    c["descripcion"],
                    c["fecha_inicio"],
                    c["fecha_fin"],
                    1 if c["activo"] else 0,
                    1 if c["cerrado"] else 0,
                    corte1_str if c["id"] == 1 else now_str,
                ),
            )

        for idx, item in enumerate(SEED_ESTUDIANTES):
            cur.execute(
                """
                INSERT INTO estudiantes (nombres, apellidos, grado, grupo, sede)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    item["nombres"],
                    item["apellidos"],
                    item["grado"],
                    item["grupo"],
                    item["sede"],
                ),
            )
            est_id = cur.lastrowid

            auditor_c1_id = 2 if idx % 2 == 0 else 3
            auditor_c1_nombre = "Ana Gómez" if idx % 2 == 0 else "Carlos Pérez"

            # Insertar Corte 1
            cur.execute(
                """
                INSERT INTO auditoria_2027 (
                    estudiante_id, corte_id, asistio, estado_auditoria, continua_2027,
                    motivo_retiro, requisitos_matricula, observaciones,
                    auditado_por_id, auditado_por_nombre, fecha_actualizacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    est_id,
                    1,
                    1 if item["c1_asistio"] else 0,
                    "AUDITADO",
                    1 if item["c1_continua"] is True else 0,
                    item["c1_motivo"],
                    item["c1_requisitos"],
                    item["c1_obs"],
                    auditor_c1_id,
                    auditor_c1_nombre,
                    corte1_str,
                ),
            )

            # Insertar Corte 2
            cur.execute(
                """
                INSERT INTO auditoria_2027 (
                    estudiante_id, corte_id, asistio, estado_auditoria, continua_2027,
                    motivo_retiro, requisitos_matricula, observaciones,
                    auditado_por_id, auditado_por_nombre, fecha_actualizacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    est_id,
                    2,
                    1 if item["asistio"] else 0,
                    item["estado_auditoria"],
                    (
                        1
                        if item["continua_2027"] is True
                        else (0 if item["continua_2027"] is False else None)
                    ),
                    item["motivo_retiro"],
                    item["requisitos_matricula"],
                    item["observaciones"],
                    item["auditado_por_id"],
                    item["auditado_por_nombre"],
                    now_str,
                ),
            )

        # Salones Corte 1 (todos COMPLETADO)
        for idx, s in enumerate(SEED_SALONES_CORTE_2):
            func_c1 = 2 if idx % 2 == 0 else 3
            cur.execute(
                """
                INSERT INTO control_salones (
                    corte_id, sede, grado, grupo, estado, funcionario_id, fecha_inicio, fecha_cierre
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    1,
                    s["sede"],
                    s["grado"],
                    s["grupo"],
                    "COMPLETADO",
                    func_c1,
                    corte1_str,
                    corte1_str,
                ),
            )

        # Salones Corte 2 (estado actual en vivo)
        for s in SEED_SALONES_CORTE_2:
            cur.execute(
                """
                INSERT INTO control_salones (
                    corte_id, sede, grado, grupo, estado, funcionario_id, fecha_inicio, fecha_cierre
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    2,
                    s["sede"],
                    s["grado"],
                    s["grupo"],
                    s["estado"],
                    s["funcionario_id"],
                    now_str if s["estado"] in ("EN_AUDITORIA", "COMPLETADO") else None,
                    now_str if s["estado"] == "COMPLETADO" else None,
                ),
            )

        conn.commit()
        return len(SEED_ESTUDIANTES)
    finally:
        conn.close()


if __name__ == "__main__":
    target_db = str(Path(__file__).resolve().parent / "nexoaula.db")
    total = seed_sqlite_direct(target_db, force_reset=True)
    print(
        f"Base de datos SQLite (WAL + Cortes de Auditoría) lista en {target_db} con {total} estudiantes, 2 cortes y 4 usuarios."
    )
