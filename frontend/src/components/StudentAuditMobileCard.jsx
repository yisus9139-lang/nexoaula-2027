import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  ShieldCheck,
  History,
  ArrowRightLeft,
} from 'lucide-react';
import {
  MOTIVOS_RETIRO,
  REQUISITOS_MATRICULA,
  extractAuditState,
} from './StudentAuditRow';
import { formatGrado } from './ClassroomMapGrid';

export default function StudentAuditMobileCard({
  estudiante,
  onUpdateAuditoria,
  isSaving,
  readOnly = false,
}) {
  const audit = extractAuditState(estudiante);

  const [observacionesLocal, setObservacionesLocal] = useState(
    audit.observaciones || ''
  );

  useEffect(() => {
    setObservacionesLocal(audit.observaciones || '');
  }, [audit.observaciones]);

  const handleToggleAsistencia = (valor) => {
    if (readOnly) return;
    onUpdateAuditoria(estudiante.id, {
      asistio: valor,
      continua_2027: audit.continua_2027,
      motivo_retiro: audit.motivo_retiro,
      requisitos_matricula: audit.requisitos_matricula,
      observaciones: observacionesLocal,
      estado_auditoria: 'AUDITADO',
    });
  };

  const handleToggleContinua = (valor) => {
    if (readOnly) return;
    onUpdateAuditoria(estudiante.id, {
      asistio: audit.asistio,
      continua_2027: valor,
      motivo_retiro: valor === false ? audit.motivo_retiro || 'Otro' : null,
      requisitos_matricula:
        valor === true ? audit.requisitos_matricula || 'Cupo directo' : null,
      observaciones: observacionesLocal,
      estado_auditoria: 'AUDITADO',
    });
  };

  const handleSelectMotivo = (e) => {
    if (readOnly) return;
    const val = e.target.value || 'Otro';
    onUpdateAuditoria(estudiante.id, {
      asistio: audit.asistio,
      continua_2027: false,
      motivo_retiro: val,
      requisitos_matricula: null,
      observaciones: observacionesLocal,
      estado_auditoria: 'AUDITADO',
    });
  };

  const handleSelectRequisito = (e) => {
    if (readOnly) return;
    const val = e.target.value || 'Cupo directo';
    onUpdateAuditoria(estudiante.id, {
      asistio: audit.asistio,
      continua_2027: true,
      requisitos_matricula: val,
      motivo_retiro: null,
      observaciones: observacionesLocal,
      estado_auditoria: 'AUDITADO',
    });
  };

  const handleBlurObservaciones = () => {
    if (readOnly) return;
    if ((audit.observaciones || '') !== observacionesLocal) {
      onUpdateAuditoria(estudiante.id, {
        asistio: audit.asistio,
        continua_2027: audit.continua_2027,
        motivo_retiro: audit.motivo_retiro,
        requisitos_matricula: audit.requisitos_matricula,
        observaciones: observacionesLocal,
        estado_auditoria: 'AUDITADO',
      });
    }
  };

  const isCompleto =
    audit.estado_auditoria === 'AUDITADO' ||
    audit.estado_auditoria === 'COMPLETO';

  const tienePrevio =
    estudiante.continua_corte_anterior !== null &&
    estudiante.continua_corte_anterior !== undefined;

  const cambioOpinion =
    tienePrevio &&
    audit.continua_2027 !== null &&
    audit.continua_2027 !== undefined &&
    estudiante.continua_corte_anterior !== audit.continua_2027;

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${isCompleto
        ? 'bg-[#0A0A0A] border-white/30'
        : 'bg-[#0A0A0A] border-[#262626]'
        }`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <h4 className="font-bold text-white text-xs sm:text-sm leading-snug">
            {estudiante.apellidos}, {estudiante.nombres}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#141414] text-neutral-300 border border-[#262626]">
              {estudiante.sede}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1F1F1F] text-white border border-[#333333]">
              {formatGrado(estudiante.grado)} {estudiante.grupo}
            </span>
            {audit.auditado_por_nombre && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#000000] text-neutral-400 border border-[#262626]">
                <ShieldCheck className="w-3 h-3 text-neutral-300" />
                {audit.auditado_por_nombre}
              </span>
            )}
          </div>
        </div>

        {isSaving ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#171717] text-neutral-300 border border-[#333333] shrink-0">
            <Loader2 className="w-3 h-3 animate-spin text-white" />
          </span>
        ) : isCompleto ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-[#000000] shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Listo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#141414] text-neutral-400 border border-[#262626] shrink-0">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        )}
      </div>

      {/* Historial compacto */}
      {tienePrevio && (
        <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-[#000000] border border-[#262626] flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
            <History className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            {estudiante.nombre_corte_anterior || 'Anterior'}:{' '}
            <strong className="text-white">
              {estudiante.continua_corte_anterior ? 'Sí' : 'No'}
            </strong>
          </span>

          {cambioOpinion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#000000]">
              <ArrowRightLeft className="w-3 h-3" />
              {audit.continua_2027 === false ? 'Nuevo retiro' : 'Recuperado'}
            </span>
          )}
        </div>
      )}

      {/* Botones táctiles en píldoras segmentadas sin cajas anidadas */}
      <div className="grid grid-cols-2 gap-3 my-2.5 pt-2 border-t border-[#1F1F1F]">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
            Asistió hoy
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#000000] border border-[#262626]">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleAsistencia(true)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                audit.asistio === true
                  ? 'bg-white text-[#000000]'
                  : 'text-neutral-400 hover:text-white'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Sí
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleAsistencia(false)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                isCompleto && audit.asistio === false
                  ? 'bg-[#262626] text-white border border-[#404040]'
                  : 'text-neutral-400 hover:text-white'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              No
            </button>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
            Sigue 2027
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#000000] border border-[#262626]">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleContinua(true)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                audit.continua_2027 === true
                  ? 'bg-white text-[#000000]'
                  : 'text-neutral-400 hover:text-white'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Sí
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleContinua(false)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                audit.continua_2027 === false
                  ? 'bg-[#262626] text-white border border-[#404040]'
                  : 'text-neutral-400 hover:text-white'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              No
            </button>
          </div>
        </div>
      </div>

      {/* Selector condicional */}
      {audit.continua_2027 !== null && audit.continua_2027 !== undefined && (
        <div className="mt-2.5">
          {audit.continua_2027 === true ? (
            <select
              disabled={readOnly}
              value={audit.requisitos_matricula || ''}
              onChange={handleSelectRequisito}
              className="w-full min-h-[40px] bg-[#000000] text-xs rounded-xl px-3 py-2 border border-white/40 text-white focus:outline-none"
            >
              <option value="">Selecciona requisito...</option>
              {REQUISITOS_MATRICULA.map((req) => (
                <option key={req} value={req}>
                  {req}
                </option>
              ))}
            </select>
          ) : (
            <select
              disabled={readOnly}
              value={audit.motivo_retiro || ''}
              onChange={handleSelectMotivo}
              className="w-full min-h-[40px] bg-[#000000] text-xs rounded-xl px-3 py-2 border border-neutral-400 text-white focus:outline-none"
            >
              <option value="">Motivo de retiro...</option>
              {MOTIVOS_RETIRO.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Observaciones */}
      <div className="mt-2.5 relative">
        <MessageSquare className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          disabled={readOnly}
          value={observacionesLocal}
          onChange={(e) => setObservacionesLocal(e.target.value)}
          onBlur={handleBlurObservaciones}
          placeholder={readOnly ? '—' : 'Nota rápida...'}
          className="w-full min-h-[38px] bg-[#000000] border border-[#262626] focus:border-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none"
        />
      </div>
    </div>
  );
}
