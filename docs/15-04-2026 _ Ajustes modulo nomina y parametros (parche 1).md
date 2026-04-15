# Objetivo de la petición
Corregir y completar el comportamiento del nuevo módulo de nómina para que sea visible desde la navegación principal, eliminar campos redundantes de empresa/NIT en vistas donde ya son implícitos, ampliar y automatizar los tipos de corte por fechas, habilitar exclusión de conceptos del cálculo de nómina, y dejar guía operativa completa para mantenimiento, reversión y portabilidad a otros repositorios.

---

## Archivos implicados, tipo de modificación y objetivo

1. `nomina/index.html`
   - **Tipo:** Modificación de estructura visual (formulario/UX).
   - **Cambios:**
     - Se eliminó el campo `Empresa` del formulario de período.
     - Se amplió el selector de corte con: semanal, quincenal, mensual, trimestral, semestral, anual y personalizado.
     - Se añadió nota de comportamiento automático de fechas.
     - Se añadió bloque "Inclusión de parámetros en cálculo" con contenedor dinámico para activar/desactivar conceptos.
   - **Objetivo explícito:** Evitar redundancias y permitir control operativo de cálculo.

2. `js/nomina.js`
   - **Tipo:** Refactor funcional + lógica de negocio.
   - **Cambios:**
     - Se retiró dependencia del input `nominaEmpresa`.
     - Se agregó motor de cortes (`DAYS_BY_CORTE`) y sincronización automática corte↔fechas.
     - Nuevas funciones: cálculo de rango inclusivo, detección automática de corte, aplicación de preset por corte.
     - Se agregó estado `conceptosActivos` para incluir/excluir conceptos del cálculo sin perder trazabilidad en tabla.
     - Se añadió render dinámico de filtros de conceptos y recálculo inmediato de totales/comprobante.
     - Se ajustó payload enviado al webhook para incluir corte actual (incluyendo personalizado).
   - **Objetivo explícito:** Facilitar operación con reglas automáticas, pero conservando libertad de ajuste manual.

3. `configuracion/parametros_nomina.html`
   - **Tipo:** Simplificación de vista.
   - **Cambios:**
     - Se removieron campos de empresa y NIT del bloque de parámetros.
     - Se mantuvo foco en acciones CRUD (agregar/recargar) y listado real.
   - **Objetivo explícito:** Eliminar duplicación de información ya visible en header.

4. `js/parametros_nomina.js`
   - **Tipo:** Limpieza de código y flujo.
   - **Cambios:**
     - Se eliminaron referencias a inputs de empresa/NIT inexistentes.
     - Se retiró carga de datos de empresa para esa vista.
     - Se conserva CRUD directo sobre tabla `parametros_nomina` en Supabase (`insert`, `update`, `delete`, `select`).
   - **Objetivo explícito:** Mantener el módulo centrado en parámetros reales de base de datos.

5. `js/header.js`
   - **Tipo:** Ajuste de navegación principal.
   - **Cambios:**
     - Se agregó acceso `Nómina` al menú principal en entorno Loggro y Siigo.
     - Se renombró etiqueta en Siigo de "Nomina (borrador)" a "Nómina".
   - **Objetivo explícito:** Asegurar que el módulo se vea al ingresar en plataforma.

6. `configuracion/index.html`
   - **Tipo:** Reorganización de menú de configuración.
   - **Cambios:**
     - Se retiró `Nómina` del bloque "Apis e integraciones".
     - Se añadió `Módulo de nómina` dentro de sección "Nómina" junto a "Parámetros de nómina".
   - **Objetivo explícito:** Ubicar nómina como módulo funcional, no como integración.

7. `siigo/configuracion_siigo/index.html`
   - **Tipo:** Reorganización de menú de configuración Siigo.
   - **Cambios:**
     - Se retiró `Nómina` de "Operación y Gestión".
     - Se añadió sección dedicada "Nómina" con enlaces a módulo y parámetros.
   - **Objetivo explícito:** Consistencia de navegación y taxonomía funcional.

8. `css/nomina.css`
   - **Tipo:** Estilos nuevos.
   - **Cambios:**
     - Se agregaron estilos para nota informativa y listado de exclusión de conceptos.
   - **Objetivo explícito:** Mantener claridad visual del nuevo flujo.

---

## Notas de emergencia para revertir cambios (rollback detallado)

> Recomendación segura: revertir por archivo (`git checkout -- <archivo>`) solo si se requiere volver totalmente al estado previo.

### 1) Revertir selector de cortes y filtros de inclusión
- Archivo: `nomina/index.html`
- Acciones:
  - Eliminar opciones extra del select `#nominaCorte` y dejar únicamente `quincenal`, `mensual`.
  - Restaurar bloque de campo empresa `#nominaEmpresa` en la grilla.
  - Eliminar `<p class="nomina-note">`.
  - Eliminar sección completa `Inclusión de parámetros en cálculo`.

