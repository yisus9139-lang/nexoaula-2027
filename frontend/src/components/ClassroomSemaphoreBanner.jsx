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
      <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-[#333333] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171717] border border-[#333333] flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 text-white fill-current" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">
              Salón Libre • {formatGrado(salonActual.grado)} {salonActual.grupo} ({salonActual.sede})
            </span>
            <p className="text-xs text-neutral-400">
              Tómalo para iniciar el llamado a lista.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onReclamarSalon(salonActual)}
          className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all shrink-0"
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
        <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-white/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#000000] flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">
                {isMine ? 'Tu Ruta Asignada' : `Asignado a ${salonActual.funcionario_nombre}`} • {formatGrado(salonActual.grado)} {salonActual.grupo}
              </span>
              <p className="text-xs text-neutral-400">
                Inicia el llamado para habilitar la edición.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onReclamarSalon(salonActual)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all shrink-0 flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar llamado
          </button>
        </div>
      );
    }

    return (
      <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-[#262626] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#171717] border border-[#333333] flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-neutral-300" />
        </div>
        <div>
          <span className="text-xs font-bold text-white">
            Reservado para {salonActual.funcionario_nombre || 'otro auditor'}
          </span>
          <p className="text-xs text-neutral-400">Modo solo lectura.</p>
        </div>
      </div>
    );
  }

  // 2. Salón EN_AUDITORIA por mí mismo
  if (salonActual.estado === 'EN_AUDITORIA' && isMine) {
    return (
      <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-white/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-[#000000] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">
              Auditando en vivo • {completadosCount}/{salonActual.total_estudiantes} listos
            </span>
            <p className="text-xs text-neutral-400">
              Salón bloqueado a tu nombre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onLiberarSalon(salonActual)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-neutral-200 border border-[#333333] transition-all"
          >
            Soltar
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAbrirModalCerrar(salonActual)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] flex items-center gap-1.5 transition-all"
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
      <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-[#333333] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171717] border border-[#333333] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">
              En curso por {salonActual.funcionario_nombre || 'otro auditor'}
            </span>
            <p className="text-xs text-neutral-400">Modo solo lectura.</p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onLiberarSalon(salonActual)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#171717] hover:bg-[#262626] text-white border border-[#404040] flex items-center gap-1.5 shrink-0 transition-all"
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
    <div className="mb-5 rounded-2xl bg-[#0A0A0A] border border-[#262626] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-xs font-bold text-white">
            Salón Cerrado • {salonActual.funcionario_nombre || 'Equipo auditor'}
          </span>
          <p className="text-xs text-neutral-400">Registros protegidos.</p>
        </div>
      </div>

      {isAdmin && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onLiberarSalon(salonActual)}
          className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#171717] hover:bg-[#262626] text-white border border-[#333333] flex items-center gap-1.5 shrink-0 transition-all"
        >
          <Unlock className="w-3.5 h-3.5" />
          Reabrir
        </button>
      )}
    </div>
  );
}
