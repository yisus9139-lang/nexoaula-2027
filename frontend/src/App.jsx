import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Upload,
  Download,
  CheckCircle2,
  Users,
  AlertCircle,
  LogOut,
  Route,
  Lock,
  SlidersHorizontal,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bell,
  MessageCircle,
  Check,
  X,
  Hand,
  Play,
  MoreVertical,
  DoorOpen,
  Sun,
  Moon,
} from 'lucide-react';
import KpiAndCharts from './components/KpiAndCharts';
import StudentAuditRow from './components/StudentAuditRow';
import StudentAuditMobileCard from './components/StudentAuditMobileCard';
import ClassroomMapGrid, { formatGrado } from './components/ClassroomMapGrid';
import ClassroomSemaphoreBanner from './components/ClassroomSemaphoreBanner';
import FloatingDock from './components/FloatingDock';
import UploadExcelModal from './components/UploadExcelModal';
import UxCopyGuideModal from './components/UxCopyGuideModal';
import LoginModal from './components/LoginModal';
import ConfirmCloseClassroomModal from './components/ConfirmCloseClassroomModal';
import UsersAdminModal from './components/UsersAdminModal';
import CortesModal from './components/CortesModal';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : '');

const buildAuthHeaders = (user, extra = {}) => {
  const headers = { ...extra };
  if (user?.id) {
    headers['X-Usuario-Id'] = String(user.id);
  }
  if (user?.session_token) {
    headers['X-Session-Token'] = String(user.session_token);
  }
  return headers;
};

const formatNombreCorteCorto = (nombre = '') => {
  const partes = nombre.split(' - ');
  return partes[0]?.trim() || nombre;
};

const formatNombreUsuarioCorto = (nombre = '') => {
  if (!nombre) return 'Usuario';
  if (nombre.toLowerCase().includes('coordinaci')) return 'Coordinación';
  const partes = nombre.trim().split(/\s+/);
  return partes.slice(0, 2).join(' ');
};

