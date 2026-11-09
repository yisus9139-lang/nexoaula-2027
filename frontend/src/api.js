const API_HOST =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "localhost";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `http://${API_HOST}:8000`;

export const REQUISITOS_MATRICULA = [
  "Actualizar documentos",
  "Paz y salvo",
  "Cupo directo",
  "Beca/Apoyo",
  "Otro",
];

export const MOTIVOS_RETIRO = [
  "Cambio de ciudad",
  "Traslado de colegio",
  "Motivos económicos",
  "Graduación",
  "Otro",
];

async function handleResponse(response, fallbackErrorMsg) {
  if (!response.ok) {
    let detail = fallbackErrorMsg;
    try {
      const data = await response.json();
      if (data && data.detail) {
        detail = typeof data.detail === "string" ? data.detail : fallbackErrorMsg;
      }
    } catch {
      // Mantiene el mensaje empático de respaldo
    }
    throw new Error(detail);
  }
  return response.json();
}

export async function fetchCortes() {
  const res = await fetch(`${API_BASE_URL}/cortes`);
  return handleResponse(
    res,
    "No pudimos cargar los cortes de auditoría. Verifica tu conexión."
  );
}

export async function crearCorteApi(payload, adminId = null) {
  const headers = { "Content-Type": "application/json" };
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const res = await fetch(`${API_BASE_URL}/cortes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, admin_id: adminId }),
  });
  return handleResponse(
    res,
    "No pudimos crear el nuevo corte de auditoría. Intenta de nuevo."
  );
}

export async function activarCorteApi(corteId, adminId = null) {
  const headers = {};
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const url = new URL(`${API_BASE_URL}/cortes/${corteId}/activar`);
  if (adminId) url.searchParams.append("admin_id", String(adminId));
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers,
  });
  return handleResponse(
    res,
    "No pudimos activar este corte de auditoría. Intenta de nuevo."
  );
}

export async function cerrarCorteApi(corteId, adminId = null) {
  const headers = {};
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const url = new URL(`${API_BASE_URL}/cortes/${corteId}/cerrar`);
  if (adminId) url.searchParams.append("admin_id", String(adminId));
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers,
  });
  return handleResponse(
    res,
    "No pudimos cerrar este corte de auditoría. Intenta de nuevo."
  );
}

export async function fetchUsuariosSemilla(corteId = null) {
  const url = new URL(`${API_BASE_URL}/usuarios`);
  if (corteId) {
    url.searchParams.append("corte_id", String(corteId));
  }
  const res = await fetch(url.toString());
  return handleResponse(
    res,
    "No pudimos cargar los perfiles de acceso. Verifica tu conexión al Wi-Fi."
  );
}

export async function loginConPin(pin_acceso) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin_acceso: String(pin_acceso).trim() }),
  });
  return handleResponse(
    res,
    "No reconocemos ese PIN. Revisa los 4 números o pídele tu código al coordinador."
  );
}

export async function recuperarAdminPinApi({ llave_maestra, nuevo_pin }) {
  const res = await fetch(`${API_BASE_URL}/auth/recuperar-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      llave_maestra: String(llave_maestra).trim(),
      nuevo_pin: String(nuevo_pin).trim(),
    }),
  });
  return handleResponse(
    res,
    "Esa llave de respaldo no es correcta. Verifica el código con Rectoría o Sistemas."
  );
}

export function generarEnlaceWhatsAppRuta(funcionario, salonesLista = []) {
  const nombre = funcionario?.nombre || "Compañero";
  const pin = funcionario?.pin_acceso || "****";
  const telefonoRaw = funcionario?.telefono || "";
  const telefonoLimpio = String(telefonoRaw).replace(/\D/g, "");

  const salonesTexto =
    salonesLista && salonesLista.length > 0
      ? salonesLista
          .map((s) => `${s.sede} - ${s.grado} ${s.grupo}`)
          .join(", ")
      : "Toma cualquier salón libre";

  const appUrl =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://localhost:5173";

  const mensaje = [
    `¡Hola, ${nombre}! 🏫 Hoy harás el recorrido en NexoAula 2027.`,
    `🔑 Tu PIN de entrada: ${pin}`,
    `📍 Tus salones asignados: ${salonesTexto}`,
    `📲 Entra aquí desde tu celular: ${appUrl}`,
  ].join("\n");

  const encoded = encodeURIComponent(mensaje);
  return telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export async function crearUsuarioApi(payload, adminId = null) {
  const headers = { "Content-Type": "application/json" };
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const res = await fetch(`${API_BASE_URL}/usuarios`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, admin_id: adminId }),
  });
  return handleResponse(
    res,
    "No pudimos crear el perfil. Revisa los datos e intenta de nuevo."
  );
}

export async function editarUsuarioApi(usuarioId, payload, adminId = null) {
  const headers = { "Content-Type": "application/json" };
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const res = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...payload, admin_id: adminId }),
  });
  return handleResponse(
    res,
    "No pudimos actualizar este perfil. Intenta de nuevo."
  );
}

export async function eliminarUsuarioApi(usuarioId, adminId = null) {
  const headers = {};
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const url = new URL(`${API_BASE_URL}/usuarios/${usuarioId}`);
  if (adminId) url.searchParams.append("admin_id", String(adminId));
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers,
  });
  return handleResponse(
    res,
    "No pudimos eliminar este perfil. Intenta de nuevo."
  );
}

export async function preasignarSalonesApi({
  funcionario_id,
  salones,
  admin_id = null,
  corte_id = null,
}) {
  const headers = { "Content-Type": "application/json" };
  if (adminId) headers["X-Usuario-Id"] = String(adminId);
  const res = await fetch(`${API_BASE_URL}/salones/preasignar`, {
    method: "POST",
    headers,
    body: JSON.stringify({ funcionario_id, salones, admin_id, corte_id }),
  });
  return handleResponse(
    res,
    "No pudimos guardar la asignación de salones. Intenta de nuevo."
  );
}

