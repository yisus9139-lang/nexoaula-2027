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
      className={`rounded-2xl p-4 border transition-all shadow-sm ${
        isCompleto
          ? 'bg-white border-blue-200'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
            {estudiante.apellidos}, {estudiante.nombres}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {estudiante.sede}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              {formatGrado(estudiante.grado)} {estudiante.grupo}
            </span>
            {audit.auditado_por_nombre && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <ShieldCheck className="w-3 h-3 text-slate-500" />
                {audit.auditado_por_nombre}
              </span>
            )}
          </div>
        </div>

        {isSaving ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin text-[#005FB8]" />
          </span>
        ) : isCompleto ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            Listo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        )}
      </div>

      {/* Historial compacto */}
      {tienePrevio && (
        <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {estudiante.nombre_corte_anterior || 'Anterior'}:{' '}
            <strong className="text-slate-900 font-bold">
              {estudiante.continua_corte_anterior ? 'Sí' : 'No'}
            </strong>
          </span>

          {cambioOpinion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#005FB8] border border-blue-200">
              <ArrowRightLeft className="w-3 h-3" />
              {audit.continua_2027 === false ? 'Nuevo retiro' : 'Recuperado'}
            </span>
          )}
        </div>
      )}

      {/* Botones táctiles en píldoras segmentadas sin cajas anidadas */}
      <div className="grid grid-cols-2 gap-3 my-2.5 pt-2 border-t border-slate-100">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Asistió hoy
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-xs">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleAsistencia(true)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                audit.asistio === true
                  ? 'bg-[#005FB8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              No
            </button>
          </div>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Sigue 2027
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-xs">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleContinua(true)}
              className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all ${
                audit.continua_2027 === true
                  ? 'bg-[#005FB8] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
              className="w-full min-h-[40px] bg-white text-xs rounded-xl px-3 py-2 border border-slate-200 focus:border-[#005FB8] text-slate-900 focus:outline-none shadow-xs font-medium"
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
              className="w-full min-h-[40px] bg-white text-xs rounded-xl px-3 py-2 border border-slate-200 focus:border-[#005FB8] text-slate-900 focus:outline-none shadow-xs font-medium"
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
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          disabled={readOnly}
          value={observacionesLocal}
          onChange={(e) => setObservacionesLocal(e.target.value)}
          onBlur={handleBlurObservaciones}
          placeholder={readOnly ? '—' : 'Nota rápida...'}
          className="w-full min-h-[38px] bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs"
        />
      </div>
    </div>
  );
}
