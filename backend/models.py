from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(Text, nullable=False)
    usuario = Column(Text, nullable=False, unique=True, index=True)
    pin_acceso = Column(Text, nullable=False, unique=True, index=True)
    telefono = Column(Text, nullable=True)
    rol = Column(Text, nullable=False, default="AUDITOR")  # 'ADMIN' | 'AUDITOR'

    salones_asignados = relationship(
        "ControlSalon",
        foreign_keys="ControlSalon.funcionario_id",
        back_populates="funcionario",
    )


class CorteAuditoria(Base):
    __tablename__ = "cortes_auditoria"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombre = Column(Text, nullable=False, unique=True, index=True)
    descripcion = Column(Text, nullable=True)
    fecha_inicio = Column(Text, nullable=True)
    fecha_fin = Column(Text, nullable=True)
    activo = Column(Boolean, nullable=False, default=False)
    cerrado = Column(Boolean, nullable=False, default=False)
    creado_en = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )

    auditorias = relationship(
        "Auditoria2027",
        back_populates="corte",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    salones = relationship(
        "ControlSalon",
        back_populates="corte",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ControlSalon(Base):
    __tablename__ = "control_salones"
    __table_args__ = (
        UniqueConstraint(
            "corte_id", "sede", "grado", "grupo", name="uq_corte_sede_grado_grupo"
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    corte_id = Column(
        Integer,
        ForeignKey("cortes_auditoria.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sede = Column(Text, nullable=False)
    grado = Column(Text, nullable=False)
    grupo = Column(Text, nullable=False)
    estado = Column(
        Text, nullable=False, default="DISPONIBLE"
    )  # 'DISPONIBLE' | 'SOLICITADO' | 'ASIGNADO' | 'EN_AUDITORIA' | 'COMPLETADO'
    funcionario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    solicitado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    solicitado_por_nombre = Column(Text, nullable=True)
    fecha_solicitud = Column(DateTime, nullable=True)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_cierre = Column(DateTime, nullable=True)

    corte = relationship("CorteAuditoria", back_populates="salones")
    funcionario = relationship(
        "Usuario",
        foreign_keys=[funcionario_id],
        back_populates="salones_asignados",
    )


class Estudiante(Base):
    __tablename__ = "estudiantes"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    nombres = Column(Text, nullable=False)
    apellidos = Column(Text, nullable=False)
    grado = Column(Text, nullable=False)
    grupo = Column(Text, nullable=False)
    sede = Column(Text, nullable=False)

    auditorias = relationship(
        "Auditoria2027",
        back_populates="estudiante",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Auditoria2027(Base):
    __tablename__ = "auditoria_2027"
    __table_args__ = (
        UniqueConstraint(
            "estudiante_id", "corte_id", name="uq_estudiante_corte"
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    estudiante_id = Column(
        Integer,
        ForeignKey("estudiantes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    corte_id = Column(
        Integer,
        ForeignKey("cortes_auditoria.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asistio = Column(Boolean, nullable=False, default=False)
    estado_auditoria = Column(Text, nullable=False, default="PENDIENTE")
    continua_2027 = Column(Boolean, nullable=True)
    motivo_retiro = Column(Text, nullable=True)
    requisitos_matricula = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    auditado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    auditado_por_nombre = Column(Text, nullable=True)
    fecha_actualizacion = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
        onupdate=datetime.utcnow,
    )

    estudiante = relationship("Estudiante", back_populates="auditorias")
    corte = relationship("CorteAuditoria", back_populates="auditorias")