export async function fetchSalones(sede = null, corteId = null) {
  const url = new URL(`${API_BASE_URL}/salones`);
  if (sede && sede !== "TODAS") {
    url.searchParams.append("sede", sede);
  }
  if (corteId) {
    url.searchParams.append("corte_id", String(corteId));
  }
  const res = await fetch(url.toString());
  return handleResponse(
    res,
    "No pudimos actualizar el semáforo de salones."
  );
}

export async function tomarSalonApi({
  sede,
  grado,
  grupo,
  funcionario_id,
  corte_id = null,
}) {
  const res = await fetch(`${API_BASE_URL}/salones/tomar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sede, grado, grupo, funcionario_id, corte_id }),
  });
  return handleResponse(
    res,
    "No pudimos iniciar el llamado en este salón. Intenta de nuevo."
  );
}

export async function finalizarSalonApi({
  sede,
  grado,
  grupo,
  funcionario_id,
  corte_id = null,
}) {
  const res = await fetch(`${API_BASE_URL}/salones/finalizar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sede, grado, grupo, funcionario_id, corte_id }),
  });
  return handleResponse(
    res,
    "No pudimos cerrar el salón en este momento. Intenta de nuevo."
  );
}

export async function liberarSalonApi({
  sede,
  grado,
  grupo,
  admin_id,
  nuevo_funcionario_id = null,
  corte_id = null,
}) {
  const res = await fetch(`${API_BASE_URL}/salones/liberar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sede,
      grado,
      grupo,
      admin_id,
      nuevo_funcionario_id,
      corte_id,
    }),
  });
  return handleResponse(
    res,
    "No pudimos liberar el salón. Verifica tus permisos de Coordinador."
  );
}

export async function fetchEstudiantes(params = {}) {
  const url = new URL(`${API_BASE_URL}/estudiantes`);
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "TODAS" && value !== "TODOS") {
      url.searchParams.append(key, value);
    }
  });

  try {
    const res = await fetch(url.toString());
    return await handleResponse(
      res,
      "No pudimos cargar el listado en este momento. Revisa tu conexión e intenta de nuevo."
    );
  } catch (err) {
    throw new Error(
      err.message ||
        "No pudimos conectar con el servidor en la red local. Verifica que el backend esté encendido en el puerto 8000."
    );
  }
}

export async function fetchEstadisticas(params = {}) {
  const url = new URL(`${API_BASE_URL}/estadisticas`);
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "TODAS" && value !== "TODOS") {
      url.searchParams.append(key, value);
    }
  });

  const res = await fetch(url.toString());
  return handleResponse(
    res,
    "No pudimos actualizar las métricas del salón. Intenta de nuevo en unos segundos."
  );
}

export async function updateAuditoria(
  estudianteId,
  payload,
  usuarioId = null,
  corteId = null
) {
  const headers = { "Content-Type": "application/json" };
  if (usuarioId) {
    headers["X-Usuario-Id"] = String(usuarioId);
  }
  const bodyPayload = {
    ...payload,
    ...(usuarioId ? { funcionario_id: usuarioId } : {}),
    ...(corteId ? { corte_id: corteId } : {}),
  };

  const url = new URL(`${API_BASE_URL}/auditoria/${estudianteId}`);
  if (corteId) {
    url.searchParams.append("corte_id", String(corteId));
  }

  const res = await fetch(url.toString(), {
    method: "PUT",
    headers,
    body: JSON.stringify(bodyPayload),
  });
  return handleResponse(
    res,
    "No pudimos guardar este cambio. Intenta marcar la opción nuevamente."
  );
}

export async function marcarAsistenciaSalon(
  payload,
  usuarioId = null,
  corteId = null
) {
  const headers = { "Content-Type": "application/json" };
  if (usuarioId) {
    headers["X-Usuario-Id"] = String(usuarioId);
  }
  const bodyPayload = {
    ...payload,
    ...(usuarioId ? { funcionario_id: usuarioId } : {}),
    ...(corteId ? { corte_id: corteId } : {}),
  };

  const res = await fetch(`${API_BASE_URL}/auditoria-salon/asistencia`, {
    method: "PUT",
    headers,
    body: JSON.stringify(bodyPayload),
  });
  return handleResponse(
    res,
    "No pudimos marcar la asistencia del salón. Revisa el filtro activo e intenta de nuevo."
  );
}

export async function uploadExcelFile(
  file,
  reemplazar = false,
  usuarioId = null,
  corteId = null
) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  if (usuarioId) {
    headers["X-Usuario-Id"] = String(usuarioId);
  }

  const url = new URL(`${API_BASE_URL}/upload-excel`);
  url.searchParams.append("reemplazar", reemplazar ? "true" : "false");
  if (corteId) {
    url.searchParams.append("corte_id", String(corteId));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: formData,
  });

  return handleResponse(
    res,
    "No pudimos leer tu Excel. Revisa que tenga las 5 columnas e intenta de nuevo."
  );
}

export async function resetSeedData() {
  const res = await fetch(`${API_BASE_URL}/seed-reset`, {
    method: "POST",
  });
  return handleResponse(
    res,
    "No pudimos restaurar los datos de prueba. Intenta de nuevo."
  );
}

export function getExportarReporteUrl(params = {}) {
  const url = new URL(`${API_BASE_URL}/exportar-reporte`);
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "TODAS" && value !== "TODOS") {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

export function getPlantillaExcelUrl() {
  return `${API_BASE_URL}/plantilla-excel`;
}
