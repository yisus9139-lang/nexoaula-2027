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
import { formatGrado } from './ClassroomMapGrid';

export const MOTIVOS_RETIRO = [
  'Cambio de ciudad',
  'Traslado de colegio',
  'Motivos económicos',
  'Graduación',
  'Otro',
];

export const REQUISITOS_MATRICULA = [
  'Cupo directo',
  'Actualizar documentos',
  'Paz y salvo',
  'Beca/Apoyo',
  'Otro',
];

export function extractAuditState(estudiante) {
  return {
    asistio: estudiante.auditoria?.asistio ?? estudiante.asistio ?? false,
    estado_auditoria:
      estudiante.auditoria?.estado_auditoria ??
      estudiante.estado_auditoria ??
      'PENDIENTE',
    continua_2027:
      estudiante.auditoria?.continua_2027 ?? estudiante.continua_2027 ?? null,
    motivo_retiro:
      estudiante.auditoria?.motivo_retiro ?? estudiante.motivo_retiro ?? null,
    requisitos_matricula:
      estudiante.auditoria?.requisitos_matricula ??
      estudiante.requisitos_matricula ??
      null,
    observaciones:
      estudiante.auditoria?.observaciones ?? estudiante.observaciones ?? '',
    auditado_por_nombre:
      estudiante.auditoria?.auditado_por_nombre ??
      estudiante.auditado_por_nombre ??
      null,
  };
}

export default function StudentAuditRow({
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
    <tr
      className={`border-b border-slate-100 transition-colors duration-150 ${
        isCompleto
          ? 'bg-slate-50/70 hover:bg-slate-100/80'
          : 'bg-white hover:bg-slate-50'
      }`}
    >
      {/* 1. Estudiante & Salón */}
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm">
            {estudiante.apellidos}, {estudiante.nombres}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {estudiante.sede}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              {formatGrado(estudiante.grado)} {estudiante.grupo}
            </span>
            {audit.auditado_por_nombre && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <ShieldCheck className="w-3 h-3 text-slate-500" />
                {audit.auditado_por_nombre}
              </span>
            )}
            {tienePrevio && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                <History className="w-3 h-3 text-slate-400" />
                {estudiante.nombre_corte_anterior || 'Anterior'}:{' '}
                <strong className="text-slate-900 font-bold">
                  {estudiante.continua_corte_anterior ? 'Sí' : 'No'}
                </strong>
              </span>
            )}
            {cambioOpinion && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#005FB8] border border-blue-200">
                <ArrowRightLeft className="w-3 h-3" />
                {audit.continua_2027 === false ? 'Cambió a No' : 'Recuperado'}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 2. Asistencia Hoy */}
      <td className="py-3 px-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-xs">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToggleAsistencia(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isCompleto && audit.asistio === false
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            No
          </button>
        </div>
      </td>

      {/* 3. ¿Continúa en 2027? */}
      <td className="py-3 px-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-xs">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleToggleContinua(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              audit.continua_2027 === false
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            No
          </button>
        </div>
      </td>

      {/* 4. Requisitos o Motivo */}
      <td className="py-3 px-4 min-w-[220px]">
        {audit.continua_2027 === null || audit.continua_2027 === undefined ? (
          <span className="text-xs text-slate-400">Sin definir</span>
        ) : audit.continua_2027 === true ? (
          <select
            disabled={readOnly}
            value={audit.requisitos_matricula || ''}
            onChange={handleSelectRequisito}
            className={`w-full bg-white text-xs rounded-xl px-3 py-2 border transition-colors focus:outline-none focus:border-[#005FB8] shadow-xs ${
              audit.requisitos_matricula
                ? 'border-[#005FB8] text-slate-900 font-medium'
                : 'border-slate-200 text-slate-700'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
            className={`w-full bg-white text-xs rounded-xl px-3 py-2 border transition-colors focus:outline-none focus:border-[#005FB8] shadow-xs ${
              audit.motivo_retiro
                ? 'border-rose-400 text-slate-900 font-medium'
                : 'border-slate-200 text-slate-700'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">Motivo de retiro...</option>
            {MOTIVOS_RETIRO.map((motivo) => (
              <option key={motivo} value={motivo}>
                {motivo}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* 5. Observaciones */}
      <td className="py-3 px-4 min-w-[180px]">
        <div className="relative">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            disabled={readOnly}
            value={observacionesLocal}
            onChange={(e) => setObservacionesLocal(e.target.value)}
            onBlur={handleBlurObservaciones}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
            }}
            placeholder={readOnly ? '—' : 'Nota...'}
            className={`w-full bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-xs ${
              readOnly ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </td>

      {/* 6. Estado */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        {isSaving ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#005FB8]" />
            ...
          </span>
        ) : isCompleto ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Listo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <Clock className="w-3.5 h-3.5" />
            Pendiente
          </span>
        )}
      </td>
    </tr>
  );
}
