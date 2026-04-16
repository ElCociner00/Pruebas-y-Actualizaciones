# 2026-04-16 _ Submodulo cierre turnos antiguos

## 1) Objetivo de la petición
Implementar un submódulo separado de **cierre de turno** para cargar turnos de días anteriores usando:
- Consulta previa de **totales del día** (Loggro + gastos),
- División manual/asistida en N turnos,
- Reglas para que los valores de columna **Sistema** no superen los totales del día,
- Envío final por el **mismo flujo/payload** de `subir_cierre` para evitar un flujo paralelo.

## 2) Archivos implicados, tipo de cambio y objetivo

### Archivos creados
1. `cierre_turno/turnos_anteriores.html`
   - **Tipo:** nuevo módulo/página.
   - **Objetivo:** UI para consulta total diaria y formularios dinámicos por cantidad de turnos.
   - **Qué hace:** permite seleccionar fecha, consultar totales/gastos y desplegar formatos de turnos antiguos.

2. `css/cierre_turnos_anteriores.css`
   - **Tipo:** nuevo stylesheet.
   - **Objetivo:** estilos de cards de turnos, tabla editable y estados visuales.

3. `js/cierre_turnos_anteriores.js`
   - **Tipo:** nueva lógica funcional.
   - **Objetivo:** consulta de totales del día, distribución automática inicial, redistribución al editar, validación y envío por webhook existente.
   - **Qué hace explícitamente:**
     - Usa fecha + ventana fija (`00:00` a `22:00`) para consultar total diario.
     - Calcula gastos y domicilios totales desde consulta de gastos.
     - Genera N formularios de turno y distribuye valores sistema.
     - Impide superar total del sistema por campo (rebalancea automáticamente).
     - Permite editar valores reales y calcula diferencias.
     - Envía cada turno al mismo endpoint de `WEBHOOK_SUBIR_CIERRE`.

4. `docs/2026-04-16 _ Submodulo cierre turnos antiguos.md`
   - **Tipo:** documentación operativa.
   - **Objetivo:** trazabilidad y guía de reversión/portabilidad.

### Archivos modificados
1. `js/urls.js`
   - **Tipo:** routing.
   - **Objetivo:** agregar ruta `cierreTurnoAntiguos`.

2. `js/header.js`
   - **Tipo:** navegación.
   - **Objetivo:** incluir opción “Cierre turnos antiguos” en el menú de Cierre de turno.

3. `js/permissions.js`
   - **Tipo:** control de acceso.
   - **Objetivo:** registrar módulo `cierre_turno_anteriores` en entorno loggro y permisos por rol.

4. `js/access_control.local.js`
   - **Tipo:** control de acceso local y resolución de rutas.
   - **Objetivo:** mapear módulo nuevo a URL y hacerlo elegible dentro de prioridades LOGGRO.

## 3) Plan de emergencia / reversión detallada

> Si el sistema se rompe por esta incorporación, aplicar rollback en este orden.

### Paso A: desactivar acceso/navegación al módulo
1. En `js/header.js`, eliminar el link:
```html
<a href="${APP_URLS.cierreTurnoAntiguos}">Cierre turnos antiguos</a>
```
2. En `js/urls.js`, remover la clave:
```js
cierreTurnoAntiguos: route("/cierre_turno/turnos_anteriores.html")
```

### Paso B: remover control de permisos del módulo
1. En `js/permissions.js`:
   - quitar `cierre_turno_anteriores` de `PAGE_ENVIRONMENT`.
   - quitar `cierre_turno_anteriores` de cada rol en `DEFAULT_ROLE_PERMISSIONS`.
2. En `js/access_control.local.js`:
   - quitar `cierre_turno_anteriores` de `LOCAL_ROLE_ACCESS`.
   - quitar `MODULE_ROUTE_MAP.cierre_turno_anteriores`.
   - quitar de `LOGGRO_PRIORITY`.
   - quitar de `MODULE_ENV_MAP`.

### Paso C: retirar implementación física
Eliminar archivos:
- `cierre_turno/turnos_anteriores.html`
- `css/cierre_turnos_anteriores.css`
- `js/cierre_turnos_anteriores.js`

### Paso D: validar regreso a estado anterior
- Confirmar que el menú no muestra “Cierre turnos antiguos”.
- Confirmar que `cierre_turno/index.html` funciona sin regresiones.
- Ejecutar grep de seguridad:
```bash
rg -n "cierreTurnoAntiguos|cierre_turno_anteriores|turnos_anteriores"
```
Esperado en rollback total: **sin resultados**.

## 4) Convención de nombre
Archivo nombrado con fecha actual en formato `AAAA-MM-DD` + resumen:
- `2026-04-16 _ Submodulo cierre turnos antiguos.md`

## 5) Guía para exportar este cambio masivo a otro repositorio

### Orden recomendado de portabilidad
1. Copiar archivos nuevos (HTML/CSS/JS del módulo).
2. Agregar la ruta en archivo centralizado de URLs (en este repo es `js/urls.js`).
3. Integrar link en header/menú (en este repo `js/header.js`).
4. Registrar módulo en capa de permisos:
   - mapa módulo->entorno,
   - permisos por rol,
   - mapa módulo->ruta,
   - prioridad de resolución.
5. Validar que el endpoint de envío sea el mismo de cierres normales (`WEBHOOK_SUBIR_CIERRE`) para no duplicar flujos.

### Particularidades de este repo a respetar
- Las URLs se centralizan en `js/urls.js`.
- El acceso usa combinación de:
  - `js/permissions.js` (base),
  - `js/access_control.local.js` (local + fallback).
- Responsables se cargan con `fetchResponsablesActivos` (`js/responsables.js`).

### Validaciones mínimas post-port
- El menú muestra el submódulo y abre la ruta correcta.
- El módulo consulta totales y gastos del día.
- La distribución no permite superar total del sistema por campo.
- El payload final llega al mismo webhook de cierre normal.

## 6) Checklist funcional (log)
- [x] Cierre turno normal: **funciona** (sin cambios directos de lógica).
- [x] Submódulo turnos antiguos: **funciona** (consulta totales, distribución, validación, envío).
- [x] Permisos/ruteo del módulo nuevo: **funciona**.
- [ ] Ajustes finos UX de redistribución: **pendiente de iteración con operación real**.

## 7) Política de parches posteriores
Si se agregan ajustes sobre este cambio grande, actualizar este mismo archivo y renombrar con sufijo de parches:
- `2026-04-16 _ Submodulo cierre turnos antiguos y 1 parche`
- `2026-04-16 _ Submodulo cierre turnos antiguos y 2 parches`
- etc.


---

## Parche 1 (2026-04-16): migración de dominio de webhooks n8n

### Objetivo del parche
Actualizar el dominio de los webhooks n8n desde `n8n.globalnexoshop.com` a `n8n.enkrato.com` para restaurar conectividad de toda la plataforma.

### Archivo afectado
- `js/webhooks.js`
  - Reemplazo masivo de dominio en todos los endpoints n8n productivos.

### Reversión de emergencia del parche
Si se requiere revertir este parche puntual:
1. Abrir `js/webhooks.js`.
2. Reemplazar `n8n.enkrato.com` por `n8n.globalnexoshop.com`.
3. Validar con:
   - `rg -n "n8n\.(enkrato|globalnexoshop)\.com" js/webhooks.js`

### Estado (log)
- [x] webhooks n8n: dominio actualizado a enkrato.
- [x] submódulo turnos antiguos: sin cambios funcionales, conserva compatibilidad.
