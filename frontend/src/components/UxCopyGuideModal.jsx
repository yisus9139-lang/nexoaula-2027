import React from 'react';
import { BookOpen, X } from 'lucide-react';

export default function UxCopyGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const microcopyItems = [
    {
      escenario: 'Estado Vacío',
      titulo: 'Aún no hay estudiantes en esta vista',
      mensaje:
        'Importa el padrón escolar desde un archivo Excel (.xlsx) o ajusta los filtros de Sede, Grado y Grupo para comenzar a pasar asistencia.',
      tono: 'Orientador y accionable',
    },
    {
      escenario: 'Carga de Padrón',
      titulo: 'Padrón sincronizado correctamente',
      mensaje:
        'Cargamos los estudiantes en la base de datos local. Ya puedes filtrar por salón y registrar la proyección 2027.',
      tono: 'Confirmación directa',
    },
    {
      escenario: 'Guardado en Fila',
      titulo: 'Cambios sincronizados al instante',
      mensaje:
        'Cada clic en Asistencia o Continuidad 2027 actualiza de inmediato las métricas del salón sin recargar la página.',
      tono: 'Ágil para terreno',
    },
    {
      escenario: 'Exportación Excel',
      titulo: 'Reporte Excel listo para Rectoría',
      mensaje:
        'El archivo consolidado incluye estado de asistencia, continuidad 2027, motivos de retiro, requisitos pendientes y fecha exacta de auditoría.',
      tono: 'Ejecutivo',
    },
  ];

  const tokensItems = [
    {
      token: 'Modo Oscuro (#000000)',
      uso: 'Versión original profunda en negro puro, reduce la fatiga visual y mantiene máxima nitidez en interiores.',
    },
    {
      token: 'Modo Claro (#FFFFFF)',
      uso: 'Optimizado para trabajo en campo bajo luz solar directa con alto contraste de texto.',
    },
    {
      token: 'Selector Rápido (Sol / Luna)',
      uso: 'Permite alternar entre Modo Claro y Oscuro al instante en la barra superior con persistencia automática.',
    },
    {
      token: 'Tokens Monocromáticos',
      uso: 'Sin saturación de color para una auditoría ejecutiva, limpia y rápida.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-white" />
              Sistema de Diseño y Guía de UX Writing
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Criterios de microcopy y tokens monocromáticos para auditoría en terreno
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body en Tablas Estructuradas sin contenedores anidados */}
        <div className="py-5 space-y-6 overflow-y-auto pr-1">
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              1. Tokens Semánticos Monocromáticos (#000000)
            </h4>
            <div className="overflow-x-auto border-t border-[#262626]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <th className="py-2 px-3">Token</th>
                    <th className="py-2 px-3">Significado Operativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {tokensItems.map((t) => (
                    <tr key={t.token} className="hover:bg-[#121212]">
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap font-mono text-[11px]">
                        {t.token}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">{t.uso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              2. Mensajes Clave de Interfaz (Microcopy)
            </h4>
            <div className="overflow-x-auto border-t border-[#262626]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <th className="py-2 px-3">Escenario</th>
                    <th className="py-2 px-3">Titular y Mensaje</th>
                    <th className="py-2 px-3">Tono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {microcopyItems.map((item) => (
                    <tr key={item.escenario} className="hover:bg-[#121212]">
                      <td className="py-2.5 px-3 font-bold text-neutral-300 whitespace-nowrap">
                        {item.escenario}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white block">
                          {item.titulo}
                        </span>
                        <span className="text-neutral-400 text-[11px]">
                          {item.mensaje}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap text-[11px]">
                        {item.tono}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#1F1F1F]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-[#000000] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
