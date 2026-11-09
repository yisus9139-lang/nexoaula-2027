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
      token: 'Azul Institucional (#005FB8)',
      uso: 'Acciones principales, botones de confirmación, llamadas de lista activas y navegación seleccionada.',
    },
    {
      token: 'Blanco Puro (#FFFFFF)',
      uso: 'Tarjetas de información, modales, celdas de estudiantes y contenedores principales.',
    },
    {
      token: 'Gris Lienzo (#F8F8F8)',
      uso: 'Fondo general de la pantalla, franjas de cabecera en tablas y sub-secciones.',
    },
    {
      token: 'Slate Contraste (#0F172A / #334155)',
      uso: 'Jerarquía tipográfica nítida de alta legibilidad para trabajo bajo luz solar en terreno.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#005FB8]" />
              Sistema de Diseño y Guía de UX Writing
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Criterios de microcopy y tokens en Modo Claro (#FFFFFF / #F8F8F8 / #005FB8) para auditoría en terreno
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body en Tablas Estructuradas sin contenedores anidados */}
        <div className="py-5 space-y-6 overflow-y-auto pr-1">
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Tokens Semánticos de Interfaz
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8F8F8] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Token</th>
                    <th className="py-2 px-3">Significado Operativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tokensItems.map((t) => (
                    <tr key={t.token} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap font-mono text-[11px]">
                        {t.token}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{t.uso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              2. Mensajes Clave de Interfaz (Microcopy)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8F8F8] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Escenario</th>
                    <th className="py-2 px-3">Titular y Mensaje</th>
                    <th className="py-2 px-3">Tono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {microcopyItems.map((item) => (
                    <tr key={item.escenario} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {item.escenario}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">
                          {item.titulo}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {item.mensaje}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
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
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#005FB8] hover:bg-[#004C94] text-white transition-colors shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
