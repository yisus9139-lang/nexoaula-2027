# NexoAula 2027 v4.0 — Cortes de Auditoría (Periodos), Rutas por WhatsApp y Login de 1 Barra

Aplicación web full-stack lista para producción diseñada para tomar asistencia escolar en terreno desde múltiples dispositivos móviles en simultáneo, auditar la proyección de matrículas para 2027 y comparar la evolución de continuidad entre múltiples **Cortes de Auditoría (Periodos)** a lo largo del año escolar.

---

## 1. Novedades de la Versión 4.0 (Múltiples Cortes / Periodos)

1. **Nueva Tabla `cortes_auditoria` y Trazabilidad por Periodo ([database.py](file:///c:/Users/Jesul/NexoAula/backend/database.py), [models.py](file:///c:/Users/Jesul/NexoAula/backend/models.py)):**
   - `cortes_auditoria` almacena cada barrido del año escolar (`id`, `nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `activo`, `cerrado`, `creado_en`).
   - `auditoria_2027` incluye `corte_id` con restricción única `UNIQUE(estudiante_id, corte_id)` para conservar el historial independiente de cada alumno en cada corte.
   - `control_salones` incluye `corte_id` con `UNIQUE(corte_id, sede, grado, grupo)`.
2. **2 Cortes Semilla Pre-cargados ([seed.py](file:///c:/Users/Jesul/NexoAula/backend/seed.py)):**
   - **🔒 `Corte 1 - Sondeo Inicial`** (`cerrado: True`, `activo: False`): Historial 100% completado para consulta y comparación.
   - **🟢 `Corte 2 - Auditoría Actual`** (`activo: True`, `cerrado: False`): Periodo en curso en vivo con rutas pre-asignadas (`ASIGNADO`), en auditoría (`EN_AUDITORIA`), completadas (`COMPLETADO`) y libres (`DISPONIBLE`).
3. **Endpoints de Cortes y Comparativa Histórica ([main.py](file:///c:/Users/Jesul/NexoAula/backend/main.py)):**
   - `GET /cortes`: Lista todos los cortes con su avance y estado (`activo`, `cerrado`).
   - `POST /cortes` (Exclusivo `ADMIN`): Crea un nuevo corte permitiendo elegir entre **Reiniciar salones en blanco para volver a llamar lista** vs. **Mantener rutas de salones asignadas a los auditores**, y si se parte desde cero o pre-cargando respuestas del corte anterior.
   - `PUT /cortes/{corte_id}/activar` y `PUT /cortes/{corte_id}/cerrar` (Exclusivo `ADMIN`).
   - `GET /estudiantes`, `GET /salones`, `GET /estadisticas` y `GET /exportar-reporte` aceptan `?corte_id=` e incluyen `estado_corte_anterior` y la variación porcentual frente al corte previo.

---

## 2. Accesos Rápidos por PIN Único (1 Sola Barra)

| Perfil | Rol | PIN de 4 dígitos | Estado Inicial en Corte 2 |
| :--- | :--- | :---: | :--- |
| **Coordinación General** | `ADMIN` | **`2027`** | Control total de Cortes, Equipo, Rutas y Excel (Llave maestra: `NEXO-RECTORIA`) |
| **Ana Gómez** | `AUDITOR` | **`1111`** | Auditando `10° A` (Central) + Ruta asignada en `10° A` (Norte) |
| **Carlos Pérez** | `AUDITOR` | **`2222`** | Ya completó `9° A` en ambas sedes |
| **Laura Restrepo** | `AUDITOR` | **`3333`** | Ruta pre-asignada en `10° B` (Central) y `9° B` (Norte) |

---

## 3. Ejecución en Local y Red Wi-Fi

### Backend (FastAPI + SQLite WAL)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev -- --host
```