// Sonido sutil generado por Web Audio API para notificaciones en vivo
function playSubtleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Silencioso si el navegador bloquea autoplay de audio
  }
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('nexoaula_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const metaTheme = document.getElementById('theme-color-meta');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#000000' : '#FFFFFF');
    }
    try {
      localStorage.setItem('nexoaula_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexoaula_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [usuariosList, setUsuariosList] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Cortes de Auditoría (Periodos)
  const [cortes, setCortes] = useState([]);
  const [corteSeleccionadoId, setCorteSeleccionadoId] = useState(null);
  const [isCortesModalOpen, setIsCortesModalOpen] = useState(false);

  // Estados de datos principales
  const [estudiantes, setEstudiantes] = useState([]);
  const [stats, setStats] = useState(null);
  const [filtrosCatalogo, setFiltrosCatalogo] = useState({
    sedes: [],
    grados: [],
    grupos: [],
    jerarquia: {},
  });
  const [salones, setSalones] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);

  // Modal / Banner de confirmación WhatsApp al solicitar o aprobar salón
  const [solicitudEnviadaInfo, setSolicitudEnviadaInfo] = useState(null);
  const [aprobacionCoordinadorInfo, setAprobacionCoordinadorInfo] = useState(null);
  const [avisoSalonHabilitadoAuditor, setAvisoSalonHabilitadoAuditor] = useState(null);

  // Refs para detectar nuevas solicitudes (ADMIN) y aprobaciones en vivo (AUDITOR)
  const prevSolicitudesKeysRef = useRef(new Set());
  const misSalonesSolicitadosRef = useRef(new Set());

  // Filtros en cascada
  const [sede, setSede] = useState('');
  const [grado, setGrado] = useState('');
  const [grupo, setGrupo] = useState('');
  const [buscar, setBuscar] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);

  // Control de Secciones y Plegado
  const [vistaSeccion, setVistaSeccion] = useState('todas'); // 'todas' | 'resumen' | 'salones' | 'lista'
  const [seccionResumenAbierta, setSeccionResumenAbierta] = useState(true);
  const [seccionSalonesAbierta, setSeccionSalonesAbierta] = useState(true);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState(null);
  const [salonActionLoading, setSalonActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUxGuideOpen, setIsUxGuideOpen] = useState(false);
  const [isUsersAdminOpen, setIsUsersAdminOpen] = useState(false);
  const [salonPorCerrar, setSalonPorCerrar] = useState(null);
  const [toast, setToast] = useState(null);
  const [apiError, setApiError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchUsuarios = useCallback(async () => {
    try {
      const headers = buildAuthHeaders(currentUser);
      const res = await fetch(`${API_BASE}/usuarios`, { headers });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('nexoaula_user');
        setCurrentUser(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsuariosList(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silencioso
    }
  }, [currentUser]);

  const fetchCortes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cortes`);
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        setCortes(lista);
        setCorteSeleccionadoId((prev) => {
          if (prev && lista.some((c) => c.id === prev)) return prev;
          const activo = lista.find((c) => c.activo) || lista[0];
          return activo ? activo.id : null;
        });
      }
    } catch {
      // Silencioso
    }
  }, []);

  const fetchSolicitudesPendientes = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (corteSeleccionadoId) q.append('corte_id', corteSeleccionadoId);
      const res = await fetch(`${API_BASE}/salones/solicitudes-pendientes?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSolicitudesPendientes(data);

        // Si soy ADMIN, detectar si llegó una nueva solicitud para sonar campana sutil
        if (currentUser?.rol === 'ADMIN') {
          const currentKeys = new Set(
            data.map((s) => `${s.sede}|${s.grado}|${s.grupo}|${s.solicitado_por_id}`)
          );
          let hasNew = false;
          currentKeys.forEach((k) => {
            if (!prevSolicitudesKeysRef.current.has(k)) {
              hasNew = true;
            }
          });
          if (hasNew && prevSolicitudesKeysRef.current.size >= 0 && data.length > 0) {
            playSubtleChime();
          }
          prevSolicitudesKeysRef.current = currentKeys;
        }
      }
    } catch {
      // Silencioso
    }
  }, [corteSeleccionadoId, currentUser?.rol]);

  const fetchDatos = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setApiError('');
      try {
        const query = new URLSearchParams();
        if (corteSeleccionadoId) query.append('corte_id', corteSeleccionadoId);
        if (currentUser?.id) query.append('funcionario_id', currentUser.id);
        if (sede) query.append('sede', sede);
        if (grado) query.append('grado', grado);
        if (grupo) query.append('grupo', grupo);
        if (buscar.trim()) {
          query.append('busqueda', buscar.trim());
        }

        const salonesQuery = new URLSearchParams();
        if (corteSeleccionadoId) salonesQuery.append('corte_id', corteSeleccionadoId);

        const reqHeaders = buildAuthHeaders(currentUser);

        const [resEst, resStats, resSalones] = await Promise.all([
          fetch(`${API_BASE}/estudiantes?${query.toString()}`, {
            headers: reqHeaders,
          }),
          fetch(`${API_BASE}/estadisticas?${query.toString()}`, {
            headers: reqHeaders,
          }),
          fetch(`${API_BASE}/salones?${salonesQuery.toString()}`),
        ]);

        if (resEst.status === 401 || resStats.status === 401 || resEst.status === 403) {
          localStorage.removeItem('nexoaula_user');
          setCurrentUser(null);
          return;
        }

        if (!resEst.ok || !resStats.ok || !resSalones.ok) {
          let errDetail = '';
          try {
            const badRes = !resEst.ok ? resEst : !resStats.ok ? resStats : resSalones;
            const errJson = await badRes.json();
            errDetail = errJson.detail || '';
          } catch {
            // fallback
          }
          const isLocal =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1');
          throw new Error(
            errDetail ||
              (isLocal
                ? 'No pudimos conectar con el servidor local. Verifica que el backend esté ejecutándose en el puerto 8000.'
                : 'No pudimos sincronizar con el servidor en la nube. Verifica tu conexión e intenta de nuevo.')
          );
        }

        const [dataEst, dataStats, dataSalones] = await Promise.all([
          resEst.json(),
          resStats.json(),
          resSalones.json(),
        ]);

        const safeEstudiantes = Array.isArray(dataEst) ? dataEst : [];
        const safeSalones = Array.isArray(dataSalones) ? dataSalones : [];
        const safeStats = dataStats && typeof dataStats === 'object' ? dataStats : null;

        // Detectar si un salón que este AUDITOR había solicitado acaba de ser aprobado
        if (currentUser && currentUser.rol === 'AUDITOR') {
          const solicitadosAhora = new Set();
          safeSalones.forEach((s) => {
            const key = `${s.sede}|${s.grado}|${s.grupo}`;
            if (
              s.estado === 'SOLICITADO' &&
              s.solicitado_por_id === currentUser.id
            ) {
              solicitadosAhora.add(key);
            } else if (
              misSalonesSolicitadosRef.current.has(key) &&
              s.funcionario_id === currentUser.id &&
              (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
            ) {
              const msg = `¡Listo! El coordinador te habilitó ${formatGrado(s.grado)} ${s.grupo}. Ya aparece en Mi Ruta para que llames asistencia.`;
              playSubtleChime();
              setAvisoSalonHabilitadoAuditor({
                salon: s,
                mensaje: msg,
              });
              showToast(msg);
            }
          });
          misSalonesSolicitadosRef.current = solicitadosAhora;
        }

        setEstudiantes(safeEstudiantes);
        setStats(safeStats);
        setSalones(safeSalones);

        // Si es AUDITOR, los filtros de 03. Llamado a Lista solo muestran sus salones de MI RUTA
        const salonesParaFiltros =
          currentUser?.rol === 'AUDITOR'
            ? safeSalones.filter((s) => s.funcionario_id === currentUser.id)
            : safeSalones;

        const sedesSet = new Set();
        const gradosSet = new Set();
        const gruposSet = new Set();
        const jerarquia = {};

        salonesParaFiltros.forEach((s) => {
          sedesSet.add(s.sede);
          gradosSet.add(s.grado);
          gruposSet.add(s.grupo);
          if (!jerarquia[s.sede]) jerarquia[s.sede] = {};
          if (!jerarquia[s.sede][s.grado]) jerarquia[s.sede][s.grado] = [];
          if (!jerarquia[s.sede][s.grado].includes(s.grupo)) {
            jerarquia[s.sede][s.grado].push(s.grupo);
          }
        });

        setFiltrosCatalogo({
          sedes: Array.from(sedesSet),
          grados: Array.from(gradosSet),
          grupos: Array.from(gruposSet),
          jerarquia,
        });
      } catch (err) {
        setApiError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [corteSeleccionadoId, currentUser, sede, grado, grupo, buscar, showToast]
  );

  useEffect(() => {
    fetchUsuarios();
    fetchCortes();
  }, [fetchUsuarios, fetchCortes]);

  useEffect(() => {
    fetchDatos();
    fetchSolicitudesPendientes();
  }, [fetchDatos, fetchSolicitudesPendientes]);

  // Polling en Tiempo Real cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDatos(true);
      fetchSolicitudesPendientes();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDatos, fetchSolicitudesPendientes]);

  const gradosDisponibles =
    sede && filtrosCatalogo.jerarquia?.[sede]
      ? Object.keys(filtrosCatalogo.jerarquia[sede])
      : filtrosCatalogo.grados;

  const gruposDisponibles =
    sede && grado && filtrosCatalogo.jerarquia?.[sede]?.[grado]
      ? filtrosCatalogo.jerarquia[sede][grado]
      : filtrosCatalogo.grupos;

  const handleSedeChange = (nuevaSede) => {
    setSede(nuevaSede);
    setGrado('');
    setGrupo('');
  };

  const handleGradoChange = (nuevoGrado) => {
    setGrado(nuevoGrado);
    setGrupo('');
  };

  const handleLimpiarFiltros = () => {
    setSede('');
    setGrado('');
    setGrupo('');
    setBuscar('');
    setSoloPendientes(false);
  };

  const handleSelectSalon = (salon) => {
    setSede(salon.sede);
    setGrado(salon.grado);
    setGrupo(salon.grupo);
  };

  const handleReclamarSalon = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/tomar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          funcionario_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No fue posible tomar este salón.');
      }
      setSede(salon.sede);
      setGrado(salon.grado);
      setGrupo(salon.grupo);
      showToast(`Salón ${formatGrado(salon.grado)} ${salon.grupo} en curso`);
      await fetchDatos(true);
      await fetchUsuarios();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  // AUDITOR solicita un salón libre adicional
  const handleSolicitarSalon = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(currentUser.id),
        },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          funcionario_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo enviar la solicitud.');
      }

      const key = `${salon.sede}|${salon.grado}|${salon.grupo}`;
      misSalonesSolicitadosRef.current.add(key);

      setSolicitudEnviadaInfo({
        salon,
        mensaje:
          data.mensaje ||
          '¡Solicitud enviada a la app! Toca abajo para avisarle también al WhatsApp del coordinador y que te lo habilite de una vez.',
        whatsapp_url: data.whatsapp_url,
        whatsapp_mensaje: data.whatsapp_mensaje,
        telefono_coordinador: data.telefono_coordinador,
      });

      await fetchDatos(true);
      await fetchSolicitudesPendientes();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  // ADMIN aprueba en 1 clic la solicitud de un salón
  const handleAprobarSolicitud = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/aprobar-solicitud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(currentUser.id),
        },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          admin_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo habilitar el salón.');
      }

      setAprobacionCoordinadorInfo({
        auditorNombre: data.auditor_nombre,
        salon,
        whatsappUrl: data.whatsapp_url,
        mensaje: data.mensaje,
      });
      showToast(data.mensaje);
      await fetchDatos(true);
      await fetchSolicitudesPendientes();
      await fetchUsuarios();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  // ADMIN rechaza la solicitud de un salón
  const handleRechazarSolicitud = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/rechazar-solicitud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(currentUser.id),
        },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          admin_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo rechazar la solicitud.');
      }
      showToast(data.mensaje);
      await fetchDatos(true);
      await fetchSolicitudesPendientes();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  const handleConfirmCerrarSalon = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          funcionario_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo cerrar el salón.');
      }
      setSalonPorCerrar(null);
      showToast(`Salón ${formatGrado(salon.grado)} ${salon.grupo} cerrado`);
      await fetchDatos(true);
      await fetchUsuarios();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  const handleLiberarSalon = async (salon) => {
    if (!currentUser) return;
    setSalonActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/salones/liberar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corte_id: corteSeleccionadoId,
          sede: salon.sede,
          grado: salon.grado,
          grupo: salon.grupo,
          admin_id: currentUser.id,
          funcionario_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'No se pudo liberar el salón.');
      }
      showToast(`Salón ${formatGrado(salon.grado)} ${salon.grupo} liberado`);
      await fetchDatos(true);
      await fetchUsuarios();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSalonActionLoading(false);
    }
  };

  const handleLogin = async ({ pin_acceso }) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_acceso }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.detail ||
            'No reconocemos ese PIN. Revisa los 4 números o pídele tu código al coordinador.'
        );
      }
      setCurrentUser(data);
      localStorage.setItem('nexoaula_user', JSON.stringify(data));
      handleLimpiarFiltros();
      showToast(`Hola, ${formatNombreUsuarioCorto(data.nombre)}`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRecoverAdminPin = async ({ llave_maestra, nuevo_pin }) => {
    const res = await fetch(`${API_BASE}/auth/recuperar-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llave_maestra, nuevo_pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.detail ||
          'Esa llave de respaldo no es correcta. Verifica el código con Rectoría o Sistemas.'
      );
    }
    setCurrentUser(data.usuario);
    localStorage.setItem('nexoaula_user', JSON.stringify(data.usuario));
    showToast(data.mensaje);
    await fetchUsuarios();
    await fetchDatos(true);
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem('nexoaula_user');
    setCurrentUser(null);
    handleLimpiarFiltros();
  };

  const handleCreateUsuario = async (payload) => {
    const res = await fetch(`${API_BASE}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(currentUser.id),
      },
      body: JSON.stringify({ ...payload, admin_id: currentUser.id }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      // Fallback si la respuesta no es JSON
    }
    if (!res.ok) throw new Error(data.detail || `Error al crear el perfil (${res.status}).`);
    await fetchUsuarios();
    return data;
  };

  const handleUpdateUsuario = async (usuarioId, payload) => {
    const res = await fetch(`${API_BASE}/usuarios/${usuarioId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(currentUser.id),
      },
      body: JSON.stringify({ ...payload, admin_id: currentUser.id }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      // Fallback si la respuesta no es JSON
    }
    if (!res.ok)
      throw new Error(data.detail || `Error al actualizar el funcionario (${res.status}).`);
    await fetchUsuarios();
    return data;
  };

  const handleDeleteUsuario = async (usuarioId) => {
    const res = await fetch(
      `${API_BASE}/usuarios/${usuarioId}?admin_id=${currentUser.id}`,
      {
        method: 'DELETE',
        headers: { 'X-Usuario-Id': String(currentUser.id) },
      }
    );
    let data = {};
    try {
      data = await res.json();
    } catch {
      // Fallback si la respuesta no es JSON
    }
    if (!res.ok)
      throw new Error(data.detail || `No se pudo eliminar el perfil (${res.status}).`);
    await fetchUsuarios();
    await fetchDatos(true);
    return data;
  };

  const handlePreasignarSalones = async ({ funcionario_id, salones: lista }) => {
    const res = await fetch(`${API_BASE}/salones/preasignar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(currentUser.id),
      },
      body: JSON.stringify({
        corte_id: corteSeleccionadoId,
        funcionario_id,
        salones: lista,
        admin_id: currentUser.id,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || 'Error al guardar la ruta de salones.');
    await fetchDatos(true);
    await fetchUsuarios();
    return data;
  };

  const handleCrearCorte = async (payload) => {
    const res = await fetch(`${API_BASE}/cortes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(currentUser.id),
      },
      body: JSON.stringify({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        fecha_inicio: payload.fecha_inicio,
        pre_cargar_respuestas_anteriores: Boolean(
          payload.copiar_respuestas_anteriores
        ),
        mantener_rutas_asignadas: Boolean(payload.copiar_rutas_salones),
        admin_id: currentUser.id,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.detail || 'No se pudo crear el nuevo corte.');
    await fetchCortes();
    const nuevoId = data.corte?.id ?? data.id;
    if (nuevoId) setCorteSeleccionadoId(nuevoId);
    showToast(data.mensaje || 'Nuevo corte activado');
    await fetchDatos(true);
    return data;
  };

  const handleActivarCorte = async (corteId) => {
    try {
      const res = await fetch(
        `${API_BASE}/cortes/${corteId}/activar?admin_id=${currentUser.id}`,
        {
          method: 'PUT',
          headers: { 'X-Usuario-Id': String(currentUser.id) },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al activar corte.');
      await fetchCortes();
      setCorteSeleccionadoId(corteId);
      showToast(data.mensaje || 'Corte activado');
      await fetchDatos(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCerrarCorte = async (corteId) => {
    try {
      const res = await fetch(
        `${API_BASE}/cortes/${corteId}/cerrar?admin_id=${currentUser.id}`,
        {
          method: 'PUT',
          headers: { 'X-Usuario-Id': String(currentUser.id) },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al cerrar corte.');
      await fetchCortes();
      showToast(data.mensaje || 'Corte cerrado');
      await fetchDatos(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateAuditoria = async (estudianteId, payload) => {
    setSavingRowId(estudianteId);
    try {
      const res = await fetch(`${API_BASE}/auditoria/${estudianteId}`, {
        method: 'PUT',
        headers: buildAuthHeaders(currentUser, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          ...payload,
          corte_id: corteSeleccionadoId,
          funcionario_id: currentUser?.id ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al guardar auditoría');
      }

      setEstudiantes((prev) =>
        prev.map((est) =>
          est.id === estudianteId ? { ...est, ...data, auditoria: data } : est
        )
      );

      await fetchDatos(true);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingRowId(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      if (corteSeleccionadoId) query.append('corte_id', corteSeleccionadoId);
      if (currentUser?.id) query.append('funcionario_id', currentUser.id);
      if (sede) query.append('sede', sede);
      if (grado) query.append('grado', grado);
      if (grupo) query.append('grupo', grupo);

      const res = await fetch(`${API_BASE}/exportar-reporte?${query.toString()}`, {
        headers: buildAuthHeaders(currentUser),
      });
      if (!res.ok) throw new Error('No se pudo generar el archivo Excel.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefijo =
        currentUser?.rol === 'AUDITOR' ? 'Mi_Ruta_Auditoria_2027' : 'Auditoria_2027';
      a.download = `${prefijo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast(
        currentUser?.rol === 'AUDITOR'
          ? 'Excel de Mi Ruta descargado'
          : 'Excel descargado'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const salonActualBase =
    sede && grado && grupo
      ? salones.find(
          (s) => s.sede === sede && s.grado === grado && s.grupo === grupo
        )
      : null;

  const estudiantesDelSalonActual =
    sede && grado && grupo
      ? estudiantes.filter(
          (e) => e.sede === sede && e.grado === grado && e.grupo === grupo
        )
      : [];

  const auditadosEnSalonActual = estudiantesDelSalonActual.filter((e) => {
    const st = e.auditoria?.estado_auditoria ?? e.estado_auditoria;
    return st === 'AUDITADO' || st === 'COMPLETO';
  }).length;

  const salonActual = salonActualBase
    ? {
        ...salonActualBase,
        auditados:
          estudiantesDelSalonActual.length > 0
            ? Math.max(salonActualBase.auditados ?? 0, auditadosEnSalonActual)
            : salonActualBase.auditados ?? 0,
        total_estudiantes:
          salonActualBase.total_estudiantes || estudiantesDelSalonActual.length,
      }
    : null;

  const salonPorCerrarVivo = salonPorCerrar
    ? (() => {
        const encontrado = salones.find(
          (s) =>
            s.sede === salonPorCerrar.sede &&
            s.grado === salonPorCerrar.grado &&
            s.grupo === salonPorCerrar.grupo
        );
        const base = encontrado || salonPorCerrar;
        const estsSalon = estudiantes.filter(
          (e) =>
            e.sede === base.sede &&
            e.grado === base.grado &&
            e.grupo === base.grupo
        );
        const audsCount = estsSalon.filter((e) => {
          const st = e.auditoria?.estado_auditoria ?? e.estado_auditoria;
          return st === 'AUDITADO' || st === 'COMPLETO';
        }).length;
        const totalEst = base.total_estudiantes || estsSalon.length || 0;
        const auditadosFinal =
          estsSalon.length > 0
            ? Math.max(base.auditados ?? 0, audsCount)
            : base.auditados ?? 0;
        return {
          ...base,
          total_estudiantes: totalEst,
          auditados: auditadosFinal,
          pendientes: Math.max(totalEst - auditadosFinal, 0),
        };
      })()
    : null;

  const corteActualObj =
    cortes.find((c) => c.id === corteSeleccionadoId) || null;
  const isCorteCerrado = Boolean(corteActualObj?.cerrado);

  const isAdmin = currentUser?.rol === 'ADMIN';
  const adminPrincipal =
    usuariosList.find((u) => u.rol === 'ADMIN') || null;
  const telefonoCoordinador = adminPrincipal?.telefono || '573001002027';

  const isReadOnlySalon =
    isCorteCerrado ||
    (salonActual
      ? salonActual.estado === 'COMPLETADO' ||
        (salonActual.estado === 'ASIGNADO' &&
          salonActual.funcionario_id !== currentUser?.id &&
          !isAdmin) ||
        (salonActual.estado === 'EN_AUDITORIA' &&
          salonActual.funcionario_id !== currentUser?.id &&
          !isAdmin)
      : false);

  const misSalonesRuta = salones.filter(
    (s) =>
      currentUser &&
      s.funcionario_id === currentUser.id &&
      (s.estado === 'ASIGNADO' || s.estado === 'EN_AUDITORIA')
  );

  // Verificar si el auditor aún tiene salones de MI RUTA con estudiantes pendientes
  const tieneRutaPendiente =
    !isAdmin &&
    misSalonesRuta.some(
      (s) => (s.pendientes ?? s.total_estudiantes - (s.auditados ?? 0)) > 0
    );

  const estudiantesMostrados = soloPendientes
    ? estudiantes.filter((e) => {
        const st = e.auditoria?.estado_auditoria ?? e.estado_auditoria;
        return st !== 'AUDITADO' && st !== 'COMPLETO';
      })
    : estudiantes;

  // Para AUDITOR, los contadores de 03. Llamado a Lista reflejan estrictamente sus salones de MI RUTA
  const totalAuditados = isAdmin
    ? stats?.cobertura?.auditados ?? stats?.auditados_completos ?? 0
    : estudiantes.filter((e) => {
        const st = e.auditoria?.estado_auditoria ?? e.estado_auditoria;
        return st === 'AUDITADO' || st === 'COMPLETO';
      }).length;

  const totalPendientes = isAdmin
    ? stats?.cobertura?.pendientes ?? stats?.pendientes_auditoria ?? 0
    : Math.max(estudiantes.length - totalAuditados, 0);

  const libresCount = salones.filter((s) => s.estado === 'DISPONIBLE').length;
  const solicitadosCount = salones.filter((s) => s.estado === 'SOLICITADO').length;
  const asignadosCount = salones.filter((s) => s.estado === 'ASIGNADO').length;
  const enCursoCount = salones.filter((s) => s.estado === 'EN_AUDITORIA').length;
  const cerradosCount = salones.filter((s) => s.estado === 'COMPLETADO').length;

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-24">
      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md bg-[#0A0A0A]/95 border-white/40 text-white">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-white" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* BARRA SUPERIOR CON JERARQUÍA VISUAL Y MENÚ DESPLEGABLE EN MÓVIL / TABLET */}
      <header className="sticky top-0 z-30 bg-[#000000]/95 backdrop-blur-md border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-3">
          {/* Izquierda: Marca + Selector de Periodo Compacto */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
              NexoAula<span className="hidden sm:inline"> 2027</span>
            </h1>

            {cortes.length > 0 && (
              <>
                <div className="h-4 w-[1px] bg-[#262626] hidden sm:block" />
                <div className="flex items-center gap-1">
                  <div className="flex items-center h-8 px-2 sm:px-2.5 rounded-lg bg-[#0A0A0A] border border-[#262626] hover:border-[#404040] transition-colors">
                    <select
                      value={corteSeleccionadoId || ''}
                      onChange={(e) =>
                        setCorteSeleccionadoId(Number(e.target.value))
                      }
                      aria-label="Seleccionar corte"
                      className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[100px] sm:max-w-none truncate"
                    >
                      {cortes.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="bg-[#0A0A0A] text-white"
                        >
                          {formatNombreCorteCorto(c.nombre)}
                          {c.activo ? ' • Activo' : c.cerrado ? ' • Histórico' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsCortesModalOpen(true)}
                      title="Configurar cortes y periodos"
                      className="hidden sm:flex w-8 h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#171717] text-neutral-400 hover:text-white border border-[#262626] items-center justify-center transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Derecha: En Desktop Barra Completa / En Móvil y Tablet Menú Compacto de 3 Puntos */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* VISTA ESCRITORIO (>= lg): Botones individuales con texto y jerarquía */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Campana de Notificaciones (ADMIN) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setVistaSeccion('salones');
                    setSeccionSalonesAbierta(true);
                  }}
                  title={
                    solicitudesPendientes.length > 0
                      ? `${solicitudesPendientes.length} solicitud(es) de salón pendiente(s)`
                      : 'Sin solicitudes pendientes'
                  }
                  className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                    solicitudesPendientes.length > 0
                      ? 'bg-white text-[#000000] border-white animate-pulse'
                      : 'bg-[#0A0A0A] hover:bg-[#171717] text-neutral-400 hover:text-white border-[#262626]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {solicitudesPendientes.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#000000] text-white border border-white text-[10px] font-extrabold flex items-center justify-center">
                      {solicitudesPendientes.length}
                    </span>
                  )}
                </button>
              )}

              {/* Guía UX */}
              <button
                type="button"
                onClick={() => setIsUxGuideOpen(true)}
                title="Guía de Diseño y UX"
                className="w-9 h-9 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-neutral-400 hover:text-white border border-[#262626] flex items-center justify-center transition-colors"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Importar Excel (ADMIN) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  title="Importar padrón Excel (.xlsx)"
                  className="w-9 h-9 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-neutral-300 hover:text-white border border-[#262626] flex items-center justify-center transition-colors"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}

              {/* Equipo (ADMIN) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsUsersAdminOpen(true)}
                  title="Gestionar equipo auditor y rutas"
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-[#121212] hover:bg-[#1F1F1F] text-white border border-[#262626] transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Equipo</span>
                </button>
              )}

              {/* Exportar */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                title={
                  isAdmin
                    ? 'Descargar reporte consolidado en Excel'
                    : 'Descargar Excel exclusivamente de los salones de Mi Ruta'
                }
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000] shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {exporting
                    ? '...'
                    : isAdmin
                    ? 'Exportar'
                    : 'Exportar Mi Ruta'}
                </span>
              </button>

              {/* Selector de Modo Claro / Modo Oscuro */}
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                aria-label={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="w-9 h-9 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-neutral-300 hover:text-white border border-[#262626] flex items-center justify-center transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-white" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-800" />
                )}
              </button>

              {/* Perfil Escritorio */}
              {currentUser && (
                <>
                  <div className="h-5 w-[1px] bg-[#262626] mx-0.5" />
                  <div className="flex items-center gap-1.5 pl-2 pr-1 h-9 rounded-xl bg-[#0A0A0A] border border-[#262626]">
                    <span className="w-5 h-5 rounded-md bg-[#1F1F1F] text-[10px] font-bold text-white flex items-center justify-center uppercase">
                      {currentUser.nombre?.charAt(0) || 'U'}
                    </span>
                    <span className="text-xs font-semibold text-neutral-200 max-w-[110px] truncate">
                      {formatNombreUsuarioCorto(currentUser.nombre)}
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Cerrar sesión / Cambiar PIN"
                      className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-[#171717] flex items-center justify-center transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* VISTA MÓVIL Y TABLET (< lg): Menú desplegable por botón de 3 puntos */}
            <div className="flex lg:hidden items-center gap-1.5">
              {/* Si hay solicitudes urgentes pendientes, mostrar la campana directamente */}
              {isAdmin && solicitudesPendientes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setVistaSeccion('salones');
                    setSeccionSalonesAbierta(true);
                  }}
                  title={`${solicitudesPendientes.length} solicitud(es) de salón`}
                  className="relative w-9 h-9 rounded-xl bg-white text-[#000000] border border-white flex items-center justify-center animate-pulse"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#000000] text-white text-[9px] font-extrabold flex items-center justify-center">
                    {solicitudesPendientes.length}
                  </span>
                </button>
              )}

              {/* Botón de 3 Puntos / Más Herramientas */}
              <div className="relative" ref={mobileMenuRef}>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  title="Menú de herramientas"
                  aria-label="Menú de herramientas"
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                    mobileMenuOpen
                      ? 'bg-white text-[#000000] border-white'
                      : 'bg-[#0A0A0A] hover:bg-[#171717] text-neutral-300 hover:text-white border-[#262626]'
                  }`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Menú Flotante Organizado en Lista */}
                {mobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0A0A0A] border border-[#262626] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-1.5 z-50 divide-y divide-[#1F1F1F] animate-fadeIn">
                    {/* Lista de Herramientas y Acciones */}
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleExportExcel();
                        }}
                        disabled={exporting}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-[#171717] transition-colors text-left"
                      >
                        <Download className="w-4 h-4 text-white shrink-0" />
                        <span>
                          {exporting
                            ? 'Generando Excel...'
                            : isAdmin
                            ? 'Exportar Padrón (Excel)'
                            : 'Exportar Mi Ruta (Excel)'}
                        </span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setIsUsersAdminOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-[#171717] transition-colors text-left"
                          >
                            <Users className="w-4 h-4 text-neutral-300 shrink-0" />
                            <span>Equipo Auditor y Rutas</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setIsUploadOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-[#171717] transition-colors text-left"
                          >
                            <Upload className="w-4 h-4 text-neutral-300 shrink-0" />
                            <span>Importar Padrón (.xlsx)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setIsCortesModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-[#171717] transition-colors text-left"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-neutral-300 shrink-0" />
                            <span>Gestionar Cortes y Periodos</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setIsUxGuideOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#171717] transition-colors text-left"
                      >
                        <BookOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span>Guía de Diseño y UX</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          toggleTheme();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-[#171717] transition-colors text-left"
                      >
                        {theme === 'dark' ? (
                          <>
                            <Sun className="w-4 h-4 text-white shrink-0" />
                            <span>Modo Claro</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-4 h-4 text-slate-800 shrink-0" />
                            <span>Modo Oscuro</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Fila de Usuario y Cerrar Sesión */}
                    {currentUser && (
                      <div className="p-1 pt-1.5 space-y-1">
                        <div className="px-3 py-1.5 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-white text-[#000000] text-xs font-extrabold flex items-center justify-center uppercase shrink-0">
                            {currentUser.nombre?.charAt(0) || 'U'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate">
                              {currentUser.nombre}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                              {currentUser.rol === 'ADMIN' ? 'Coordinador General' : 'Auditor'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#171717] transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>Cerrar Sesión / Cambiar PIN</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL DIVIDIDO EN 3 SECCIONES ESTRUCTURALES CLARAS */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
        {/* BANNER FLOTANTE SUPERIOR EN VIVO PARA EL COORDINADOR (ADMIN) */}
        {isAdmin && solicitudesPendientes.length > 0 && (
          <div className="space-y-2.5">
            {solicitudesPendientes.map((sol) => (
              <div
                key={`banner-${sol.sede}-${sol.grado}-${sol.grupo}`}
                className="p-4 rounded-2xl bg-[#0A0A0A] border-2 border-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white text-[#000000] font-bold flex items-center justify-center shrink-0 animate-pulse">
                    <Bell className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {sol.solicitado_por_nombre || 'Un auditor'} quiere apoyar con{' '}
                      <span className="underline">
                        {formatGrado(sol.grado)} {sol.grupo}
                      </span>{' '}
                      ({sol.sede}). ¿Le habilitas este salón en su ruta?
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Solicitud en tiempo real para agregar el grupo a Mi Ruta.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={salonActionLoading}
                    onClick={() => handleAprobarSolicitud(sol)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-extrabold flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Habilitar salón
                  </button>
                  <button
                    type="button"
                    disabled={salonActionLoading}
                    onClick={() => handleRechazarSolicitud(sol)}
                    className="px-3 py-2 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 border border-[#333333] text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Ahora no
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmación rápida al Coordinador tras habilitar un salón (Opción 1 clic a WhatsApp) */}
        {isAdmin && aprobacionCoordinadorInfo && (
          <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-white/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-white">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>
                <strong>{aprobacionCoordinadorInfo.mensaje}</strong> (Ya aparece en su ruta y en su llamado a lista).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {aprobacionCoordinadorInfo.whatsappUrl && (
                <a
                  href={aprobacionCoordinadorInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Avisarle por WhatsApp que ya quedó listo
                </a>
              )}
              <button
                type="button"
                onClick={() => setAprobacionCoordinadorInfo(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Aviso automático en vivo al Auditor cuando el Coordinador le aprueba el salón */}
        {!isAdmin && avisoSalonHabilitadoAuditor && (
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border-2 border-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-white">
                {avisoSalonHabilitadoAuditor.mensaje}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = avisoSalonHabilitadoAuditor.salon;
                  setAvisoSalonHabilitadoAuditor(null);
                  handleReclamarSalon(s);
                  setVistaSeccion('lista');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Iniciar llamado ahora
              </button>
              <button
                type="button"
                onClick={() => setAvisoSalonHabilitadoAuditor(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {apiError && (
          <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#404040] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs text-neutral-300">{apiError}</span>
            </div>
            <button
              onClick={() => fetchDatos()}
              className="px-3 py-1 rounded-lg bg-white text-[#000000] text-xs font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Aviso compacto de Corte Histórico Cerrado */}
        {isCorteCerrado && corteActualObj && (
          <div className="px-4 py-3 rounded-2xl bg-[#0A0A0A] border border-[#333333] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs text-neutral-300">
                <strong className="text-white">{corteActualObj.nombre}</strong> (Solo lectura)
              </span>
            </div>
            {cortes.some((c) => c.activo) && (
              <button
                type="button"
                onClick={() => {
                  const act = cortes.find((c) => c.activo);
                  if (act) setCorteSeleccionadoId(act.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-bold shrink-0"
              >
                Ir al corte activo
              </button>
            )}
          </div>
        )}

        {/* Ruta Asignada de Hoy */}
        {misSalonesRuta.length > 0 && (
          <div className="bg-[#0A0A0A] border border-[#333333] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Route className="w-4 h-4 text-white shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Mi Ruta
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {misSalonesRuta.map((s) => {
                const active =
                  sede === s.sede && grado === s.grado && grupo === s.grupo;
                return (
                  <button
                    key={`${s.sede}-${s.grado}-${s.grupo}`}
                    type="button"
                    onClick={() => handleSelectSalon(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? 'bg-white text-[#000000] border-white'
                        : 'bg-[#000000] text-neutral-200 border-[#333333] hover:border-white'
                    }`}
                  >
                    {formatGrado(s.grado)} {s.grupo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            SECCIÓN 01: RESUMEN EJECUTIVO Y PROYECCIÓN 2027
           ===================================================================== */}
        {(vistaSeccion === 'todas' || vistaSeccion === 'resumen') && (
          <section className="space-y-5">
            <div className="pb-3 border-b border-[#262626] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-white text-[#000000] font-mono text-[11px] sm:text-xs font-extrabold tracking-wider">
                  01
                </span>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  {isAdmin
                    ? 'Centro de Control y Bitácora en Tiempo Real'
                    : 'Mi Avance de Ruta y Resumen Personal'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#141414] border border-[#262626] text-[10px] font-bold uppercase text-neutral-300">
                  {isAdmin ? 'Coordinación Global' : 'Exclusivo Mi Ruta'}
                </span>
              </div>

              {vistaSeccion === 'todas' && (
                <button
                  type="button"
                  onClick={() => setSeccionResumenAbierta(!seccionResumenAbierta)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-xs font-semibold text-neutral-300 hover:text-white border border-[#262626] transition-colors"
                >
                  <span>{seccionResumenAbierta ? 'Ocultar' : 'Mostrar'}</span>
                  {seccionResumenAbierta ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {(seccionResumenAbierta || vistaSeccion === 'resumen') && (
              <KpiAndCharts
                stats={stats}
                loading={loading}
                currentUser={currentUser}
                onSelectSalon={(s) => {
                  handleSelectSalon(s);
                  setVistaSeccion('lista');
                }}
              />
            )}
          </section>
        )}

        {/* =====================================================================
            SECCIÓN 02: MAPA DE SALONES EN VIVO
           ===================================================================== */}
        {(vistaSeccion === 'todas' || vistaSeccion === 'salones') && (
          <section className="space-y-5">
            <div className="pb-3 border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-white text-[#000000] font-mono text-[11px] sm:text-xs font-extrabold tracking-wider">
                  02
                </span>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  Mapa de Salones
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0A0A] text-white border border-[#262626] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Libres
                  </span>
                  {solicitadosCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-[#000000] border border-white font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#000000] animate-ping" />
                      Solicitados
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0A0A] text-neutral-300 border border-[#262626] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    Asignados
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171717] text-white border border-white/40 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En curso
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0A0A] text-neutral-400 border border-[#262626] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    Cerrados
                  </span>
                </div>

                {vistaSeccion === 'todas' && (
                  <button
                    type="button"
                    onClick={() => setSeccionSalonesAbierta(!seccionSalonesAbierta)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-xs font-semibold text-neutral-300 hover:text-white border border-[#262626] transition-colors"
                  >
                    <span>{seccionSalonesAbierta ? 'Ocultar' : 'Mostrar'}</span>
                    {seccionSalonesAbierta ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {(seccionSalonesAbierta || vistaSeccion === 'salones') && (
              salones.length === 0 ? (
                <div className="py-10 px-4 text-center border border-dashed border-[#262626] rounded-2xl bg-[#0A0A0A]">
                  <DoorOpen className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">
                    Aún no hay salones registrados en este corte
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-md mx-auto">
                    {isAdmin
                      ? 'Importa el padrón escolar en Excel (.xlsx) para generar los salones y grupos automáticamente.'
                      : 'El coordinador aún no ha cargado salones para este periodo.'}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-[#000000] inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Importar Excel
                    </button>
                  )}
                </div>
              ) : (
                <ClassroomMapGrid
                  salones={salones}
                  currentUser={currentUser}
                  selectedSalon={salonActual}
                  onSelectSalon={(s) => {
                    handleSelectSalon(s);
                    if (vistaSeccion === 'salones') setVistaSeccion('lista');
                  }}
                  onReclamarSalon={(s) => {
                    handleReclamarSalon(s);
                    if (vistaSeccion === 'salones') setVistaSeccion('lista');
                  }}
                  onLiberarSalon={handleLiberarSalon}
                  onSolicitarSalon={handleSolicitarSalon}
                  onAprobarSolicitud={handleAprobarSolicitud}
                  onRechazarSolicitud={handleRechazarSolicitud}
                  tieneRutaPendiente={tieneRutaPendiente}
                  telefonoCoordinador={telefonoCoordinador}
                  actionLoading={salonActionLoading}
                />
              )
            )}
          </section>
        )}

        {/* =====================================================================
            SECCIÓN 03: LLAMADO A LISTA Y AUDITORÍA DE ESTUDIANTES (SIN CONTENEDOR EXTERNO)
           ===================================================================== */}
        {(vistaSeccion === 'todas' || vistaSeccion === 'lista') && (
          <section className="space-y-4">
            {/* Cabecera limpia con línea divisoria */}
            <div className="pb-3 border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-white text-[#000000] font-mono text-[11px] sm:text-xs font-extrabold tracking-wider">
                  03
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                    Llamado a Lista
                  </h2>
                  {!isAdmin && (
                    <span className="px-2 py-0.5 rounded-md bg-[#141414] border border-[#262626] text-[10px] font-bold uppercase text-neutral-300">
                      Exclusivo Mi Ruta
                    </span>
                  )}
                  {sede && (
                    <span className="px-2.5 py-0.5 rounded-md bg-[#171717] border border-[#333333] text-xs font-semibold text-white">
                      {sede} {grado ? formatGrado(grado) : ''} {grupo || ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0A0A] border border-[#262626]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Listos: <strong className="text-white">{totalAuditados}</strong>
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0A0A] border border-[#262626]">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                  Pendientes: <strong className="text-white">{totalPendientes}</strong>
                </span>
              </div>
            </div>

            {/* Filtros directos (Para AUDITOR solo muestra salones de MI RUTA) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                {/* Sede */}
                <div>
                  <select
                    value={sede}
                    onChange={(e) => handleSedeChange(e.target.value)}
                    className="w-full h-10 bg-[#0A0A0A] border border-[#262626] focus:border-white rounded-xl px-3.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="">
                      {isAdmin ? 'Todas las sedes' : 'Sedes de Mi Ruta'}
                    </option>
                    {filtrosCatalogo.sedes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grado */}
                <div>
                  <select
                    value={grado}
                    onChange={(e) => handleGradoChange(e.target.value)}
                    className="w-full h-10 bg-[#0A0A0A] border border-[#262626] focus:border-white rounded-xl px-3.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="">
                      {isAdmin ? 'Todos los grados' : 'Grados de Mi Ruta'}
                    </option>
                    {gradosDisponibles.map((g) => (
                      <option key={g} value={g}>
                        Grado {formatGrado(g)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grupo */}
                <div>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="w-full h-10 bg-[#0A0A0A] border border-[#262626] focus:border-white rounded-xl px-3.5 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="">
                      {isAdmin ? 'Todos los grupos' : 'Grupos de Mi Ruta'}
                    </option>
                    {gruposDisponibles.map((gr) => {
                      const infoSalon =
                        sede && grado
                          ? salones.find(
                              (s) =>
                                s.sede === sede &&
                                s.grado === grado &&
                                s.grupo === gr
                            )
                          : null;
                      let sufijo = '';
                      if (infoSalon) {
                        if (infoSalon.estado === 'DISPONIBLE')
                          sufijo = ' - Libre';
                        else if (infoSalon.estado === 'SOLICITADO')
                          sufijo = ' - Solicitado';
                        else if (infoSalon.estado === 'ASIGNADO')
                          sufijo = ` - ${infoSalon.funcionario_nombre || 'Mi Ruta'}`;
                        else if (infoSalon.estado === 'EN_AUDITORIA')
                          sufijo = ` - ${infoSalon.funcionario_nombre || 'En curso'}`;
                        else sufijo = ' - Cerrado';
                      }
                      return (
                        <option key={gr} value={gr}>
                          Grupo {gr}
                          {sufijo}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Buscador + Filtro Pendientes */}
              <div className="flex items-center gap-2 lg:w-[380px]">
                <div className="flex-1">
                  <input
                    type="text"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder="Buscar estudiante..."
                    className="w-full h-10 bg-[#0A0A0A] border border-[#262626] focus:border-white rounded-xl px-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSoloPendientes(!soloPendientes)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-semibold border flex items-center justify-center transition-all shrink-0 ${
                    soloPendientes
                      ? 'bg-white text-[#000000] border-white'
                      : 'bg-[#0A0A0A] text-neutral-400 border-[#262626] hover:text-white'
                  }`}
                >
                  <span>Pendientes</span>
                </button>

                {(sede || grado || grupo || buscar || soloPendientes) && (
                  <button
                    type="button"
                    onClick={handleLimpiarFiltros}
                    title="Limpiar filtros"
                    className="h-10 px-3 rounded-xl bg-[#0A0A0A] hover:bg-[#171717] text-neutral-400 hover:text-white border border-[#262626] text-xs font-semibold flex items-center justify-center transition-colors shrink-0"
                  >
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Banner Semáforo cuando hay un salón filtrado */}
            <ClassroomSemaphoreBanner
              salonActual={salonActual}
              currentUser={currentUser}
              onReclamarSalon={handleReclamarSalon}
              onAbrirModalCerrar={(salon) => setSalonPorCerrar(salon)}
              onLiberarSalon={handleLiberarSalon}
              actionLoading={salonActionLoading}
            />

            {/* Tabla / Tarjetas de Estudiantes directamente fuera */}
            {estudiantesMostrados.length === 0 ? (
              <div className="py-12 px-4 text-center border-t border-[#1F1F1F]">
                <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">
                  {!isAdmin && misSalonesRuta.length === 0
                    ? 'Aún no tienes salones activos en Mi Ruta'
                    : 'Sin estudiantes en este filtro'}
                </p>
                {!isAdmin && misSalonesRuta.length === 0 && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Ve a 02. Salones y toca &ldquo;Solicitar salón&rdquo; en cualquier grupo libre para que el coordinador te lo habilite.
                  </p>
                )}
                <div className="mt-3 flex justify-center gap-2">
                  {(sede || grado || grupo || buscar || soloPendientes) && (
                    <button
                      onClick={handleLimpiarFiltros}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1F1F1F] text-white border border-[#262626]"
                    >
                      Ver todos
                    </button>
                  )}
                  {!isAdmin && misSalonesRuta.length === 0 && (
                    <button
                      onClick={() => setVistaSeccion('salones')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-200 text-[#000000]"
                    >
                      Ir a 02. Salones
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-200 text-[#000000]"
                    >
                      Importar Excel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-2.5">
                  {estudiantesMostrados.map((est) => (
                    <StudentAuditMobileCard
                      key={est.id}
                      estudiante={est}
                      onUpdateAuditoria={handleUpdateAuditoria}
                      isSaving={savingRowId === est.id}
                      readOnly={isReadOnlySalon}
                    />
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto border-t border-[#262626]">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-[#262626] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <th className="py-3 px-4">Estudiante</th>
                        <th className="py-3 px-4">Asistió</th>
                        <th className="py-3 px-4">Sigue 2027</th>
                        <th className="py-3 px-4">Requisito / Retiro</th>
                        <th className="py-3 px-4">Nota</th>
                        <th className="py-3 px-4 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesMostrados.map((est) => (
                        <StudentAuditRow
                          key={est.id}
                          estudiante={est}
                          onUpdateAuditoria={handleUpdateAuditoria}
                          isSaving={savingRowId === est.id}
                          readOnly={isReadOnlySalon}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* MODAL DE CONFIRMACIÓN DUAL AL AUDITOR TRAS SOLICITAR SALÓN */}
      {solicitudEnviadaInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A0A0A] border border-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-white text-[#000000] font-bold flex items-center justify-center shrink-0">
                  <Hand className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Salón {formatGrado(solicitudEnviadaInfo.salon.grado)}{' '}
                    {solicitudEnviadaInfo.salon.grupo} solicitado
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {solicitudEnviadaInfo.salon.sede}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSolicitudEnviadaInfo(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-200 leading-relaxed">
              ¡Solicitud enviada a la app! Toca abajo para avisarle también al WhatsApp del coordinador y que te lo habilite de una vez.
            </p>

            <div className="p-3 rounded-xl bg-[#000000] border border-[#262626] text-[11px] text-neutral-400 italic">
              &ldquo;{solicitudEnviadaInfo.whatsapp_mensaje}&rdquo;
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href={solicitudEnviadaInfo.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSolicitudEnviadaInfo(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-[#000000] text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Avisar por WhatsApp al Coordinador
              </a>
              <button
                type="button"
                onClick={() => setSolicitudEnviadaInfo(null)}
                className="w-full py-2 px-3 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] text-neutral-300 text-xs font-semibold border border-[#262626]"
              >
                Cerrar (Ya se notificó en la app)
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingDock
        vistaSeccion={vistaSeccion}
        setVistaSeccion={setVistaSeccion}
        totalEstudiantes={stats?.cobertura?.total_estudiantes ?? 0}
        totalSalones={salones.length}
        totalMostrados={estudiantesMostrados.length}
      />

      <UploadExcelModal
        isOpen={isUploadOpen && isAdmin}
        currentUser={currentUser}
        corteId={corteSeleccionadoId}
        apiBase={API_BASE}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          setSede('');
          setGrado('');
          setGrupo('');
          setBuscar('');
          fetchDatos();
        }}
      />

      <UxCopyGuideModal
        isOpen={isUxGuideOpen}
        onClose={() => setIsUxGuideOpen(false)}
      />

      <CortesModal
        isOpen={isCortesModalOpen}
        onClose={() => setIsCortesModalOpen(false)}
        cortes={cortes}
        corteSeleccionadoId={corteSeleccionadoId}
        onSelectCorte={(id) => {
          setCorteSeleccionadoId(id);
          setIsCortesModalOpen(false);
        }}
        onCrearCorte={handleCrearCorte}
        onActivarCorte={handleActivarCorte}
        onCerrarCorte={handleCerrarCorte}
      />

      <UsersAdminModal
        isOpen={isUsersAdminOpen}
        onClose={() => setIsUsersAdminOpen(false)}
        usuarios={usuariosList}
        salones={salones}
        onCreateUsuario={handleCreateUsuario}
        onUpdateUsuario={handleUpdateUsuario}
        onDeleteUsuario={handleDeleteUsuario}
        onPreasignarSalones={handlePreasignarSalones}
      />

      <ConfirmCloseClassroomModal
        isOpen={Boolean(salonPorCerrarVivo)}
        salon={salonPorCerrarVivo}
        onClose={() => setSalonPorCerrar(null)}
        onConfirm={handleConfirmCerrarSalon}
        loading={salonActionLoading}
      />

      <LoginModal
        isOpen={!currentUser}
        onLogin={handleLogin}
        onRecoverAdminPin={handleRecoverAdminPin}
        error={loginError}
        loading={loginLoading}
      />
    </div>
  );
}
