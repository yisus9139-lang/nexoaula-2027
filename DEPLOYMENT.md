# Guía de Despliegue en Producción — NexoAula 2027

El proyecto está 100% empaquetado y preparado para ejecutarse en la nube utilizando **Docker Multi-Stage**, integrando el frontend compilado (React + Tailwind) y el backend (FastAPI + SQLite WAL) en un único servicio de alto rendimiento sin problemas de CORS.

---

## 1. Subir el código a tu cuenta de GitHub

Ejecuta los siguientes comandos en tu terminal para vincular este repositorio local a tu GitHub:

```bash
# 1. Crea un repositorio vacío en github.com (por ejemplo: nexoaula-2027)
# 2. Conecta tu repositorio remoto:
git remote add origin https://github.com/TU_USUARIO/nexoaula-2027.git

# 3. Sube el código:
git push -u origin main
```

---

## 2. Despliegue en Render (Recomendado con Blueprint)

Render cuenta con el archivo de configuración [`render.yaml`](./render.yaml) ya incluido:

1. Ve a [dashboard.render.com](https://dashboard.render.com).
2. Haz clic en **New +** y selecciona **Blueprint**.
3. Conecta tu cuenta de GitHub y elige el repositorio `nexoaula-2027`.
4. Render detectará automáticamente `render.yaml` y configurará:
   - **Docker Build:** Compila React y empaqueta FastAPI.
   - **Disco Persistente (1 GB):** Montado en `/app/data` para que tu base de datos SQLite conserve los datos entre reinicios.
   - **Healthcheck:** Ruta `/cortes`.
5. Haz clic en **Apply**. En 3-4 minutos tendrás tu URL pública (ejemplo: `https://nexoaula-2027.onrender.com`).

---

## 3. Despliegue en Railway

Railway detecta automáticamente [`railway.toml`](./railway.toml) y [`Dockerfile`](./Dockerfile):

1. Ve a [railway.com](https://railway.com) e inicia sesión con GitHub.
2. Haz clic en **New Project** -> **Deploy from GitHub repo**.
3. Selecciona `nexoaula-2027`.
4. En la pestaña **Settings** del servicio:
   - En **Networking**, haz clic en **Generate Domain** para obtener tu enlace HTTPS.
   - En **Volumes**, añade un volumen con Mount Path: `/app/data` (para persistencia de la base de datos).
5. Railway completará el despliegue automáticamente.

---

## Variables de Entorno de Producción

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha HTTP | `8000` (o asignado por hosting) |
| `NEXO_DB_PATH` | Ubicación del archivo SQLite persistente | `/app/data/nexoaula.db` |
| `NEXO_SECRET_KEY` | Llave criptográfica para firmas HMAC | Auto-generada |
| `NEXO_LLAVE_MAESTRA` | Llave maestra para recuperar PIN de Administrador | `NEXO-RECTORIA-2027` |
| `NEXO_CORS_ORIGINS` | Orígenes CORS adicionales separados por coma | Dominios oficiales de Render/Railway permitidos automáticamente |

---

## Acceso Inicial en Producción
- **Usuario:** `admin` (Coordinación General)
- **PIN Inicial:** `2027`
