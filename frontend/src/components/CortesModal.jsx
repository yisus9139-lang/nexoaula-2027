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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#1F1F1F]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-white" />
              Cortes y Periodos de Auditoría
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Historial de barridos y apertura de nuevos cortes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#141414] border border-[#404040] flex items-center gap-2 text-xs text-white">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-5 space-y-6">
          {/* Formulario Horizontal para Abrir Nuevo Corte */}
          <form
            onSubmit={handleSubmit}
            className="pb-5 border-b border-[#262626] space-y-3"
          >
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-white" />
              Abrir Nuevo Corte
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              <div className="lg:col-span-3">
                <label className="block text-[10px] text-neutral-400 mb-1">
                  Nombre del corte
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Corte 3 - Cierre"
                  className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-3 text-xs text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[10px] text-neutral-400 mb-1">
                  Objetivo (Opcional)
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Verificación final..."
                  className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-3 text-xs text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] text-neutral-400 mb-1">
                  Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[10px] text-neutral-400 mb-1">
                  Base de datos
                </label>
                <select
                  value={copiarRespuestas ? 'copiar' : 'limpio'}
                  onChange={(e) => setCopiarRespuestas(e.target.value === 'copiar')}
                  className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="limpio">En limpio (Pendiente)</option>
                  <option value="copiar">Pre-cargar anterior</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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
              className="inline-flex items-center gap-2 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all ${
                  copiarRutas
                    ? 'bg-white border-white text-[#000000]'
                    : 'bg-[#000000] border-[#525252]'
                }`}
              >
                {copiarRutas && <CheckCircle2 className="w-3 h-3" />}
              </span>
              <span>Mantener rutas de salones asignadas a cada auditor</span>
            </button>
          </form>

          {/* Tabla de Cortes Registrados con Filtros por Columna */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Historial de Cortes
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <th className="py-2 px-2.5">Periodo / Corte</th>
                    <th className="py-2 px-2.5">Descripción</th>
                    <th className="py-2 px-2.5">Fechas</th>
                    <th className="py-2 px-2.5">Estado</th>
                    <th className="py-2 px-2.5 text-right">Acciones</th>
                  </tr>
                  <tr className="border-b border-[#262626] bg-[#050505]">
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroNombre}
                        onChange={(e) => setFiltroNombre(e.target.value)}
                        placeholder="Filtrar corte..."
                        className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroDesc}
                        onChange={(e) => setFiltroDesc(e.target.value)}
                        placeholder="Filtrar descripción..."
                        className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <input
                        type="text"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        placeholder="Año / mes..."
                        className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-mono font-normal text-white placeholder-neutral-600 focus:outline-none"
                      />
                    </th>
                    <th className="py-1.5 px-2">
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white focus:outline-none"
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#141414] hover:bg-[#1F1F1F] text-[10px] text-neutral-300 border border-[#262626]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Limpiar
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F] text-xs">
                  {cortesFiltrados.map((corte) => {
                    const isSelected = corte.id === corteSeleccionadoId;
                    return (
                      <tr
                        key={corte.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#141414]' : 'hover:bg-[#121212]'
                        }`}
                      >
                        {/* Nombre */}
                        <td className="py-3 px-2.5 font-bold text-white whitespace-nowrap">
                          {corte.nombre}
                        </td>

                        {/* Descripción */}
                        <td className="py-3 px-2.5 text-neutral-400 max-w-[220px] truncate">
                          {corte.descripcion || '—'}
                        </td>

                        {/* Fechas */}
                        <td className="py-3 px-2.5 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                          {corte.fecha_inicio || '—'}
                          {corte.fecha_fin ? ` → ${corte.fecha_fin}` : ''}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          {corte.activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#000000]">
                              <CheckCircle2 className="w-3 h-3" />
                              Activo
                            </span>
                          ) : corte.cerrado ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#171717] text-neutral-400 border border-[#333333]">
                              <Lock className="w-3 h-3" />
                              Cerrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-neutral-300 border border-[#262626]">
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
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                isSelected
                                  ? 'bg-white text-[#000000]'
                                  : 'bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 border border-[#262626]'
                              }`}
                            >
                              {isSelected ? 'Viendo' : 'Ver'}
                            </button>

                            {!corte.activo && (
                              <button
                                type="button"
                                onClick={() => onActivarCorte(corte.id)}
                                title="Dejar como corte activo"
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#171717] hover:bg-[#262626] text-white border border-[#333333] inline-flex items-center gap-1 transition-all"
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
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 border border-[#262626] inline-flex items-center gap-1 transition-all"
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
