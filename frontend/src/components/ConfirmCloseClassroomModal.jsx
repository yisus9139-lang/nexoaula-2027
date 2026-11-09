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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {pendientes > 0 ? (
                <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              )}
              ¿Cerrar salón {formatGrado(salon.grado)} {salon.grupo}?
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">{salon.sede}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#000000] border border-[#262626] space-y-2 mb-5">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Auditados:</span>
            <span className="font-bold text-white">
              {completados} de {total} alumnos
            </span>
          </div>
          {pendientes > 0 && (
            <div className="pt-2 border-t border-[#1F1F1F] text-xs text-neutral-300">
              Quedan <strong>{pendientes} pendientes</strong>. ¿Cerrar de todas formas?
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#171717] transition-colors"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(salon)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all disabled:opacity-50"
          >
            {loading ? 'Cerrando...' : 'Cerrar salón'}
          </button>
        </div>
      </div>
    </div>
  );
}
