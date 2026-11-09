import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { formatGrado } from './ClassroomMapGrid';

export default function ConfirmCloseClassroomModal({
  isOpen,
  salon,
  onClose,
  onConfirm,
  loading,
}) {
  if (!isOpen || !salon) return null;

  const completados = salon.auditados ?? salon.auditados_completos ?? 0;
  const total = salon.total_estudiantes || 0;
  const pendientes = Math.max(total - completados, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {pendientes > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#005FB8] shrink-0" />
              )}
              ¿Cerrar salón {formatGrado(salon.grado)} {salon.grupo}?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{salon.sede}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8F8F8] border border-slate-200 space-y-2 mb-5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Auditados:</span>
            <span className="font-bold text-slate-900">
              {completados} de {total} alumnos
            </span>
          </div>
          {pendientes > 0 && (
            <div className="pt-2 border-t border-slate-200 text-xs text-amber-800">
              Quedan <strong>{pendientes} pendientes</strong>. ¿Cerrar de todas formas?
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(salon)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#005FB8] hover:bg-[#004C94] text-white transition-all disabled:opacity-50 shadow-xs"
          >
            {loading ? 'Cerrando...' : 'Cerrar salón'}
          </button>
        </div>
      </div>
    </div>
  );
}
