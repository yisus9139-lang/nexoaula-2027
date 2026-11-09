import React from 'react';
import {
  DoorOpen,
  Lock,
  CheckCircle2,
  Play,
  Eye,
  Unlock,
  BookmarkCheck,
  Clock,
  Hand,
  Check,
  X,
  Bell,
} from 'lucide-react';

export const formatGrado = (grado) => {
  const str = String(grado || '').trim();
  return str.endsWith('°') ? str : `${str}°`;
};

export function armarUrlWhatsAppSolicitud({
  auditorNombre,
  salon,
  telefonoCoordinador,
}) {
  const gradoFmt = formatGrado(salon.grado);
  const mensaje = `¡Hola, Coordinador! Soy ${auditorNombre}. Ya terminé mi ruta inicial en NexoAula 2027 y acabo de solicitar en la app el salón ${gradoFmt} ${salon.grupo} (${salon.sede}) para seguir apoyando. ¿Me lo apruebas por favor?`;
  const telLimpio = String(telefonoCoordinador || '').replace(/\D/g, '');
  const baseWa = telLimpio ? `https://wa.me/${telLimpio}` : 'https://wa.me/';
  return `${baseWa}?text=${encodeURIComponent(mensaje)}`;
}

export default function ClassroomMapGrid({
  salones,
  currentUser,
  selectedSalon,
  onSelectSalon,
  onReclamarSalon,
  onLiberarSalon,
  onSolicitarSalon,
  onAprobarSolicitud,
  onRechazarSolicitud,
  tieneRutaPendiente = false,
  telefonoCoordinador = '',
  actionLoading,
}) {
  if (!salones || salones.length === 0) {
    return null;
  }

  const isAdmin = currentUser?.rol === 'ADMIN';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[#262626] border border-[#262626] rounded-2xl overflow-hidden">
      {salones.map((salon) => {
        const isSelected =
          selectedSalon?.sede === salon.sede &&
          selectedSalon?.grado === salon.grado &&
          selectedSalon?.grupo === salon.grupo;

        const isMine =
          currentUser && salon.funcionario_id === currentUser.id;
        const isRequestedByMe =
          currentUser &&
          salon.estado === 'SOLICITADO' &&
          salon.solicitado_por_id === currentUser.id;

        let badgeStyle = '';
        let badgeText = '';
        let cellBg = 'bg-[#000000] hover:bg-[#080808]';

        if (salon.estado === 'DISPONIBLE') {
          badgeStyle = 'bg-[#141414] text-white border-[#333333]';
          badgeText = 'Libre';
          if (isSelected) cellBg = 'bg-[#0A0A0A] ring-1 ring-inset ring-white/50';
        } else if (salon.estado === 'SOLICITADO') {
          badgeStyle = 'bg-white text-[#000000] border-white';
          badgeText = 'Solicitado';
          cellBg = 'bg-[#0A0A0A] ring-1 ring-inset ring-white/60';
        } else if (salon.estado === 'ASIGNADO') {
          badgeStyle = isMine
            ? 'bg-white text-[#000000] border-white'
            : 'bg-[#171717] text-neutral-300 border-[#333333]';
          badgeText = isMine
            ? 'Tu ruta'
            : salon.funcionario_nombre || 'Asignado';
          if (isSelected || isMine)
            cellBg = 'bg-[#080808] ring-1 ring-inset ring-white/30';
        } else if (salon.estado === 'EN_AUDITORIA') {
          badgeStyle = 'bg-white text-[#000000] border-white';
          badgeText = isMine
            ? 'Auditando (Tú)'
            : salon.funcionario_nombre || 'En curso';
          if (isSelected) cellBg = 'bg-[#0A0A0A] ring-1 ring-inset ring-white/60';
        } else {
          badgeStyle = 'bg-[#121212] text-neutral-400 border-[#262626]';
          badgeText = 'Cerrado';
          if (isSelected)
            cellBg = 'bg-[#0A0A0A] ring-1 ring-inset ring-neutral-400/40';
        }

        const completadosCount =
          salon.auditados ?? salon.auditados_completos ?? 0;
        const totalCount = salon.total_estudiantes ?? 0;
        const pctAvance =
          typeof salon.porcentaje_avance === 'number'
            ? Math.round(salon.porcentaje_avance)
            : totalCount > 0
            ? Math.round((completadosCount / totalCount) * 100)
            : 0;

        return (
          <div
            key={`${salon.sede}-${salon.grado}-${salon.grupo}`}
            className={`${cellBg} p-4 transition-colors duration-200 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block truncate max-w-[170px]">
                    {salon.sede}
                  </span>
                  <h4 className="text-base font-extrabold text-white leading-tight font-mono tracking-tight mt-0.5">
                    {formatGrado(salon.grado)} {salon.grupo}
                  </h4>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badgeStyle}`}
                >
                  {salon.estado === 'SOLICITADO' && (
                    <Clock className="w-3 h-3" />
                  )}
                  {salon.estado === 'ASIGNADO' && (
                    <BookmarkCheck className="w-3 h-3" />
                  )}
                  {salon.estado === 'EN_AUDITORIA' && (
                    <Lock className="w-3 h-3" />
                  )}
                  {salon.estado === 'COMPLETADO' && (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {badgeText}
                </span>
              </div>

              {/* Progreso con física suave */}
              <div className="space-y-1.5 mb-3.5">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-neutral-400">Avance</span>
                  <span className="font-bold font-mono text-white">
                    {completadosCount}/{totalCount} • {pctAvance}%
                  </span>
                </div>
                <div className="w-full h-1 bg-[#141414] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ width: `${pctAvance}%` }}
                  />
                </div>
              </div>

              {salon.estado === 'SOLICITADO' && salon.solicitado_por_nombre && (
                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#333333] text-[11px] text-neutral-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="truncate">
                    Solicita: <strong className="text-white">{salon.solicitado_por_nombre}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="pt-2.5 border-t border-[#1F1F1F] flex flex-col gap-1.5">
              {/* 1. SALÓN LIBRE (DISPONIBLE) */}
              {salon.estado === 'DISPONIBLE' && (
                <>
                  {isAdmin ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onReclamarSalon(salon)}
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Iniciar llamado
                    </button>
                  ) : tieneRutaPendiente ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled
                        className="w-full min-h-[36px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] text-neutral-500 border border-[#262626] cursor-not-allowed"
                      >
                        <Hand className="w-3.5 h-3.5" />
                        Solicitar salón
                      </button>
                      <p className="text-[10px] text-neutral-400 text-center leading-snug">
                        Termina primero tus salones de Mi Ruta para pedir otro
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onSolicitarSalon && onSolicitarSalon(salon)}
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all disabled:opacity-50"
                    >
                      <Hand className="w-3.5 h-3.5" />
                      <span>Solicitar salón</span>
                    </button>
                  )}
                </>
              )}

              {/* 2. SALÓN SOLICITADO */}
              {salon.estado === 'SOLICITADO' && (
                <>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          onAprobarSolicitud && onAprobarSolicitud(salon)
                        }
                        className="flex-1 min-h-[38px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Habilitar salón
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          onRechazarSolicitud && onRechazarSolicitud(salon)
                        }
                        className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 border border-[#333333] flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Ahora no
                      </button>
                    </div>
                  ) : isRequestedByMe ? (
                    <a
                      href={armarUrlWhatsAppSolicitud({
                        auditorNombre: currentUser?.nombre || 'Auditor',
                        salon,
                        telefonoCoordinador,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#141414] hover:bg-[#1F1F1F] text-white border border-white/40 transition-all text-center"
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Esperando aprobación</span>
                      <span className="hidden sm:inline">(WhatsApp)</span>
                    </a>
                  ) : (
                    <div className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] text-neutral-400 border border-[#262626]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Solicitado por {salon.solicitado_por_nombre || 'otro auditor'}</span>
                    </div>
                  )}
                </>
              )}

              {/* 3. SALÓN ASIGNADO (TU RUTA) */}
              {salon.estado === 'ASIGNADO' && (
                <>
                  {isMine || isAdmin ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onReclamarSalon(salon)}
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Iniciar llamado
                    </button>
                  ) : (
                    <div className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] text-neutral-500 border border-[#262626]">
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                      En ruta de {salon.funcionario_nombre || 'otro auditor'}
                    </div>
                  )}
                </>
              )}

              {/* 4. SALÓN EN AUDITORÍA */}
              {salon.estado === 'EN_AUDITORIA' && (
                <div className="flex items-center gap-2">
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => onSelectSalon(salon)}
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] transition-all"
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      Continuar llamado
                    </button>
                  ) : isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectSalon(salon)}
                        className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-neutral-200 border border-[#262626] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => onLiberarSalon(salon)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#171717] hover:bg-[#262626] text-neutral-300 border border-[#333333] flex items-center gap-1 transition-all"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Liberar
                      </button>
                    </>
                  ) : (
                    <div className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] text-neutral-500 border border-[#262626]">
                      <Lock className="w-3.5 h-3.5" />
                      En curso por {salon.funcionario_nombre || 'otro auditor'}
                    </div>
                  )}
                </div>
              )}

              {/* 5. SALÓN COMPLETADO */}
              {salon.estado === 'COMPLETADO' && (
                <div className="flex items-center gap-2">
                  {isAdmin || isMine ? (
                    <button
                      type="button"
                      onClick={() => onSelectSalon(salon)}
                      className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 border border-[#262626] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  ) : (
                    <div className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] text-neutral-500 border border-[#262626]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cerrado por {salon.funcionario_nombre || 'auditor'}
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onLiberarSalon(salon)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#171717] hover:bg-[#262626] text-white border border-[#333333] flex items-center gap-1 transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Reabrir
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
