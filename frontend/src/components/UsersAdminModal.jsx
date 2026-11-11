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
  Send,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
} from 'lucide-react';
import { formatGrado } from './ClassroomMapGrid';

/**
 * Genera un PIN aleatorio de 4 dígitos garantizando que no esté duplicado con usuarios existentes.
 */
export function generarPinAleatorioUnico(usuariosExistentes = []) {
  const pinesUsados = new Set(
    (usuariosExistentes || [])
      .map((u) => String(u.pin_acceso || '').trim())
      .filter(Boolean)
  );
  for (let i = 0; i < 100; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!pinesUsados.has(pin)) {
      return pin;
    }
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Normaliza cualquier número telefónico al formato internacional de WhatsApp Colombia (+57).
 * Si el usuario escribe 10 dígitos (ej: 3001234567), le añade el 57 automáticamente.
 * Si ya incluye el 57 o +57, lo limpia y preserva.
 */
export function normalizarTelefonoColombia(tel) {
  if (!tel) return '';
  const digits = String(tel).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith('57')) return digits;
  return digits;
}

/**
 * Formatea un número telefónico para visualización estética en interfaz (+57 300 123 4567).
 */
export function formatTelefonoVisual(tel) {
  if (!tel) return '—';
  const digits = String(tel).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 10) {
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return tel;
}

/**
 * Genera el texto formateado en Markdown de la ruta asignada a un auditor.
 */
export function generarTextoWhatsAppRuta(funcionario, salonesAsignados = []) {
  const urlApp =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://nexoaula-2027.onrender.com';

  const nombre = funcionario?.nombre || 'Auditor';
  const pin = funcionario?.pin_acceso || '—';

  let cuerpoSalones = '';

  if (!salonesAsignados || salonesAsignados.length === 0) {
    cuerpoSalones = [
      `*Salones asignados:*`,
      `Aún no tienes salones pre-asignados en tu ruta. Puedes ingresar a la app y tomar cualquier salón libre en el mapa.`,
    ].join('\n');
  } else {
    // Agrupar salones por sede para eliminar redundancia
    const salonesPorSede = {};
    salonesAsignados.forEach((s) => {
      const sedeKey = (s.sede || 'Sede Principal').trim();
      if (!salonesPorSede[sedeKey]) {
        salonesPorSede[sedeKey] = [];
      }
      salonesPorSede[sedeKey].push(s);
    });

    const sedes = Object.keys(salonesPorSede);
    const totalSalones = salonesAsignados.length;

    if (sedes.length === 1) {
      const sedeUnica = sedes[0];
      const lista = salonesPorSede[sedeUnica]
        .map((s) => {
          const grado = formatGrado(s.grado);
          const grupoLimpio = String(s.grupo || '').replace(/^-/, '').trim();
          return `• Grado ${grado} — Grupo ${grupoLimpio}`;
        })
        .join('\n');

      cuerpoSalones = [
        `*Sede:* ${sedeUnica}`,
        `*Salones asignados (${totalSalones}):*`,
        lista,
      ].join('\n');
    } else {
      const bloques = sedes
        .map((sede) => {
          const lista = salonesPorSede[sede]
            .map((s) => {
              const grado = formatGrado(s.grado);
              const grupoLimpio = String(s.grupo || '').replace(/^-/, '').trim();
              return `  • Grado ${grado} — Grupo ${grupoLimpio}`;
            })
            .join('\n');

          return `*Sede:* ${sede} (${salonesPorSede[sede].length} salones)\n${lista}`;
        })
        .join('\n\n');

      cuerpoSalones = [
        `*Total salones asignados:* ${totalSalones}`,
        ``,
        bloques,
      ].join('\n');
    }
  }

  return [
    `*NexoAula 2027 | Ruta de Auditoría*`,
    ``,
    `Hola *${nombre}*, aquí tienes la información para tu jornada de auditoría hoy:`,
    ``,
    cuerpoSalones,
    ``,
    `*PIN de ingreso rápido:* *${pin}*`,
    `*Enlace de acceso:*`,
    `${urlApp}`,
    ``,
    `_Ingresa con tu PIN desde el celular para iniciar el llamado a lista en cada aula._`,
  ].join('\n');
}

/**
 * Función utilitaria para armar el enlace directo a WhatsApp Web / App Móvil
 * con el número normalizado (+57 automático para Colombia).
 */
