# DESIGN.md — Sistema de Diseño Impeccable (NexoAula 2027)

## 1. Dirección Estética y Paleta Monocromática (`#000000`)
NexoAula 2027 emplea una estética **monocromática quirúrgica de alto contraste** pensada para lectura rápida bajo luz solar en terreno y sesiones prolongadas de coordinación:

| Token | Valor Hex | Uso Semántico |
| :--- | :--- | :--- |
| `--bg-canvas` | `#000000` | Lienzo absoluto de toda la aplicación y fondos de tablas. |
| `--bg-elevated` | `#0A0A0A` | Superficie de modales, barras de filtro y cabeceras flotantes. |
| `--bg-interactive` | `#141414` | Controles secundarios, filas activas y estados hover sutiles. |
| `--border-subtle` | `#1F1F1F` | Divisores de filas de tabla y separadores internos. |
| `--border-default` | `#262626` | Bordes estructurales de controles, inputs y celdas. |
| `--text-primary` | `#FFFFFF` | Texto principal, cifras clave y estados confirmados (`Auditado`, `Sí`). |
| `--text-secondary` | `#A3A3A3` | Etiquetas de columna, metadatos de sede y subtítulos. |
| `--text-muted` | `#737373` |Estados pendientes o deshabilitados. |
| `--accent-primary` | `#FFFFFF` | Botones primarios (fondo `#FFFFFF` con texto `#000000` en negrita). |

## 2. Tipografía y Precisión Numérica
- **Jerarquía tipográfica**: Uso de `Plus Jakarta Sans` / `Geist` / `system-ui` para encabezados e interfaz operativa, combinada con fuente monoespaciada (`JetBrains Mono` / `ui-monospace`) para códigos de corte, PINs de 4 dígitos, grados/grupos y teléfonos.
- **Números tabulares (`tabular-nums`)**: Todos los contadores de alumnos, porcentajes de avance, KPIs e indicadores de fila aplican `font-variant-numeric: tabular-nums` para evitar saltos horizontales al actualizar datos en vivo.

## 3. Reglas Anti-Bloat (Impeccable Rules)
1. **Prohibido anidar contenedores (`No Card-in-Card`)**: Las tablas principales (**03. Llamado a Lista**, **Perfiles**, **Asignar Ruta**, **Cortes**) viven directamente sobre el lienzo o el cuerpo del modal sin cajas decorativas envolventes.
2. **Prohibidos los mosaicos de íconos decorativos (`No Decorative Icon Tiles`)**: Los encabezados de modal y tarjetas KPI no usan recuadros decorativos alrededor de íconos; el ícono acompaña directamente a la etiqueta tipográfica.
3. **Tablas sobre tarjetas para datos estructurados**: Cualquier colección comparable (estudiantes, funcionarios, rutas de salones, cortes históricos, guía de microcopy) se presenta en tabla con cabeceras claras.
4. **Cero emojis**: Ningún botón, banner, notificación, mensaje de WhatsApp ni estado de interfaz utiliza emojis. Todo el énfasis visual se logra mediante contraste blanco/negro, peso tipográfico e iconografía lineal de trazo limpio (`lucide-react`).
5. **Accesibilidad y endurecimiento (`Harden`)**: Foco de teclado visible (`:focus-visible`), soporte para reducción de movimiento (`prefers-reduced-motion: reduce`) y áreas táctiles mínimas de `38px–40px` en controles operativos.

