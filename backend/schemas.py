from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


REQUISITOS_VALIDOS = [
    "Actualizar documentos",
    "Paz y salvo",
    "Cupo directo",
    "Beca/Apoyo",
    "Otro",
]

MOTIVOS_RETIRO_VALIDOS = [
    "Cambio de ciudad",
    "Traslado de colegio",
    "Motivos económicos",
    "Graduación",
    "Otro",
]


class LoginRequest(BaseModel):
    pin_acceso: str
    usuario: Optional[str] = None


class RecuperarAdminRequest(BaseModel):
    llave_maestra: str
    nuevo_pin: str = Field(..., min_length=4, max_length=4)


class SalonAsignadoResumen(BaseModel):
    sede: str
    grado: str
    grupo: str
    estado: str


class UsuarioCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2)
    pin_acceso: str = Field(..., min_length=4, max_length=4)
    telefono: Optional[str] = None
    rol: str = Field(default="AUDITOR")
    usuario: Optional[str] = None
    admin_id: Optional[int] = None


class UsuarioUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    pin_acceso: Optional[str] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    usuario: Optional[str] = None
    admin_id: Optional[int] = None


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    usuario: str
    rol: str
    pin_acceso: Optional[str] = None
    telefono: Optional[str] = None
    estudiantes_auditados_hoy: int = 0
    salones_asignados_count: int = 0
    salones_asignados: List[SalonAsignadoResumen] = []
    session_token: Optional[str] = None

    class Config:
        from_attributes = True


class CorteAuditoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    activo: bool
    cerrado: bool
    creado_en: Optional[datetime] = None
    total_estudiantes: int = 0
    auditados: int = 0
    porcentaje_avance: float = 0.0
    continuan_2027: int = 0
    retiros_2027: int = 0

    class Config:
        from_attributes = True


class CorteCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2)
    descripcion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    pre_cargar_respuestas_anteriores: bool = False
    mantener_rutas_asignadas: bool = False
    admin_id: Optional[int] = None


class SalonKeyItem(BaseModel):
    sede: str
    grado: str
    grupo: str


class PreasignarSalonesRequest(BaseModel):
    funcionario_id: int
    salones: List[SalonKeyItem]
    corte_id: Optional[int] = None
    admin_id: Optional[int] = None


class TomarSalonRequest(BaseModel):
    sede: str
    grado: str
    grupo: str
    funcionario_id: int
    corte_id: Optional[int] = None


class FinalizarSalonRequest(BaseModel):
    sede: str
    grado: str
    grupo: str
    funcionario_id: int
    corte_id: Optional[int] = None


class LiberarSalonRequest(BaseModel):
    sede: str
    grado: str
    grupo: str
    admin_id: int
    nuevo_funcionario_id: Optional[int] = None
    corte_id: Optional[int] = None


class SolicitarSalonRequest(BaseModel):
    sede: str
    grado: str
    grupo: str
    funcionario_id: int
    corte_id: Optional[int] = None


class ResolverSolicitudSalonRequest(BaseModel):
    sede: str
    grado: str
    grupo: str
    admin_id: Optional[int] = None
    corte_id: Optional[int] = None


class ControlSalonOut(BaseModel):
    id: int
    corte_id: int
    sede: str
    grado: str
    grupo: str
    estado: str
    funcionario_id: Optional[int] = None
    funcionario_nombre: Optional[str] = None
    solicitado_por_id: Optional[int] = None
    solicitado_por_nombre: Optional[str] = None
    fecha_solicitud: Optional[datetime] = None
    fecha_inicio: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None
    total_estudiantes: int = 0
    auditados: int = 0
    pendientes: int = 0
    presentes: int = 0
    porcentaje_avance: float = 0.0


class AuditoriaUpdate(BaseModel):
    asistio: Optional[bool] = None
    estado_auditoria: Optional[str] = None
    continua_2027: Optional[bool] = None
    clear_continua: Optional[bool] = False
    motivo_retiro: Optional[str] = None
    requisitos_matricula: Optional[str] = None
    observaciones: Optional[str] = None
    funcionario_id: Optional[int] = None
    corte_id: Optional[int] = None


class SalonAsistenciaMasivaRequest(BaseModel):
    sede: Optional[str] = None
    grado: Optional[str] = None
    grupo: Optional[str] = None
    asistio: bool = True
    funcionario_id: Optional[int] = None
    corte_id: Optional[int] = None


class EstudianteConAuditoriaOut(BaseModel):
    id: int
    corte_id: int = 2
    nombres: str
    apellidos: str
    grado: str
    grupo: str
    sede: str
    asistio: bool = False
    estado_auditoria: str = "PENDIENTE"
    continua_2027: Optional[bool] = None
    motivo_retiro: Optional[str] = None
    requisitos_matricula: Optional[str] = None
    observaciones: Optional[str] = None
    auditado_por_id: Optional[int] = None
    auditado_por_nombre: Optional[str] = None
    fecha_actualizacion: Optional[datetime] = None
    salon_completado_100: Optional[bool] = False
    estado_salon: Optional[str] = "DISPONIBLE"
    estado_corte_anterior: Optional[str] = "Sin dato previo"
    etiqueta_corte_anterior: Optional[str] = "Sin dato previo"
    continua_corte_anterior: Optional[bool] = None
    nombre_corte_anterior: Optional[str] = None
    cambio_opinion_negativo: bool = False

