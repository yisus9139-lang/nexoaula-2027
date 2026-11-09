import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Plus,
  CheckCircle2,
  Lock,
  Play,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export default function CortesModal({
  isOpen,
  onClose,
  cortes,
  corteSeleccionadoId,
  onSelectCorte,
  onCrearCorte,
  onActivarCorte,
  onCerrarCorte,
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [copiarRespuestas, setCopiarRespuestas] = useState(false);
  const [copiarRutas, setCopiarRutas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros por columna en la tabla de Cortes
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroDesc, setFiltroDesc] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const cortesFiltrados = useMemo(() => {
    return cortes.filter((c) => {
      if (
        filtroNombre &&
        !(c.nombre || '').toLowerCase().includes(filtroNombre.toLowerCase())
      ) {
        return false;
      }
      if (
        filtroDesc &&
        !(c.descripcion || '').toLowerCase().includes(filtroDesc.toLowerCase())
      ) {
        return false;
      }
      if (filtroFecha) {
        const fechasStr = `${c.fecha_inicio || ''} ${c.fecha_fin || ''}`.toLowerCase();
        if (!fechasStr.includes(filtroFecha.toLowerCase())) return false;
      }
      if (filtroEstado === 'ACTIVO' && !c.activo) return false;
      if (filtroEstado === 'CERRADO' && !c.cerrado) return false;
      if (filtroEstado === 'DISPONIBLE' && (c.activo || c.cerrado)) return false;
      return true;
    });
  }, [cortes, filtroNombre, filtroDesc, filtroFecha, filtroEstado]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('Escribe un nombre para el nuevo corte.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await onCrearCorte({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_inicio: fechaInicio || null,
        copiar_respuestas_anteriores: copiarRespuestas,
        copiar_rutas_salones: copiarRutas,
      });
      setNombre('');
      setDescripcion('');
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos crear el corte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-[#005FB8]" />
              Cortes y Periodos de Auditoría
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Historial de barridos y apertura de nuevos cortes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* Formulario Horizontal para Abrir Nuevo Corte */}
          <form
            onSubmit={handleSubmit}
            className="pb-5 border-b border-slate-200 space-y-3"
          >
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#005FB8]" />
              Abrir Nuevo Corte
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              <div className="lg:col-span-3">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Nombre del corte
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Corte 3 - Cierre"
                  className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Objetivo (Opcional)
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Verificación final..."
                  className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-2.5 text-xs text-slate-900 focus:outline-none shadow-xs"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Base de datos
                </label>
                <select
                  value={copiarRespuestas ? 'copiar' : 'limpio'}
                  onChange={(e) => setCopiarRespuestas(e.target.value === 'copiar')}
                  className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-2.5 text-xs text-slate-900 focus:outline-none shadow-xs"
                >
                  <option value="limpio">En limpio (Pendiente)</option>
                  <option value="copiar">Pre-cargar anterior</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-xl bg-[#005FB8] hover:bg-[#004C94] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Crear Corte</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCopiarRutas(!copiarRutas)}
              className="inline-flex items-center gap-2 text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${
                  copiarRutas
                    ? 'bg-[#005FB8] border-[#005FB8] text-white'
                    : 'bg-white border-slate-300'
                }`}
              >
                {copiarRutas && <CheckCircle2 className="w-3 h-3" />}
              </span>
              <span>Mantener rutas de salones asignadas a cada auditor</span>
            </button>
          </form>

          {/* Tabla de Cortes Registrados con Filtros por Columna */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Historial de Cortes
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8F8F8] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-2.5">Periodo / Corte</th>
                    <th className="py-2 px-2.5">Descripción</th>
                    <th className="py-2 px-2.5">Fechas</th>
                    <th className="py-2 px-2.5">Estado</th>
                    <th className="py-2 px-2.5 text-right">Acciones</th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroNombre}
                        onChange={(e) => setFiltroNombre(e.target.value)}
                        placeholder="Filtrar corte..."
                        className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroDesc}
                        onChange={(e) => setFiltroDesc(e.target.value)}
                        placeholder="Filtrar descripción..."
                        className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        placeholder="Año / mes..."
                        className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-mono font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 focus:outline-none"
                      >
                        <option value="">Todos</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="CERRADO">Cerrado</option>
                        <option value="DISPONIBLE">Disponible</option>
                      </select>
                    </th>
                    <th className="py-1.5 px-2 text-right">
                      {(filtroNombre || filtroDesc || filtroFecha || filtroEstado) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroNombre('');
                            setFiltroDesc('');
                            setFiltroFecha('');
                            setFiltroEstado('');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] text-slate-700 border border-slate-300 shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Limpiar
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs bg-white">
                  {cortesFiltrados.map((corte) => {
                    const isSelected = corte.id === corteSeleccionadoId;
                    return (
                      <tr
                        key={corte.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Nombre */}
                        <td className="py-3 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {corte.nombre}
                        </td>

                        {/* Descripción */}
                        <td className="py-3 px-2.5 text-slate-600 max-w-[220px] truncate">
                          {corte.descripcion || '—'}
                        </td>

                        {/* Fechas */}
                        <td className="py-3 px-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {corte.fecha_inicio || '—'}
                          {corte.fecha_fin ? ` → ${corte.fecha_fin}` : ''}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          {corte.activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#005FB8] border border-blue-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Activo
                            </span>
                          ) : corte.cerrado ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <Lock className="w-3 h-3" />
                              Cerrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              Disponible
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectCorte(corte.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                                isSelected
                                  ? 'bg-[#005FB8] text-white'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {isSelected ? 'Viendo' : 'Ver'}
                            </button>

                            {!corte.activo && (
                              <button
                                type="button"
                                onClick={() => onActivarCorte(corte.id)}
                                title="Dejar como corte activo"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 transition-all shadow-xs"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Activar
                              </button>
                            )}

                            {!corte.cerrado && (
                              <button
                                type="button"
                                onClick={() => onCerrarCorte(corte.id)}
                                title="Congelar / Cerrar corte"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 transition-all shadow-xs"
                              >
                                <Lock className="w-3 h-3" />
                                Cerrar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
