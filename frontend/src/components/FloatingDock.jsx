import React from 'react';
import {
  Layers,
  BarChart3,
  DoorOpen,
  ClipboardList,
} from 'lucide-react';

export default function FloatingDock({
  vistaSeccion,
  setVistaSeccion,
  totalEstudiantes = 0,
  totalSalones = 0,
  totalMostrados = 0,
}) {
  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] sm:max-w-max pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.12)] max-w-full select-none">
        <button
          type="button"
          onClick={() => setVistaSeccion('todas')}
          title="Vista Completa"
          aria-label="Vista Completa"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-[36px] ${
            vistaSeccion === 'todas'
              ? 'bg-[#005FB8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden sm:inline">Vista Completa</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaSeccion('resumen')}
          title="Resumen"
          aria-label="Resumen"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-[36px] ${
            vistaSeccion === 'resumen'
              ? 'bg-[#005FB8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden sm:inline">Resumen</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaSeccion('salones')}
          title="Salones"
          aria-label="Salones"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-[36px] ${
            vistaSeccion === 'salones'
              ? 'bg-[#005FB8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DoorOpen className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden sm:inline">Salones</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaSeccion('lista')}
          title="Llamado a Lista"
          aria-label="Llamado a Lista"
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-[36px] ${
            vistaSeccion === 'lista'
              ? 'bg-[#005FB8] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="hidden sm:inline">Llamado a Lista</span>
        </button>
      </div>
    </div>
  );
}
