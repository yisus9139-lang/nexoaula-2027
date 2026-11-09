import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  UserMinus,
  ClipboardCheck,
  AlertTriangle,
  History,
  Activity,
  MapPin,
  Clock,
  Route,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { formatGrado } from './ClassroomMapGrid';

export default function KpiAndCharts({
  stats,
  loading,
  currentUser,
  onSelectSalon,
}) {
  const isAdmin = currentUser?.rol === 'ADMIN';

  // Filtros por columna para la Bitácora en Tiempo Real del Coordinador
  const [filtroBitNombre, setFiltroBitNombre] = useState('');
  const [filtroBitEstado, setFiltroBitEstado] = useState('');
  const [filtroBitSalon, setFiltroBitSalon] = useState('');
  const [filtroBitSede, setFiltroBitSede] = useState('');

  const totalEstudiantes = stats?.cobertura?.total_estudiantes ?? 0;
  const auditados = stats?.cobertura?.auditados ?? 0;
  const pendientes = stats?.cobertura?.pendientes ?? 0;
  const pctAvance = stats?.cobertura?.porcentaje_avance ?? 0;

  const presentes = stats?.asistencia?.presentes ?? 0;
  const pctAsistencia = stats?.asistencia?.porcentaje_asistencia ?? 0;

  const continuan = stats?.proyeccion_2027?.continuan_2027 ?? 0;
  const pctContinuan = stats?.proyeccion_2027?.porcentaje_continuan ?? 0;
  const retiros = stats?.proyeccion_2027?.retiros_2027 ?? 0;

  const variacionAnterior =
    stats?.proyeccion_2027?.variacion_vs_corte_anterior ?? null;
  const nombreCorteAnterior =
    stats?.proyeccion_2027?.nombre_corte_anterior ?? null;
  const continuanAnterior =
    stats?.proyeccion_2027?.continuan_corte_anterior ?? null;

  const miRuta = stats?.mi_ruta_resumen ?? null;
  const bitacoraUsuarios = useMemo(
    () => stats?.bitacora_usuarios ?? [],
    [stats?.bitacora_usuarios]
  );
  const bitacoraEventos = stats?.bitacora_eventos ?? [];

  const bitacoraFiltrada = useMemo(() => {
    return bitacoraUsuarios.filter((u) => {
      if (
        filtroBitNombre &&
        !(u.nombre || '').toLowerCase().includes(filtroBitNombre.toLowerCase())
      ) {
        return false;
      }
      if (filtroBitEstado && u.estado_operativo !== filtroBitEstado) {
        return false;
      }
      if (
        filtroBitSalon &&
        !(u.ubicacion_actual || '')
          .toLowerCase()
          .includes(filtroBitSalon.toLowerCase())
      ) {
        return false;
      }
      if (
        filtroBitSede &&
        !(u.sede_actual || '')
          .toLowerCase()
          .includes(filtroBitSede.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    bitacoraUsuarios,
    filtroBitNombre,
    filtroBitEstado,
    filtroBitSalon,
    filtroBitSede,
  ]);

  const rawMotivos = stats?.desglose_motivos_retiro ?? [];
  const motivosList = rawMotivos
    .map((m) => ({
      etiqueta: m.nombre ?? 'Otro',
      cantidad: m.total ?? 0,
      porcentaje:
        typeof m.porcentaje === 'number'
          ? Math.round(m.porcentaje)
          : retiros > 0
          ? Math.round(((m.total ?? 0) / retiros) * 100)
          : 0,
    }))
    .filter((m) => m.cantidad > 0);

  const rawRequisitos = stats?.desglose_requisitos_matricula ?? [];
  const requisitosList = rawRequisitos
    .map((r) => ({
      etiqueta: r.nombre ?? 'Otro',
      cantidad: r.total ?? 0,
      porcentaje:
        typeof r.porcentaje === 'number'
          ? Math.round(r.porcentaje)
          : continuan > 0
          ? Math.round(((r.total ?? 0) / continuan) * 100)
          : 0,
    }))
    .filter((r) => r.cantidad > 0);

  // =========================================================================
  // VISTA A: AUDITOR EN TERRENO (EXCLUSIVO SU RUTA PERSONAL)
  // =========================================================================
  if (!isAdmin) {
    const salonesTotales = miRuta?.salones_totales ?? 0;
    const salonesCompletados = miRuta?.salones_completados ?? 0;
    const salonesEnCurso = miRuta?.salones_en_curso ?? 0;
    const detalleSalones = miRuta?.detalle_salones ?? [];

    const kpisAuditor = [
      {
        id: 'salones-ruta',
        label: 'Salones en Mi Ruta',
        value: `${salonesCompletados}/${salonesTotales}`,
        subtitle:
          salonesEnCurso > 0
            ? `${salonesEnCurso} en llamado activo`
            : 'Salones asignados hoy',
        icon: Route,
      },
      {
        id: 'avance-ruta',
        label: 'Avance de Mi Ruta',
        value: `${pctAvance}%`,
        subtitle: `${auditados} de ${totalEstudiantes} alumnos listos`,
        icon: Users,
      },
      {
        id: 'asistencia-ruta',
        label: 'Asistencia en Mi Ruta',
        value: `${pctAsistencia}%`,
        subtitle: `${presentes} presentes hoy`,
        icon: UserCheck,
      },
      {
        id: 'continuan-ruta',
        label: 'Siguen 2027 (Mi Ruta)',
        value: continuan,
        subtitle: `${retiros} retiros • ${pendientes} pendientes`,
        icon: TrendingUp,
      },
    ];

    return (
      <div className="space-y-5">
        {/* Franja de KPIs Personales del Auditor */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {kpisAuditor.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.id}
                className="p-4 bg-white flex flex-col justify-between transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {kpi.label}
                  </span>
                  <Icon className="w-4 h-4 text-[#005FB8]" />
                </div>
                {loading ? (
                  <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg" />
                ) : (
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                    {kpi.value}
                  </h3>
                )}
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {kpi.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabla / Tarjetas de Hoja de Ruta Personal del Auditor */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Route className="w-3.5 h-3.5 text-[#005FB8]" />
              Estado de Mis Salones Asignados
            </h4>
            <span className="text-[11px] text-slate-500 tabular-nums">
              Pendientes en tu ruta: <strong className="text-slate-900">{pendientes}</strong> alumnos
            </span>
          </div>

          {detalleSalones.length === 0 ? (
            <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
              <p className="text-xs font-semibold text-slate-900">
                Aún no tienes salones asignados en Mi Ruta
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ve al módulo 02. Salones y solicita un grupo libre para que Coordinación te lo habilite.
              </p>
            </div>
          ) : (
            <>
              {/* Vista Móvil: Tarjetas táctiles (< md) */}
              <div className="md:hidden space-y-2.5 pt-1">
                {detalleSalones.map((s) => (
                  <div
                    key={`${s.sede}-${s.grado}-${s.grupo}`}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block truncate">
                          {s.sede}
                        </span>
                        <h5 className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                          {formatGrado(s.grado)} {s.grupo}
                        </h5>
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.estado === 'EN_AUDITORIA'
                            ? 'bg-blue-50 text-[#005FB8] border border-blue-200'
                            : s.estado === 'COMPLETADO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {s.estado === 'EN_AUDITORIA'
                          ? 'Auditando'
                          : s.estado === 'COMPLETADO'
                          ? 'Cerrado'
                          : 'Tu ruta'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 py-1.5 px-2 rounded-lg bg-[#F8F8F8] border border-slate-200 text-center">
                      <div>
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Audit.</span>
                        <span className="text-xs font-bold text-slate-900 tabular-nums">{s.auditados}/{s.total_estudiantes}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Pres.</span>
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">{s.presentes}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">2027</span>
                        <span className="text-xs font-bold text-[#005FB8] tabular-nums">{s.continuan}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-semibold text-slate-500">Bajas</span>
                        <span className="text-xs font-semibold text-rose-600 tabular-nums">{s.retiros}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Avance</span>
                        <span className="font-mono font-bold text-slate-900">{Math.round(s.porcentaje_avance)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#005FB8] rounded-full transition-all duration-300"
                          style={{ width: `${s.porcentaje_avance}%` }}
                        />
                      </div>
                    </div>

                    {onSelectSalon && (
                      <button
                        type="button"
                        onClick={() => onSelectSalon(s)}
                        className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005FB8] hover:bg-[#004C94] text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        <span>Ir al llamado a lista</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Vista Tablet / Desktop: Tabla horizontal con scroll táctil (>= md) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                  <thead>
                    <tr className="bg-[#F8F8F8] border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Sede</th>
                      <th className="py-2.5 px-3">Salón</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-center">Auditados</th>
                      <th className="py-2.5 px-3 text-center">Presentes</th>
                      <th className="py-2.5 px-3 text-center">Siguen 2027</th>
                      <th className="py-2.5 px-3 text-center">Retiros</th>
                      <th className="py-2.5 px-3 w-40">Avance</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalleSalones.map((s) => (
                      <tr
                        key={`${s.sede}-${s.grado}-${s.grupo}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {s.sede}
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                          {formatGrado(s.grado)} {s.grupo}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.estado === 'EN_AUDITORIA'
                                ? 'bg-blue-50 text-[#005FB8] border border-blue-200'
                                : s.estado === 'COMPLETADO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {s.estado === 'EN_AUDITORIA'
                              ? 'Auditando'
                              : s.estado === 'COMPLETADO'
                              ? 'Cerrado'
                              : 'Tu ruta'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                          {s.auditados}/{s.total_estudiantes}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700 tabular-nums">
                          {s.presentes}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#005FB8] font-semibold tabular-nums">
                          {s.continuan}
                        </td>
                        <td className="py-2.5 px-3 text-center text-rose-600 tabular-nums">
                          {s.retiros}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#005FB8] rounded-full transition-all duration-300"
                                style={{ width: `${s.porcentaje_avance}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-900 w-10 text-right">
                              {Math.round(s.porcentaje_avance)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {onSelectSalon && (
                            <button
                              type="button"
                              onClick={() => onSelectSalon(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#005FB8] hover:bg-[#004C94] text-white text-[11px] font-bold shadow-xs transition-colors"
                            >
                              <span>Ir al llamado</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA B: COORDINADOR GENERAL (ADMIN) — BITÁCORA EN TIEMPO REAL + GLOBAL
  // =========================================================================
  const kpisAdmin = [
    {
      id: 'total',
      label: 'Padrón General',
      value: totalEstudiantes,
      subtitle: `${auditados} auditados (${pctAvance}%)`,
      icon: Users,
    },
    {
      id: 'asistencia',
      label: 'Asistencia Global',
      value: `${pctAsistencia}%`,
      subtitle: `${presentes} presentes hoy`,
      icon: UserCheck,
    },
    {
      id: 'proyeccion',
      label: 'Continúan 2027',
      value: continuan,
      subtitle: `${pctContinuan}% del colegio`,
      icon: TrendingUp,
    },
    {
      id: 'retiros',
      label: 'Retiros Confirmados',
      value: retiros,
      subtitle: `${pendientes} alumnos por auditar`,
      icon: UserMinus,
    },
  ];

  const auditandoAhoraCount = bitacoraUsuarios.filter(
    (u) => u.estado_operativo === 'Auditando en vivo'
  ).length;

  return (
    <div className="space-y-6">
      {/* Comparativa compacta frente al corte anterior */}
      {nombreCorteAnterior !== null && variacionAnterior !== null && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#005FB8] shrink-0" />
            <span className="text-xs font-semibold text-slate-700">
              Comparativa Institucional vs. {nombreCorteAnterior}:
            </span>
            <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-blue-50 text-[#005FB8] border border-blue-200">
              {variacionAnterior > 0 ? `+${variacionAnterior}%` : `${variacionAnterior}%`}
            </span>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Antes: <strong className="text-slate-800">{continuanAnterior ?? 0}</strong> • Hoy: <strong className="text-slate-900">{continuan}</strong>
          </span>
        </div>
      )}

      {/* 1. Indicadores Clave en Franja Arquitectónica Directa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {kpisAdmin.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="p-4 bg-white flex flex-col justify-between transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4 text-[#005FB8]" />
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {kpi.value}
                </h3>
              )}
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {kpi.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* 2. BITÁCORA EN TIEMPO REAL: DÓNDE ESTÁ CADA AUDITOR / USUARIO */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#005FB8]" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Bitácora de Auditores en Tiempo Real
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#005FB8] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#005FB8] animate-pulse" />
              Activos en salón ahora: {auditandoAhoraCount}
            </span>
          </div>
        </div>

        {/* Vista Móvil: Tarjetas de Auditores (< md) */}
        <div className="md:hidden space-y-2.5 pt-1">
          {/* Barra de filtros compacta en móvil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
            <input
              type="text"
              value={filtroBitNombre}
              onChange={(e) => setFiltroBitNombre(e.target.value)}
              placeholder="Buscar auditor..."
              className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs"
            />
            <select
              value={filtroBitEstado}
              onChange={(e) => setFiltroBitEstado(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-2.5 text-xs text-slate-900 focus:outline-none shadow-xs"
            >
              <option value="">Todos los estados</option>
              <option value="Auditando en vivo">Auditando en vivo</option>
              <option value="Solicitando salón">Solicitando salón</option>
              <option value="En ruta asignada">En ruta asignada</option>
              <option value="Ruta completada">Ruta completada</option>
              <option value="Sin ruta asignada">Sin ruta asignada</option>
            </select>
          </div>

          {bitacoraFiltrada.length === 0 ? (
            <div className="py-6 px-4 text-center border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs bg-white">
              No hay funcionarios con este filtro
            </div>
          ) : (
            bitacoraFiltrada.map((u) => {
              const isLive =
                u.estado_operativo === 'Auditando en vivo' ||
                u.estado_operativo === 'Solicitando salón';
              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border space-y-2.5 transition-colors shadow-xs ${
                    isLive
                      ? 'bg-blue-50/40 border-blue-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {u.nombre}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {u.rol === 'ADMIN' ? 'Coordinador' : 'Auditor'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        isLive
                          ? 'bg-blue-50 text-[#005FB8] border-blue-200'
                          : u.estado_operativo === 'En ruta asignada'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : u.estado_operativo === 'Ruta completada'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {isLive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#005FB8] animate-ping" />
                      )}
                      {u.estado_operativo}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-[#F8F8F8] border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Ubicación</span>
                      <span className="font-mono font-bold text-slate-900 inline-flex items-center gap-1 truncate max-w-full">
                        <MapPin className="w-3 h-3 text-[#005FB8] shrink-0" />
                        {u.ubicacion_actual}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Sede / Salones</span>
                      <span className="text-slate-700 font-medium truncate block">
                        {u.sede_actual || '—'} • <strong className="text-slate-900">{u.salones_completados}/{u.salones_totales}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Avance de ruta</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {u.estudiantes_auditados}/{u.estudiantes_en_ruta} • {Math.round(u.porcentaje_avance_ruta)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005FB8] rounded-full transition-all duration-300"
                        style={{ width: `${u.porcentaje_avance_ruta}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {u.ultima_accion}
                  </div>

                  {u.salon_foco && onSelectSalon && (
                    <button
                      type="button"
                      onClick={() => onSelectSalon(u.salon_foco)}
                      className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>Ver salón en llamado a lista</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#005FB8]" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Vista Tablet / Desktop: Tabla horizontal completa (>= md) */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs min-w-[820px]">
            <thead>
              <tr className="bg-[#F8F8F8] border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3">Funcionario / Rol</th>
                <th className="py-2.5 px-3">Estado en Terreno</th>
                <th className="py-2.5 px-3">Salón / Ubicación Actual</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3 text-center">Salones</th>
                <th className="py-2.5 px-3 w-36">Avance Ruta</th>
                <th className="py-2.5 px-3">Último Movimiento Registrado</th>
                <th className="py-2.5 px-3 text-right">Ir</th>
              </tr>
              {/* Filtros por columna de la Bitácora */}
              <tr className="border-b border-slate-200 bg-white">
                <th className="py-1.5 px-2">
                  <input
                    type="text"
                    value={filtroBitNombre}
                    onChange={(e) => setFiltroBitNombre(e.target.value)}
                    placeholder="Filtrar auditor..."
                    className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </th>
                <th className="py-1.5 px-2">
                  <select
                    value={filtroBitEstado}
                    onChange={(e) => setFiltroBitEstado(e.target.value)}
                    className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-1.5 text-[11px] font-normal text-slate-900 focus:outline-none"
                  >
                    <option value="">Todos los estados</option>
                    <option value="Auditando en vivo">Auditando en vivo</option>
                    <option value="Solicitando salón">Solicitando salón</option>
                    <option value="En ruta asignada">En ruta asignada</option>
                    <option value="Ruta completada">Ruta completada</option>
                    <option value="Sin ruta asignada">Sin ruta asignada</option>
                  </select>
                </th>
                <th className="py-1.5 px-2">
                  <input
                    type="text"
                    value={filtroBitSalon}
                    onChange={(e) => setFiltroBitSalon(e.target.value)}
                    placeholder="Grado / grupo..."
                    className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </th>
                <th className="py-1.5 px-2">
                  <input
                    type="text"
                    value={filtroBitSede}
                    onChange={(e) => setFiltroBitSede(e.target.value)}
                    placeholder="Filtrar sede..."
                    className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </th>
                <th className="py-1.5 px-2 text-center text-[10px] text-slate-400">
                  —
                </th>
                <th className="py-1.5 px-2 text-center text-[10px] text-slate-400">
                  —
                </th>
                <th className="py-1.5 px-2 text-[10px] text-slate-400">
                  Tiempo real (5s)
                </th>
                <th className="py-1.5 px-2 text-right">
                  {(filtroBitNombre ||
                    filtroBitEstado ||
                    filtroBitSalon ||
                    filtroBitSede) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroBitNombre('');
                        setFiltroBitEstado('');
                        setFiltroBitSalon('');
                        setFiltroBitSede('');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 border border-slate-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bitacoraFiltrada.map((u) => {
                const isLive =
                  u.estado_operativo === 'Auditando en vivo' ||
                  u.estado_operativo === 'Solicitando salón';
                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isLive ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{u.nombre}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {u.rol === 'ADMIN' ? 'Coordinador' : 'Auditor'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isLive
                            ? 'bg-blue-50 text-[#005FB8] border-blue-200'
                            : u.estado_operativo === 'En ruta asignada'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : u.estado_operativo === 'Ruta completada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isLive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#005FB8] animate-ping" />
                        )}
                        {u.estado_operativo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#005FB8] shrink-0" />
                        {u.ubicacion_actual}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {u.sede_actual}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 tabular-nums">
                      {u.salones_completados}/{u.salones_totales}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#005FB8] rounded-full transition-all duration-300"
                            style={{ width: `${u.porcentaje_avance_ruta}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-900 tabular-nums">
                          {u.estudiantes_auditados}/{u.estudiantes_en_ruta}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] font-mono">
                      {u.ultima_accion}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.salon_foco && onSelectSalon ? (
                        <button
                          type="button"
                          onClick={() => onSelectSalon(u.salon_foco)}
                          title="Ver este salón en 03. Llamado a Lista"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold transition-colors shadow-xs"
                        >
                          <span>Ver</span>
                          <ArrowUpRight className="w-3 h-3 text-[#005FB8]" />
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. REGISTRO CRONOLÓGICO DE MOVIMIENTOS RECIENTES + DESGLOSE 2027 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Feed cronológico de eventos en vivo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#005FB8]" />
              Movimientos Recientes en Vivo
            </h4>
            {bitacoraEventos.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-center px-4 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500">
                  Sin movimientos recientes en este corte
                </p>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 pr-1">
                {bitacoraEventos.map((ev, idx) => (
                  <div key={`${ev.hora}-${idx}`} className="py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {ev.funcionario}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {ev.hora}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {ev.accion} en <strong className="font-mono text-slate-900">{ev.salon}</strong> ({ev.sede})
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ev.detalle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 mt-3 flex justify-between items-center text-[11px] text-slate-500">
            <span>Sincronización</span>
            <span className="font-semibold text-slate-800">Automática cada 5s</span>
          </div>
        </div>

        {/* 2. Motivos de Retiro */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Motivos de Retiro
            </h4>

            {motivosList.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-center px-4 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500">Sin retiros registrados</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-1 max-h-40 overflow-y-auto pr-1">
                {motivosList.map((item) => (
                  <div key={item.etiqueta} className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">
                        {item.etiqueta}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {item.cantidad} • {item.porcentaje}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 mt-3 flex justify-between items-center text-[11px] text-slate-500">
            <span>Total bajas</span>
            <span className="font-semibold text-rose-600 tabular-nums">{retiros} alumnos</span>
          </div>
        </div>

        {/* 3. Requisitos 2027 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-4 h-4 text-[#005FB8]" />
              Requisitos 2027
            </h4>

            {requisitosList.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-center px-4 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500">Sin requisitos evaluados</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-1 max-h-40 overflow-y-auto pr-1">
                {requisitosList.map((item) => (
                  <div key={item.etiqueta} className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-slate-700 font-medium">
                        {item.etiqueta}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {item.cantidad} • {item.porcentaje}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005FB8] rounded-full transition-all duration-300"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 mt-3 flex justify-between items-center text-[11px] text-slate-500">
            <span>Continúan</span>
            <span className="font-semibold text-[#005FB8] tabular-nums">{continuan} alumnos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
