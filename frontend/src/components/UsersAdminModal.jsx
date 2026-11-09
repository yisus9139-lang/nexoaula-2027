import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Route,
  Trash2,
  KeyRound,
  Check,
  X,
  Save,
  AlertCircle,
  MessageCircle,
  Phone,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { formatGrado } from './ClassroomMapGrid';

/**
 * Función utilitaria para armar el enlace directo a WhatsApp Web / App Móvil
 * con la ruta de salones y el PIN del auditor.
 */
export function generarEnlaceWhatsAppRuta(funcionario, salonesAsignados = []) {
  const listaSalones =
    salonesAsignados.length > 0
      ? salonesAsignados
          .map((s) => `${formatGrado(s.grado)}${s.grupo} (${s.sede})`)
          .join(', ')
      : 'Sin salones pre-asignados aún (puedes tomar cualquier salón disponible)';

  const urlApp = window.location.origin;
  const mensaje = `Hola ${funcionario.nombre}, tu ruta de auditoría en NexoAula 2027 hoy es: ${listaSalones}. Tu PIN de ingreso rápido es: *${funcionario.pin_acceso}*. Entra aquí: ${urlApp}`;

  const telefonoLimpio = (funcionario.telefono || '').replace(/\D/g, '');
  const baseWa = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}`
    : 'https://wa.me/';

  return `${baseWa}?text=${encodeURIComponent(mensaje)}`;
}

export default function UsersAdminModal({
  isOpen,
  onClose,
  usuarios,
  salones,
  onCreateUsuario,
  onUpdateUsuario,
  onDeleteUsuario,
  onPreasignarSalones,
}) {
  const [activeTab, setActiveTab] = useState('perfiles'); // 'perfiles' | 'rutas'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado para crear nuevo funcionario
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoRol, setNuevoRol] = useState('AUDITOR');

  // Estado para edición rápida de PIN/Teléfono de un usuario existente en la fila
  const [editingUserId, setEditingUserId] = useState(null);
  const [editPin, setEditPin] = useState('');
  const [editTelefono, setEditTelefono] = useState('');

  // Filtros por columna en Pestaña 1 (Perfiles)
  const [filtroPerfNombre, setFiltroPerfNombre] = useState('');
  const [filtroPerfRol, setFiltroPerfRol] = useState('');
  const [filtroPerfPin, setFiltroPerfPin] = useState('');
  const [filtroPerfWa, setFiltroPerfWa] = useState('');

  // Estado para Pre-asignar salones
  const auditores = usuarios.filter((u) => u.rol === 'AUDITOR' || u.rol === 'ADMIN');
  const [selectedAuditorId, setSelectedAuditorId] = useState('');
  const [checkedSalones, setCheckedSalones] = useState({});

  // Filtros por columna en Pestaña 2 (Asignar Ruta)
  const [filtroRutaCheck, setFiltroRutaCheck] = useState(''); // '' | 'SI' | 'NO'
  const [filtroRutaSede, setFiltroRutaSede] = useState('');
  const [filtroRutaSalon, setFiltroRutaSalon] = useState('');
  const [filtroRutaAlumnos, setFiltroRutaAlumnos] = useState('');
  const [filtroRutaEstado, setFiltroRutaEstado] = useState('');
  const [filtroRutaAuditor, setFiltroRutaAuditor] = useState('');

  // Sincronizar salones marcados SOLO al cambiar de auditor o al abrir el modal
  // (evita que el polling cada 5s borre la selección en curso del usuario)
  const sincronizarChecksDeAuditor = (auditorId, listaSalones) => {
    if (!auditorId) return;
    const map = {};
    (listaSalones || []).forEach((s) => {
      const key = `${s.sede}|${s.grado}|${s.grupo}`;
      if (
        String(s.funcionario_id) === String(auditorId) &&
        (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
      ) {
        map[key] = true;
      }
    });
    setCheckedSalones(map);
  };

  useEffect(() => {
    if (!isOpen) return;
    let targetId = selectedAuditorId;
    if (!targetId && auditores.length > 0) {
      const firstAuditor =
        usuarios.find((u) => u.rol === 'AUDITOR') || usuarios[0];
      if (firstAuditor) {
        targetId = String(firstAuditor.id);
        setSelectedAuditorId(targetId);
      }
    }
    if (targetId) {
      sincronizarChecksDeAuditor(targetId, salones);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedAuditorId]);

  // Catálogos únicos para los filtros de la tabla de salones
  const sedesUnicas = useMemo(
    () => Array.from(new Set(salones.map((s) => s.sede).filter(Boolean))).sort(),
    [salones]
  );

  const auditoresAsignadosUnicos = useMemo(
    () =>
      Array.from(
        new Set(salones.map((s) => s.funcionario_nombre).filter(Boolean))
      ).sort(),
    [salones]
  );

  // Perfiles filtrados por columna
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (
        filtroPerfNombre &&
        !(u.nombre || '').toLowerCase().includes(filtroPerfNombre.toLowerCase())
      ) {
        return false;
      }
      if (filtroPerfRol && u.rol !== filtroPerfRol) {
        return false;
      }
      if (
        filtroPerfPin &&
        !(u.pin_acceso || '').toLowerCase().includes(filtroPerfPin.toLowerCase())
      ) {
        return false;
      }
      if (
        filtroPerfWa &&
        !(u.telefono || '').toLowerCase().includes(filtroPerfWa.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [usuarios, filtroPerfNombre, filtroPerfRol, filtroPerfPin, filtroPerfWa]);

  // Salones filtrados por columna en Pestaña 2
  const salonesFiltrados = useMemo(() => {
    return salones.filter((salon) => {
      const key = `${salon.sede}|${salon.grado}|${salon.grupo}`;
      const isChecked = !!checkedSalones[key];

      if (filtroRutaCheck === 'SI' && !isChecked) return false;
      if (filtroRutaCheck === 'NO' && isChecked) return false;

      if (filtroRutaSede && salon.sede !== filtroRutaSede) return false;

      if (filtroRutaSalon) {
        const textoSalon = `${formatGrado(salon.grado)} — Grupo ${salon.grupo} ${salon.grado} ${salon.grupo}`.toLowerCase();
        if (!textoSalon.includes(filtroRutaSalon.toLowerCase())) return false;
      }

      if (filtroRutaAlumnos) {
        if (!String(salon.total_estudiantes ?? '').includes(filtroRutaAlumnos.trim())) {
          return false;
        }
      }

      if (filtroRutaEstado && salon.estado !== filtroRutaEstado) return false;

      if (filtroRutaAuditor === '__SIN_ASIGNAR__') {
        if (salon.funcionario_nombre) return false;
      } else if (
        filtroRutaAuditor &&
        salon.funcionario_nombre !== filtroRutaAuditor
      ) {
        return false;
      }

      return true;
    });
  }, [
    salones,
    checkedSalones,
    filtroRutaCheck,
    filtroRutaSede,
    filtroRutaSalon,
    filtroRutaAlumnos,
    filtroRutaEstado,
    filtroRutaAuditor,
  ]);

  if (!isOpen) return null;

  const handleCrearPerfil = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nuevoNombre.trim() || nuevoPin.trim().length < 4) {
      setErrorMsg('Completa el nombre completo y un PIN único de 4 dígitos.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateUsuario({
        nombre: nuevoNombre.trim(),
        pin_acceso: nuevoPin.trim(),
        telefono: nuevoTelefono.trim() || null,
        rol: nuevoRol,
      });
      setNuevoNombre('');
      setNuevoPin('');
      setNuevoTelefono('');
      setNuevoRol('AUDITOR');
      setSuccessMsg('Perfil creado.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIniciarEdicion = (u) => {
    setEditingUserId(u.id);
    setEditPin(u.pin_acceso || '');
    setEditTelefono(u.telefono || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleGuardarEdicion = async (usuarioId) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (editPin.trim().length !== 4) {
      setErrorMsg('El PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    setSubmitting(true);
    try {
      await onUpdateUsuario(usuarioId, {
        pin_acceso: editPin.trim(),
        telefono: editTelefono.trim() || null,
      });
      setEditingUserId(null);
      setSuccessMsg('Datos actualizados.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (u) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await onDeleteUsuario(u.id);
      setSuccessMsg(`Se eliminó el perfil de ${u.nombre}.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSalonCheck = (salon) => {
    const key = `${salon.sede}|${salon.grado}|${salon.grupo}`;
    setCheckedSalones((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleTodosFiltrados = () => {
    const disponiblesFiltrados = salonesFiltrados.filter(
      (s) => s.estado !== 'COMPLETADO'
    );
    if (disponiblesFiltrados.length === 0) return;

    const todosMarcados = disponiblesFiltrados.every(
      (s) => checkedSalones[`${s.sede}|${s.grado}|${s.grupo}`]
    );

    setCheckedSalones((prev) => {
      const next = { ...prev };
      disponiblesFiltrados.forEach((s) => {
        const key = `${s.sede}|${s.grado}|${s.grupo}`;
        next[key] = !todosMarcados;
      });
      return next;
    });
  };

  const limpiarFiltrosRuta = () => {
    setFiltroRutaCheck('');
    setFiltroRutaSede('');
    setFiltroRutaSalon('');
    setFiltroRutaAlumnos('');
    setFiltroRutaEstado('');
    setFiltroRutaAuditor('');
  };

  const hayFiltrosRuta =
    filtroRutaCheck ||
    filtroRutaSede ||
    filtroRutaSalon ||
    filtroRutaAlumnos ||
    filtroRutaEstado ||
    filtroRutaAuditor;

  const handleGuardarRuta = async () => {
    if (!selectedAuditorId) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    const listaSeleccionada = Object.entries(checkedSalones)
      .filter(([, isChecked]) => isChecked)
      .map(([key]) => {
        const [sede, grado, grupo] = key.split('|');
        return { sede, grado, grupo };
      });

    try {
      const res = await onPreasignarSalones({
        funcionario_id: Number(selectedAuditorId),
        salones: listaSeleccionada,
      });
      setSuccessMsg(res.mensaje || 'Ruta actualizada.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMarcadosCount = Object.values(checkedSalones).filter(Boolean).length;
  const disponiblesFiltrados = salonesFiltrados.filter(
    (s) => s.estado !== 'COMPLETADO'
  );
  const todosFiltradosMarcados =
    disponiblesFiltrados.length > 0 &&
    disponiblesFiltrados.every(
      (s) => !!checkedSalones[`${s.sede}|${s.grado}|${s.grupo}`]
    );
  const auditorActualObj = usuarios.find(
    (u) => String(u.id) === String(selectedAuditorId)
  );
  const salonesDeAuditorActual = salones.filter((s) => {
    const key = `${s.sede}|${s.grado}|${s.grupo}`;
    if (totalMarcadosCount > 0) {
      return !!checkedSalones[key];
    }
    return (
      String(s.funcionario_id) === String(selectedAuditorId) &&
      (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#005FB8]" />
              Equipo Auditor y Rutas
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Perfiles con PIN de 4 dígitos y asignación de salones
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="px-6 pt-2.5 bg-[#F8F8F8] border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('perfiles');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'perfiles'
                ? 'border-[#005FB8] text-[#005FB8] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Perfiles
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('rutas');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'rutas'
                ? 'border-[#005FB8] text-[#005FB8] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            2. Asignar Ruta
          </button>
        </div>

        {/* Alertas de feedback */}
        {(errorMsg || successMsg) && (
          <div className="px-6 pt-3">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                {successMsg}
              </div>
            )}
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {activeTab === 'perfiles' ? (
            <>
              {/* Formulario en fila bien proporcionado */}
              <form
                onSubmit={handleCrearPerfil}
                className="pb-5 border-b border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#005FB8]" />
                    Nuevo Perfil
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                  <div className="lg:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Laura Gómez"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs text-slate-900 focus:outline-none shadow-xs"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      PIN (4 dígitos)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4040"
                      value={nuevoPin}
                      onChange={(e) =>
                        setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs font-mono font-bold text-slate-900 tracking-widest focus:outline-none shadow-xs"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      WhatsApp (Opcional)
                    </label>
                    <input
                      type="tel"
                      placeholder="573001234567"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value)}
                      className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-3 text-xs text-slate-900 focus:outline-none shadow-xs"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Rol
                    </label>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      className="w-full h-9 bg-white border border-slate-200 focus:border-[#005FB8] rounded-xl px-2.5 text-xs text-slate-900 focus:outline-none shadow-xs"
                    >
                      <option value="AUDITOR">Auditor</option>
                      <option value="ADMIN">Coordinador</option>
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-9 px-3 rounded-xl bg-[#005FB8] hover:bg-[#004C94] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              </form>

              {/* Tabla de Perfiles Activos con Filtros por Columna */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8F8F8] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-2.5">Funcionario</th>
                      <th className="py-2 px-2.5">Rol</th>
                      <th className="py-2 px-2.5">PIN</th>
                      <th className="py-2 px-2.5">WhatsApp</th>
                      <th className="py-2 px-2.5 text-center">Salones</th>
                      <th className="py-2 px-2.5 text-center">Auditados</th>
                      <th className="py-2 px-2.5 text-right">Acciones</th>
                    </tr>
                    {/* Fila de filtros por columna */}
                    <tr className="border-b border-slate-200 bg-white">
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroPerfNombre}
                          onChange={(e) => setFiltroPerfNombre(e.target.value)}
                          placeholder="Filtrar nombre..."
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroPerfRol}
                          onChange={(e) => setFiltroPerfRol(e.target.value)}
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-1.5 text-[11px] font-normal text-slate-900 focus:outline-none"
                        >
                          <option value="">Todos</option>
                          <option value="ADMIN">Coordinador</option>
                          <option value="AUDITOR">Auditor</option>
                        </select>
                      </th>
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroPerfPin}
                          onChange={(e) => setFiltroPerfPin(e.target.value)}
                          placeholder="PIN..."
                          className="w-20 h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-mono font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroPerfWa}
                          onChange={(e) => setFiltroPerfWa(e.target.value)}
                          placeholder="Teléfono..."
                          className="w-28 h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2 text-center text-[10px] text-slate-400">
                        —
                      </th>
                      <th className="py-1.5 px-2 text-center text-[10px] text-slate-400">
                        —
                      </th>
                      <th className="py-1.5 px-2 text-right">
                        {(filtroPerfNombre ||
                          filtroPerfRol ||
                          filtroPerfPin ||
                          filtroPerfWa) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFiltroPerfNombre('');
                              setFiltroPerfRol('');
                              setFiltroPerfPin('');
                              setFiltroPerfWa('');
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
                    {usuariosFiltrados.map((u) => {
                      const salonesDeEsteUsuario = salones.filter(
                        (s) =>
                          u.id === s.funcionario_id &&
                          (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
                      );
                      const enlaceWa = generarEnlaceWhatsAppRuta(
                        u,
                        salonesDeEsteUsuario
                      );
                      const isEditing = editingUserId === u.id;

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {/* Nombre */}
                          <td className="py-3 px-2.5 font-bold text-slate-900">
                            {u.nombre}
                          </td>

                          {/* Rol */}
                          <td className="py-3 px-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                u.rol === 'ADMIN'
                                  ? 'bg-blue-50 text-[#005FB8] border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {u.rol === 'ADMIN' ? 'Coordinador' : 'Auditor'}
                            </span>
                          </td>

                          {/* PIN */}
                          <td className="py-3 px-2.5">
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={editPin}
                                onChange={(e) =>
                                  setEditPin(
                                    e.target.value.replace(/\D/g, '').slice(0, 4)
                                  )
                                }
                                className="w-20 bg-white border border-[#005FB8] rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 shadow-xs"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                <KeyRound className="w-3 h-3 text-slate-400" />
                                {u.pin_acceso}
                              </span>
                            )}
                          </td>

                          {/* WhatsApp */}
                          <td className="py-3 px-2.5 text-slate-700">
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editTelefono}
                                onChange={(e) => setEditTelefono(e.target.value)}
                                placeholder="57300..."
                                className="w-32 bg-white border border-[#005FB8] rounded-lg px-2 py-1 text-xs text-slate-900 shadow-xs"
                              />
                            ) : u.telefono ? (
                              <span className="inline-flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {u.telefono}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Salones */}
                          <td className="py-3 px-2.5 text-center font-bold text-slate-900">
                            {u.salones_asignados_count ?? salonesDeEsteUsuario.length}
                          </td>

                          {/* Auditados */}
                          <td className="py-3 px-2.5 text-center font-bold text-slate-900">
                            {u.estudiantes_auditados_hoy ?? u.estudiantes_auditados ?? 0}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-2.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleGuardarEdicion(u.id)}
                                    className="px-2.5 py-1 rounded-lg bg-[#005FB8] text-white text-[11px] font-bold shadow-xs"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 rounded-lg bg-white text-slate-700 border border-slate-300 text-[11px] shadow-xs"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <a
                                    href={enlaceWa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Enviar Ruta y PIN por WhatsApp"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors shadow-xs"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleIniciarEdicion(u)}
                                    title="Editar PIN o WhatsApp"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleEliminar(u)}
                                    title="Eliminar perfil"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Pestaña 2: Asignar Ruta de Salones en Tabla con Filtros por Columna */
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Funcionario Auditor
                  </label>
                  <select
                    value={selectedAuditorId}
                    onChange={(e) => setSelectedAuditorId(e.target.value)}
                    className="w-full sm:max-w-md h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#005FB8] shadow-xs"
                  >
                    {auditores.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.rol === 'ADMIN' ? 'Coordinador' : 'Auditor'} — PIN: {a.pin_acceso})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {hayFiltrosRuta && (
                    <button
                      type="button"
                      onClick={limpiarFiltrosRuta}
                      title="Limpiar filtros de columnas"
                      className="h-9 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Limpiar
                    </button>
                  )}
                  {auditorActualObj && (
                    <a
                      href={generarEnlaceWhatsAppRuta(
                        auditorActualObj,
                        salonesDeAuditorActual
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={submitting || !selectedAuditorId}
                    onClick={handleGuardarRuta}
                    className="h-9 px-4 rounded-xl bg-[#005FB8] hover:bg-[#004C94] text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar Ruta
                  </button>
                </div>
              </div>

              {/* Tabla de Salones con filtros en cada columna */}
              <div className="overflow-x-auto max-h-[410px] overflow-y-auto border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="sticky top-0 bg-[#F8F8F8] z-10 shadow-xs">
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-2.5 w-24 text-center">
                        <button
                          type="button"
                          onClick={handleToggleTodosFiltrados}
                          title="Seleccionar o deseleccionar salones visibles"
                          className="inline-flex items-center justify-center gap-1.5 hover:text-slate-900 transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              todosFiltradosMarcados
                                ? 'bg-[#005FB8] border-[#005FB8] text-white shadow-xs'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {todosFiltradosMarcados && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </span>
                          <span>Ruta</span>
                        </button>
                      </th>
                      <th className="py-2 px-2.5">Sede</th>
                      <th className="py-2 px-2.5">Salón</th>
                      <th className="py-2 px-2.5 text-center w-24">Alumnos</th>
                      <th className="py-2 px-2.5">Estado Actual</th>
                      <th className="py-2 px-2.5">Auditor Asignado</th>
                    </tr>

                    {/* Fila de Filtros por Columna */}
                    <tr className="border-b border-slate-200 bg-white">
                      {/* Filtro Columna RUTA */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaCheck}
                          onChange={(e) => setFiltroRutaCheck(e.target.value)}
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-1 text-[11px] font-normal text-slate-900 focus:outline-none"
                        >
                          <option value="">Todos</option>
                          <option value="SI">Marcados</option>
                          <option value="NO">Sin marcar</option>
                        </select>
                      </th>

                      {/* Filtro Columna SEDE */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaSede}
                          onChange={(e) => setFiltroRutaSede(e.target.value)}
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 focus:outline-none"
                        >
                          <option value="">Todas las sedes</option>
                          {sedesUnicas.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </th>

                      {/* Filtro Columna SALÓN */}
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroRutaSalon}
                          onChange={(e) => setFiltroRutaSalon(e.target.value)}
                          placeholder="Grado o grupo..."
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </th>

                      {/* Filtro Columna ALUMNOS */}
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroRutaAlumnos}
                          onChange={(e) => setFiltroRutaAlumnos(e.target.value)}
                          placeholder="Cant..."
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-center text-[11px] font-normal text-slate-900 placeholder-slate-400 focus:outline-none"
                        />
                      </th>

                      {/* Filtro Columna ESTADO ACTUAL */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaEstado}
                          onChange={(e) => setFiltroRutaEstado(e.target.value)}
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 focus:outline-none"
                        >
                          <option value="">Todos</option>
                          <option value="DISPONIBLE">Libre</option>
                          <option value="ASIGNADO">Asignado</option>
                          <option value="EN_AUDITORIA">En curso</option>
                          <option value="COMPLETADO">Cerrado</option>
                        </select>
                      </th>

                      {/* Filtro Columna AUDITOR ASIGNADO */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaAuditor}
                          onChange={(e) => setFiltroRutaAuditor(e.target.value)}
                          className="w-full h-7 bg-[#F8F8F8] border border-slate-200 focus:border-[#005FB8] rounded-lg px-2 text-[11px] font-normal text-slate-900 focus:outline-none"
                        >
                          <option value="">Todos</option>
                          <option value="__SIN_ASIGNAR__">Sin asignar (—)</option>
                          {auditoresAsignadosUnicos.map((nombreAud) => (
                            <option key={nombreAud} value={nombreAud}>
                              {nombreAud}
                            </option>
                          ))}
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs bg-white">
                    {salonesFiltrados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-400 text-xs"
                        >
                          No hay salones que coincidan con los filtros de columna.
                        </td>
                      </tr>
                    ) : (
                      salonesFiltrados.map((salon) => {
                        const key = `${salon.sede}|${salon.grado}|${salon.grupo}`;
                        const isChecked = !!checkedSalones[key];
                        const isCompleted = salon.estado === 'COMPLETADO';

                        return (
                          <tr
                            key={key}
                            onClick={() =>
                              !isCompleted && handleToggleSalonCheck(salon)
                            }
                            className={`transition-colors ${
                              isCompleted
                                ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                : isChecked
                                ? 'bg-blue-50/40 cursor-pointer'
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <td className="py-2.5 px-2.5 text-center">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isChecked}
                                disabled={isCompleted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isCompleted) handleToggleSalonCheck(salon);
                                }}
                                className={`w-5 h-5 mx-auto rounded-md flex items-center justify-center border transition-all ${
                                  isCompleted
                                    ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
                                    : isChecked
                                    ? 'bg-[#005FB8] border-[#005FB8] text-white shadow-xs'
                                    : 'bg-white border-slate-300 hover:border-[#005FB8]'
                                }`}
                              >
                                {isChecked && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-600 font-medium">
                              {salon.sede}
                            </td>
                            <td className="py-2.5 px-2.5 font-bold text-slate-900">
                              {formatGrado(salon.grado)} — Grupo {salon.grupo}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-600">
                              {salon.total_estudiantes}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  salon.estado === 'EN_AUDITORIA'
                                    ? 'bg-[#005FB8] text-white'
                                    : salon.estado === 'ASIGNADO'
                                    ? 'bg-blue-50 text-[#005FB8] border border-blue-200'
                                    : salon.estado === 'COMPLETADO'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {salon.estado === 'DISPONIBLE'
                                  ? 'Libre'
                                  : salon.estado === 'ASIGNADO'
                                  ? 'Asignado'
                                  : salon.estado === 'EN_AUDITORIA'
                                  ? 'En curso'
                                  : 'Cerrado'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-600">
                              {salon.funcionario_nombre || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
