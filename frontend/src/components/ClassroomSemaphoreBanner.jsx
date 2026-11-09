import React from 'react';
import {
  Lock,
  CheckCircle2,
  Play,
  Unlock,
  ShieldAlert,
  CheckSquare,
  BookmarkCheck,
} from 'lucide-react';
import { formatGrado } from './ClassroomMapGrid';

export default function ClassroomSemaphoreBanner({
  salonActual,
  currentUser,
  onReclamarSalon,
  onAbrirModalCerrar,
  onLiberarSalon,
  actionLoading,
}) {
  if (!salonActual) return null;

  const isMine =
    currentUser && salonActual.funcionario_id === currentUser.id;
  const isAdmin = currentUser?.rol === 'ADMIN';
  const completadosCount =
    salonActual.auditados ?? salonActual.auditados_completos ?? 0;

  // 1. Salón DISPONIBLE
  if (salonActual.estado === 'DISPONIBLE') {
    return (
      <div className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 text-[#005FB8] fill-current" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">
              Salón Libre • {formatGrado(salonActual.grado)} {salonActual.grupo} ({salonActual.sede})
            </span>
            <p className="text-xs text-slate-500">
              Tómalo para iniciar el llamado a lista.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onReclamarSalon(salonActual)}
          className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#005FB8] hover:bg-[#004C94] text-white transition-all shrink-0 shadow-xs"
        >
          Iniciar auditoría
        </button>
      </div>
    );
  }

  // 1.5 Salón PRE-ASIGNADO (ASIGNADO)
  if (salonActual.estado === 'ASIGNADO') {
    if (isMine || isAdmin) {
      return (
        <div className="mb-5 rounded-2xl bg-white border border-blue-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005FB8] text-white flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">
                {isMine ? 'Tu Ruta Asignada' : `Asignado a ${salonActual.funcionario_nombre}`} • {formatGrado(salonActual.grado)} {salonActual.grupo}
              </span>
              <p className="text-xs text-slate-500">
                Inicia el llamado para habilitar la edición.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onReclamarSalon(salonActual)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#005FB8] hover:bg-[#004C94] text-white transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar llamado
          </button>
        </div>
      );
    }

    return (
      <div className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900">
            Reservado para {salonActual.funcionario_nombre || 'otro auditor'}
          </span>
          <p className="text-xs text-slate-500">Modo solo lectura.</p>
        </div>
      </div>
    );
  }

  // 2. Salón EN_AUDITORIA por mí mismo
  if (salonActual.estado === 'EN_AUDITORIA' && isMine) {
    return (
      <div className="mb-5 rounded-2xl bg-white border border-blue-300 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#005FB8] text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">
              Auditando en vivo • {completadosCount}/{salonActual.total_estudiantes} listos
            </span>
            <p className="text-xs text-slate-500">
              Salón bloqueado a tu nombre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onLiberarSalon(salonActual)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all shadow-xs"
          >
            Soltar
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAbrirModalCerrar(salonActual)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-[#005FB8] hover:bg-[#004C94] text-white flex items-center gap-1.5 transition-all shadow-xs"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Cerrar Salón
          </button>
        </div>
      </div>
    );
  }

  // 3. Salón EN_AUDITORIA por OTRO funcionario
  if (salonActual.estado === 'EN_AUDITORIA' && !isMine) {
    return (
      <div className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">
              En curso por {salonActual.funcionario_nombre || 'otro auditor'}
            </span>
            <p className="text-xs text-slate-500">Modo solo lectura.</p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onLiberarSalon(salonActual)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
          >
            <Unlock className="w-3.5 h-3.5" />
            Liberar
          </button>
        )}
      </div>
    );
  }

  // 4. Salón COMPLETADO
  return (
    <div className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900">
            Salón Cerrado • {salonActual.funcionario_nombre || 'Equipo auditor'}
          </span>
          <p className="text-xs text-slate-500">Registros protegidos.</p>
        </div>
      </div>

      {isAdmin && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onLiberarSalon(salonActual)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
        >
          <Unlock className="w-3.5 h-3.5" />
          Reabrir
        </button>
      )}
    </div>
  );
}