export function generarEnlaceWhatsAppRuta(funcionario, salonesAsignados = []) {
  const mensaje = generarTextoWhatsAppRuta(funcionario, salonesAsignados);
  const telefonoLimpio = normalizarTelefonoColombia(funcionario?.telefono);
  const baseWa = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}`
    : 'https://wa.me/';

  return `${baseWa}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Genera un texto consolidado con TODAS las rutas asignadas del día
 * listo para copiar y enviar en 1 solo clic al grupo general de WhatsApp del equipo.
 */
export function generarTextoConsolidadoRutas(auditoresConRuta = [], urlApp = 'https://nexoaula-2027.onrender.com') {
  if (!auditoresConRuta || auditoresConRuta.length === 0) {
    return 'No hay rutas asignadas para consolidar.';
  }

  const bloques = auditoresConRuta.map((item, idx) => {
    const { funcionario, salones } = item;
    const pin = funcionario?.pin_acceso || '—';
    const nombre = funcionario?.nombre || 'Auditor';

    const porSede = {};
    salones.forEach((s) => {
      const sede = (s.sede || 'Sede Principal').trim();
      if (!porSede[sede]) porSede[sede] = [];
      const grado = formatGrado(s.grado);
      const grupo = String(s.grupo || '').replace(/^-/, '').trim();
      porSede[sede].push(`${grado}-${grupo}`);
    });

    const lineasSedes = Object.entries(porSede).map(
      ([sede, aulas]) => `  • ${sede}: ${aulas.join(', ')}`
    ).join('\n');

    return [
      `*${idx + 1}. ${nombre}* (PIN: *${pin}*)`,
      lineasSedes || '  • Sin salones asignados',
    ].join('\n');
  }).join('\n\n');

  return [
    `*NexoAula 2027 | Distribución General de Rutas de Auditoría*`,
    ``,
    bloques,
    ``,
    `*Enlace de acceso a la app:*`,
    `${urlApp}`,
    ``,
    `_Cada auditor debe ingresar con su PIN correspondiente para el llamado a lista._`,
  ].join('\n');
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
  const [activeTab, setActiveTab] = useState('perfiles'); // 'perfiles' | 'rutas' | 'masivo'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado para envío masivo y asistido por WhatsApp
  const [enviadosWa, setEnviadosWa] = useState({});
  const [copiadoConsolidado, setCopiadoConsolidado] = useState(false);
  const [copiadoIndividualId, setCopiadoIndividualId] = useState(null);

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

  useEffect(() => {
    if (isOpen && !nuevoPin) {
      setNuevoPin(generarPinAleatorioUnico(usuarios));
    }
  }, [isOpen, usuarios]);

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

  // Consolidado de auditores que tienen al menos un salón asignado en su ruta
  const auditoresConRuta = useMemo(() => {
    return usuarios
      .filter((u) => u.rol === 'AUDITOR' || u.rol === 'ADMIN')
      .map((u) => {
        const salonesDelAuditor = (salones || []).filter(
          (s) => String(s.funcionario_id) === String(u.id) &&
                 (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
        );
        return {
          funcionario: u,
          salones: salonesDelAuditor,
        };
      })
      .filter((item) => item.salones.length > 0);
  }, [usuarios, salones]);

  const totalSalonesDistribuidos = useMemo(() => {
    return auditoresConRuta.reduce((acc, a) => acc + a.salones.length, 0);
  }, [auditoresConRuta]);

  const conTelefonoCount = useMemo(() => {
    return auditoresConRuta.filter((a) => !!normalizarTelefonoColombia(a.funcionario.telefono)).length;
  }, [auditoresConRuta]);

  const enviadosCount = useMemo(() => {
    return auditoresConRuta.filter((a) => !!enviadosWa[a.funcionario.id]).length;
  }, [auditoresConRuta, enviadosWa]);

  const siguientePendiente = useMemo(() => {
    return auditoresConRuta.find(
      (a) => !enviadosWa[a.funcionario.id] && !!normalizarTelefonoColombia(a.funcionario.telefono)
    );
  }, [auditoresConRuta, enviadosWa]);

  const marcarComoEnviado = (id) => {
    setEnviadosWa((prev) => ({ ...prev, [id]: true }));
  };

  const toggleEnviado = (id) => {
    setEnviadosWa((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopiarConsolidado = async () => {
    try {
      const urlApp =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'https://nexoaula-2027.onrender.com';
      const texto = generarTextoConsolidadoRutas(auditoresConRuta, urlApp);
      await navigator.clipboard.writeText(texto);
      setCopiadoConsolidado(true);
      setTimeout(() => setCopiadoConsolidado(false), 3000);
    } catch {
      setErrorMsg('No se pudo copiar automáticamente. Puedes seleccionar el texto manualmente.');
    }
  };

  const handleCopiarIndividual = async (id, texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoIndividualId(id);
      setTimeout(() => setCopiadoIndividualId(null), 2500);
    } catch {
      setErrorMsg('No se pudo copiar al portapapeles.');
    }
  };

  const handleAbrirSiguiente = () => {
    if (!siguientePendiente) return;
    const enlace = generarEnlaceWhatsAppRuta(
      siguientePendiente.funcionario,
      siguientePendiente.salones
    );
    window.open(enlace, '_blank');
    marcarComoEnviado(siguientePendiente.funcionario.id);
  };

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
      const telNormalizado = normalizarTelefonoColombia(nuevoTelefono.trim());
      await onCreateUsuario({
        nombre: nuevoNombre.trim(),
        pin_acceso: nuevoPin.trim(),
        telefono: telNormalizado || null,
        rol: nuevoRol,
      });
      setNuevoNombre('');
      setNuevoPin(generarPinAleatorioUnico(usuarios));
      setNuevoTelefono('');
      setNuevoRol('AUDITOR');
      setSuccessMsg('Perfil creado exitosamente.');
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
      const telNormalizado = normalizarTelefonoColombia(editTelefono.trim());
      await onUpdateUsuario(usuarioId, {
        pin_acceso: editPin.trim(),
        telefono: telNormalizado || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-[#1F1F1F] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              Equipo Auditor y Rutas
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Perfiles con PIN de 4 dígitos y asignación de salones
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="px-6 pt-2.5 bg-[#000000] border-b border-[#1F1F1F] flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('perfiles');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'perfiles'
                ? 'border-white text-white bg-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-white'
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
                ? 'border-white text-white bg-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            2. Asignar Ruta
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('masivo');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all ${
              activeTab === 'masivo'
                ? 'border-white text-white bg-[#0A0A0A]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            3. Envío Masivo WhatsApp
            {auditoresConRuta.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-[#000000] text-[10px] font-black">
                {auditoresConRuta.length}
              </span>
            )}
          </button>
        </div>

        {/* Alertas de feedback */}
        {(errorMsg || successMsg) && (
          <div className="px-6 pt-3">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-[#141414] border border-[#404040] text-xs text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 rounded-xl bg-[#171717] border border-white/40 text-xs text-white flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-white" />
                {successMsg}
              </div>
            )}
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'perfiles' ? (
            <>
              {/* Formulario en fila bien proporcionado */}
              <form
                onSubmit={handleCrearPerfil}
                className="pb-5 border-b border-[#262626] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-white" />
                    Nuevo Perfil
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                  <div className="lg:col-span-4">
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Laura Gómez"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-neutral-400 mb-1 flex items-center justify-between">
                      <span>PIN (4 dígitos)</span>
                      <button
                        type="button"
                        onClick={() => setNuevoPin(generarPinAleatorioUnico(usuarios))}
                        title="Generar nuevo PIN único"
                        className="text-[9px] text-neutral-400 hover:text-white inline-flex items-center gap-0.5 cursor-pointer font-mono"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Auto</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="4040"
                        value={nuevoPin}
                        onChange={(e) =>
                          setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl pl-3 pr-8 text-xs font-mono font-bold text-white tracking-widest focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setNuevoPin(generarPinAleatorioUnico(usuarios))}
                        title="Generar otro PIN aleatorio"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] text-neutral-400 mb-1 flex items-center justify-between">
                      <span>WhatsApp (Opcional)</span>
                      <span className="text-[9px] text-neutral-500 font-mono">+57 auto</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-neutral-500 select-none">
                        +57
                      </span>
                      <input
                        type="tel"
                        placeholder="300 123 4567"
                        value={nuevoTelefono}
                        onChange={(e) => setNuevoTelefono(e.target.value)}
                        className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl pl-9 pr-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Rol
                    </label>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      className="w-full h-9 bg-[#000000] border border-[#262626] focus:border-white rounded-xl px-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="AUDITOR">Auditor</option>
                      <option value="ADMIN">Coordinador</option>
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-9 px-3 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold transition-all"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              </form>

              {/* Tabla de Perfiles Activos con Filtros por Columna */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="py-2 px-2.5">Funcionario</th>
                      <th className="py-2 px-2.5">Rol</th>
                      <th className="py-2 px-2.5">PIN</th>
                      <th className="py-2 px-2.5">WhatsApp</th>
                      <th className="py-2 px-2.5 text-center">Salones</th>
                      <th className="py-2 px-2.5 text-center">Auditados</th>
                      <th className="py-2 px-2.5 text-right">Acciones</th>
                    </tr>
                    {/* Fila de filtros por columna */}
                    <tr className="border-b border-[#262626] bg-[#050505]">
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroPerfNombre}
                          onChange={(e) => setFiltroPerfNombre(e.target.value)}
                          placeholder="Filtrar nombre..."
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroPerfRol}
                          onChange={(e) => setFiltroPerfRol(e.target.value)}
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-1.5 text-[11px] font-normal text-white focus:outline-none"
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
                          className="w-20 h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-mono font-normal text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroPerfWa}
                          onChange={(e) => setFiltroPerfWa(e.target.value)}
                          placeholder="Teléfono..."
                          className="w-28 h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </th>
                      <th className="py-1.5 px-2 text-center text-[10px] text-neutral-600">
                        —
                      </th>
                      <th className="py-1.5 px-2 text-center text-[10px] text-neutral-600">
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
                          className="hover:bg-[#121212] transition-colors"
                        >
                          {/* Nombre */}
                          <td className="py-3 px-2.5 font-bold text-white">
                            {u.nombre}
                          </td>

                          {/* Rol */}
                          <td className="py-3 px-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                u.rol === 'ADMIN'
                                  ? 'bg-white text-[#000000]'
                                  : 'bg-[#171717] text-neutral-300 border border-[#333333]'
                              }`}
                            >
                              {u.rol === 'ADMIN' ? 'Coordinador' : 'Auditor'}
                            </span>
                          </td>

                          {/* PIN */}
                          <td className="py-3 px-2.5">
                            {isEditing ? (
                              <div className="relative inline-flex items-center">
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
                                  className="w-24 bg-[#000000] border border-white rounded-lg pl-2 pr-6 py-1 text-xs font-mono font-bold text-white tracking-widest"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditPin(generarPinAleatorioUnico(usuarios))}
                                  title="Generar nuevo PIN único"
                                  className="absolute right-1 text-neutral-400 hover:text-white"
                                >
                                  <Sparkles className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-white bg-[#000000] px-2 py-0.5 rounded border border-[#262626]">
                                <KeyRound className="w-3 h-3 text-neutral-400" />
                                {u.pin_acceso}
                              </span>
                            )}
                          </td>

                          {/* WhatsApp */}
                          <td className="py-3 px-2.5 text-neutral-300">
                            {isEditing ? (
                              <div className="relative inline-block">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 select-none">
                                  +57
                                </span>
                                <input
                                  type="tel"
                                  value={editTelefono}
                                  onChange={(e) => setEditTelefono(e.target.value)}
                                  placeholder="300 123 4567"
                                  className="w-32 bg-[#000000] border border-white rounded-lg pl-7 pr-1.5 py-1 text-xs text-white font-mono"
                                />
                              </div>
                            ) : u.telefono ? (
                              <span className="inline-flex items-center gap-1 text-neutral-300 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-neutral-500" />
                                {formatTelefonoVisual(u.telefono)}
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>

                          {/* Salones */}
                          <td className="py-3 px-2.5 text-center font-bold text-white">
                            {u.salones_asignados_count ?? salonesDeEsteUsuario.length}
                          </td>

                          {/* Auditados */}
                          <td className="py-3 px-2.5 text-center font-bold text-white">
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
                                    className="px-2.5 py-1 rounded-lg bg-white text-[#000000] text-[11px] font-bold"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 rounded-lg bg-[#171717] text-neutral-300 text-[11px]"
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-[#000000] text-[11px] font-bold transition-colors"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleIniciarEdicion(u)}
                                    title="Editar PIN o WhatsApp"
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1F1F1F] border border-transparent hover:border-[#333333] transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleEliminar(u)}
                                    title="Eliminar perfil"
                                    className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-[#1F1F1F] border border-transparent hover:border-[#333333] transition-colors"
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
          ) : activeTab === 'rutas' ? (
            /* Pestaña 2: Asignar Ruta de Salones en Tabla con Filtros por Columna */
            <div className="space-y-4">
              <div className="pb-4 border-b border-[#262626] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Funcionario Auditor
                  </label>
                  <select
                    value={selectedAuditorId}
                    onChange={(e) => setSelectedAuditorId(e.target.value)}
                    className="w-full sm:max-w-md h-9 bg-[#000000] border border-[#262626] rounded-xl px-3 text-xs font-semibold text-white focus:outline-none focus:border-white"
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
                      className="h-9 px-3 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 hover:text-white border border-[#262626] text-xs font-semibold flex items-center gap-1.5 transition-all"
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
                      className="h-9 px-3.5 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] text-white border border-[#333333] text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={submitting || !selectedAuditorId}
                    onClick={handleGuardarRuta}
                    className="h-9 px-4 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar Ruta
                  </button>
                </div>
              </div>

              {/* Tabla de Salones con filtros en cada columna */}
              <div className="overflow-x-auto max-h-[410px] overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="sticky top-0 bg-[#0A0A0A] z-10 shadow-sm">
                    <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="py-2 px-2.5 w-24 text-center">
                        <button
                          type="button"
                          onClick={handleToggleTodosFiltrados}
                          title="Seleccionar o deseleccionar salones visibles"
                          className="inline-flex items-center justify-center gap-1.5 hover:text-white transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              todosFiltradosMarcados
                                ? 'bg-white border-white text-[#000000]'
                                : 'bg-[#000000] border-[#525252]'
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
                    <tr className="border-b border-[#262626] bg-[#050505]">
                      {/* Filtro Columna RUTA */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaCheck}
                          onChange={(e) => setFiltroRutaCheck(e.target.value)}
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-1 text-[11px] font-normal text-white focus:outline-none"
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
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white focus:outline-none"
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
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </th>

                      {/* Filtro Columna ALUMNOS */}
                      <th className="py-1.5 px-2">
                        <input
                          type="text"
                          value={filtroRutaAlumnos}
                          onChange={(e) => setFiltroRutaAlumnos(e.target.value)}
                          placeholder="Cant..."
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-center text-[11px] font-normal text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </th>

                      {/* Filtro Columna ESTADO ACTUAL */}
                      <th className="py-1.5 px-2">
                        <select
                          value={filtroRutaEstado}
                          onChange={(e) => setFiltroRutaEstado(e.target.value)}
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white focus:outline-none"
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
                          className="w-full h-7 bg-[#000000] border border-[#262626] focus:border-white rounded-lg px-2 text-[11px] font-normal text-white focus:outline-none"
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
                  <tbody className="divide-y divide-[#1F1F1F] text-xs">
                    {salonesFiltrados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-neutral-500 text-xs"
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
                                ? 'opacity-45 cursor-not-allowed'
                                : isChecked
                                ? 'bg-[#171717] cursor-pointer'
                                : 'hover:bg-[#121212] cursor-pointer'
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
                                className={`w-5 h-5 mx-auto rounded-md flex items-center justify-center border-2 transition-all ${
                                  isCompleted
                                    ? 'bg-[#0A0A0A] border-[#262626] cursor-not-allowed'
                                    : isChecked
                                    ? 'bg-white border-white text-[#000000] shadow-sm'
                                    : 'bg-[#000000] border-[#525252] hover:border-white'
                                }`}
                              >
                                {isChecked && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-2.5 text-neutral-300 font-medium">
                              {salon.sede}
                            </td>
                            <td className="py-2.5 px-2.5 font-bold text-white">
                              {formatGrado(salon.grado)} — Grupo {salon.grupo}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-neutral-300">
                              {salon.total_estudiantes}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  salon.estado === 'EN_AUDITORIA'
                                    ? 'bg-white text-[#000000]'
                                    : salon.estado === 'ASIGNADO'
                                    ? 'bg-[#1F1F1F] text-white border border-[#404040]'
                                    : salon.estado === 'COMPLETADO'
                                    ? 'bg-[#121212] text-neutral-500 border border-[#262626]'
                                    : 'bg-[#000000] text-neutral-400 border border-[#262626]'
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
                            <td className="py-2.5 px-2.5 text-neutral-300">
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
          ) : (
            /* Pestaña 3: Envío Masivo WhatsApp */
            <div className="space-y-5">
              {/* Tarjeta de Encabezado y Acciones Masivas */}
              <div className="p-4 rounded-2xl bg-[#000000] border border-[#262626] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-white" />
                      Envío Masivo de Rutas por WhatsApp
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Distribuye las rutas del día a todos los auditores. El código de país (+57) se añade de forma automática.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopiarConsolidado}
                      disabled={auditoresConRuta.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#000000] text-xs font-bold hover:bg-neutral-200 disabled:opacity-40 transition-all shadow-sm"
                    >
                      {copiadoConsolidado ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ¡Consolidado Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Todo para Grupo
                        </>
                      )}
                    </button>

                    {siguientePendiente && (
                      <button
                        type="button"
                        onClick={handleAbrirSiguiente}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-white border border-[#3A3A3A] hover:bg-[#252525] text-xs font-bold transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Siguiente ({siguientePendiente.funcionario.nombre.split(' ')[0]})
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas del Envío */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#1C1C1C]">
                  <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F]">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">
                      Auditores con Ruta
                    </span>
                    <span className="text-white font-mono font-bold text-base">
                      {auditoresConRuta.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F]">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">
                      Salones Asignados
                    </span>
                    <span className="text-white font-mono font-bold text-base">
                      {totalSalonesDistribuidos}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F]">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">
                      Con WhatsApp
                    </span>
                    <span className="text-white font-mono font-bold text-base">
                      {conTelefonoCount} / {auditoresConRuta.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F]">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">
                      Chats Abiertos
                    </span>
                    <span className="text-white font-mono font-bold text-base">
                      {enviadosCount} / {auditoresConRuta.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabla de Auditores y Acciones 1 a 1 */}
              <div className="overflow-x-auto rounded-xl border border-[#262626]">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#0A0A0A] border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="py-2.5 px-3 w-28">Estado</th>
                      <th className="py-2.5 px-3">Auditor</th>
                      <th className="py-2.5 px-3">PIN</th>
                      <th className="py-2.5 px-3">WhatsApp (+57)</th>
                      <th className="py-2.5 px-3">Ruta Asignada</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C] text-xs">
                    {auditoresConRuta.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-neutral-500 text-xs"
                        >
                          Aún no hay auditores con salones asignados en su ruta.
                          <br />
                          Ve a la pestaña &ldquo;2. Asignar Ruta&rdquo; para pre-asignar salones.
                        </td>
                      </tr>
                    ) : (
                      auditoresConRuta.map(({ funcionario, salones: salonesAud }) => {
                        const estaEnviado = !!enviadosWa[funcionario.id];
                        const enlaceWa = generarEnlaceWhatsAppRuta(funcionario, salonesAud);
                        const textoMensaje = generarTextoWhatsAppRuta(funcionario, salonesAud);
                        const tieneTel = !!normalizarTelefonoColombia(funcionario.telefono);

                        return (
                          <tr
                            key={funcionario.id}
                            className={`transition-colors ${
                              estaEnviado ? 'bg-[#0E0E0E]' : 'hover:bg-[#121212]'
                            }`}
                          >
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => toggleEnviado(funcionario.id)}
                                title="Alternar estado de envío"
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                  estaEnviado
                                    ? 'bg-white text-[#000000]'
                                    : 'bg-[#1A1A1A] text-neutral-400 border border-[#333333]'
                                }`}
                              >
                                {estaEnviado && <Check className="w-3 h-3 stroke-[3]" />}
                                {estaEnviado ? 'Enviado' : 'Pendiente'}
                              </button>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-white block">
                                {funcionario.nombre}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                @{funcionario.usuario}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-white bg-[#141414] px-2 py-0.5 rounded border border-[#2B2B2B]">
                                {funcionario.pin_acceso}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {funcionario.telefono ? (
                                <span className="font-mono text-neutral-300 text-[11px] block">
                                  {formatTelefonoVisual(funcionario.telefono)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-500 italic">
                                  Sin número (+57 pendiente)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 max-w-xs">
                              <span className="text-neutral-300 block font-semibold text-[11px]">
                                {salonesAud.length} salón{salonesAud.length === 1 ? '' : 'es'}
                              </span>
                              <span className="text-[10px] text-neutral-500 line-clamp-1">
                                {salonesAud.map((s) => `${formatGrado(s.grado)}${s.grupo}`).join(', ')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopiarIndividual(funcionario.id, textoMensaje)
                                }
                                title="Copiar texto de este auditor al portapapeles"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#171717] hover:bg-[#222222] text-neutral-300 border border-[#2B2B2B] text-[11px] transition-all"
                              >
                                {copiadoIndividualId === funcionario.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-white" />
                                    <span>¡Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={enlaceWa}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => marcarComoEnviado(funcionario.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shadow-sm ${
                                  tieneTel
                                    ? 'bg-white text-[#000000] hover:bg-neutral-200'
                                    : 'bg-[#1F1F1F] text-neutral-400 border border-[#333333] hover:text-white'
                                }`}
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{tieneTel ? 'WhatsApp' : 'Abrir WA'}</span>
                              </a>
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