### 2) Revertir automatización de fechas y exclusiones
- Archivo: `js/nomina.js`
- Acciones:
  - Quitar constantes/funciones: `DAYS_BY_CORTE`, `toInputDate`, `parseInputDate`, `diffInDaysInclusive`, `findCorteByDates`, `applyCortePreset`, `syncCorteWithDates`.
  - Restaurar `setDefaultDates()` al comportamiento antiguo (inicio de mes a día 15 y corte quincenal).
  - Eliminar estado `conceptosActivos` y funciones asociadas: `getConceptoKey`, `isConceptoActivo`, `getItemsActivos`, `renderFiltrosParametros`.
  - Restaurar cálculo de `sumItems` sin filtro de activos.
  - Eliminar listeners de `corteSelect`, `fechaInicioInput`, `fechaFinInput`, y contenedor de filtros.

### 3) Revertir limpieza de parámetros nómina
- Archivos: `configuracion/parametros_nomina.html`, `js/parametros_nomina.js`
- Acciones:
  - Reponer campos `parametrosEmpresaNombre` y `parametrosEmpresaNit` en HTML.
  - Reponer variables JS de esos inputs y función `loadEmpresa`.
  - Reinsertar llamada `await loadEmpresa(state.context.empresa_id);` dentro de `init()`.

### 4) Revertir visibilidad de nómina en navegación
- Archivos: `js/header.js`, `configuracion/index.html`, `siigo/configuracion_siigo/index.html`
- Acciones:
  - Quitar enlace de nómina en menú principal del header para los entornos agregados.
  - Volver a ubicar enlaces en secciones previas si se requiere exactamente el esquema anterior.

### 5) Revertir estilos de filtros
- Archivo: `css/nomina.css`
- Acciones:
  - Eliminar bloques `.nomina-note`, `.nomina-filtros-parametros`, `.nomina-filtro-item`.

---

## Exportar este cambio masivo a otro repositorio

1. **Prerequisito clave de este repo:**
   - Las rutas y enlaces se centralizan en `js/urls.js`.
   - Webhooks centralizados en `js/webhooks.js`.
   - El header global vive en `js/header.js`.

2. **Orden recomendado de portabilidad**
   1) Copiar estructura de UI:
      - `nomina/index.html`
      - `configuracion/parametros_nomina.html`
   2) Copiar lógica:
      - `js/nomina.js`
      - `js/parametros_nomina.js`
      - `js/header.js`
   3) Copiar estilos:
      - `css/nomina.css`
   4) Copiar navegación de configuración:
      - `configuracion/index.html`
      - `siigo/configuracion_siigo/index.html`

3. **Validaciones obligatorias en destino**
   - Confirmar existencia de tabla real `parametros_nomina` en Supabase con columnas usadas por el frontend (`id, empresa_id, nombre, tipo, valor, unidad, updated_at`).
   - Confirmar que `getUserContext()` retorne `empresa_id` y `rol`.
   - Confirmar que `fetchResponsablesActivos(empresa_id)` exista y devuelva `id` y `nombre_completo`.
   - Confirmar webhook de nómina en `js/webhooks.js`:
     - `WEBHOOK_NOMINA_TRANSFORMACION`.
   - Confirmar que el header del repositorio destino use una capa global equivalente para incluir el enlace de nómina.

4. **Particularidad crítica del repo actual**
   - Este repositorio ya tiene componentes cross-entorno (Loggro/Siigo). Si el destino no maneja entornos, simplificar condiciones en `buildMenu()` para evitar rutas inválidas.

5. **Formato recomendado de payload para webhook en destino**
   - Entrada sugerida:
     ```json
     {
       "empresa_id": "uuid",
       "empleado_id": "uuid",
       "empleado_nombre": "Texto",
       "corte": "semanal|quincenal|mensual|trimestral|semestral|anual|personalizado",
       "fecha_inicio": "YYYY-MM-DD",
       "fecha_fin": "YYYY-MM-DD",
       "entorno": "loggro|siigo|global"
     }
     ```
   - Salida sugerida:
     ```json
     {
       "ingresos": [{"concepto":"...","cantidad":1,"valor":0,"fuente":"n8n","estado":"Liquidable"}],
       "deducciones": [{"concepto":"...","cantidad":1,"valor":0,"fuente":"n8n","estado":"Liquidable"}],
       "resumen_movimientos": {
         "inventarios": "...",
         "cierre_turno": "...",
         "horas_trabajadas": 0,
         "observaciones": []
       }
     }
     ```

---

## Check de funcionamiento (log operativo)

- **Módulo de nómina en header:** funciona (visible en menú principal Loggro y Siigo).
- **Ubicación de nómina en configuración:** funciona (sección dedicada, fuera de APIs e integraciones).
- **Campo empresa en módulo nómina:** removido correctamente (implícito por sesión).
- **Campo empresa/NIT en parámetros nómina:** removidos correctamente (sin redundancia).
- **Carga de listado de parámetros desde tabla real:** funciona (consulta directa Supabase).
- **Alta/edición/borrado de parámetros:** funciona (operación directa Supabase, sin webhook).
- **Cortes de nómina ampliados:** funciona (semanal, quincenal, mensual, trimestral, semestral, anual, personalizado).
- **Ajuste automático de fechas por corte:** funciona.
- **Edición manual de fechas sin bloqueo:** funciona.
- **Detección automática de "personalizado":** funciona cuando el rango no coincide con cortes predefinidos.
- **Exclusión de conceptos del cálculo:** funciona (totales/comprobante recalculan en vivo).
- **Riesgo conocido:** aproximación por días fijos para mensual/trimestral/semestral/anual (30/90/182/365), puede requerir ajuste fino por calendario exacto en una siguiente iteración.
