# PRODUCT.md — NexoAula 2027

## 1. Propósito del Producto
**NexoAula 2027** es una plataforma operativa de auditoría presencial de matrícula y asistencia escolar en terreno. Permite verificar salón por salón qué estudiantes asisten hoy, quiénes continuarán en la institución en el año lectivo 2027, qué documentos de matrícula tienen pendientes y cuáles son las causales de retiro, comparando la variación frente a cortes históricos previos.

## 2. Usuarios y Roles Operativos
1. **Coordinador General (`ADMIN`)**:
   - Administra el padrón escolar (`.xlsx`), abre y congela cortes de auditoría, crea perfiles de funcionarios con PIN de 4 dígitos y pre-asigna rutas de salones.
   - Recibe notificaciones en vivo en la aplicación (cada 5 segundos) y avisos por WhatsApp cuando un auditor termina su ruta y solicita habilitar un salón adicional, aprobándolo o rechazándolo en un clic.
   - Consulta el consolidado completo de sedes, grados y grupos y exporta el reporte oficial para Rectoría.
2. **Funcionario Auditor en Terreno (`AUDITOR`)**:
   - Ingresa mediante PIN único de 4 dígitos desde su teléfono móvil o tableta mientras recorre los salones asignados en **Mi Ruta**.
   - Visualiza en el módulo **03. Llamado a Lista** exclusivamente los estudiantes pertenecientes a los salones asignados a su ruta.
   - Al completar al 100% los salones de **Mi Ruta**, puede solicitar cualquier salón en estado `DISPONIBLE` desde **02. Salones**, enviando la alerta en tiempo real a la aplicación del Coordinador y abriendo el mensaje directo hacia el WhatsApp de Coordinación.

## 3. Principios de Flujo Operativo
- **Cero fricción en terreno**: Un solo toque en `Sí` o `No` dentro de la fila del estudiante actualiza su estado a `AUDITADO` de forma inmediata sin recargar la pantalla ni exigir pasos intermedios.
- **Datos densos en tablas con filtros por columna**: Los listados de estudiantes, perfiles de equipo, asignación de rutas y cortes históricos se presentan en tablas estructuradas con filtros por columna, nunca en tarjetas anidadas.
- **Comunicación humana y directa**: Microcopy en español claro, orientado a la acción inmediata y libre de tecnicismos o emojis.

