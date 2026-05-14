# Objetivo
Consolidar, para migración a `main`, los cambios ya implementados en:
1) **Gestión de usuarios** (antes dispersa entre `gestion_personal/` y `configuracion/contrasena.html`, ahora centralizada desde la vista accesible por header), y
2) **Cierre de inventarios** (mejoras de flujo, payload y consistencias).

> Nota: este documento **ignora apoyos/cierre turno** por instrucción directa del solicitante.

---

## 1) Resumen ejecutivo de cambios

### A. Usuarios (unificación de módulos)
Se unificó la operación de usuarios para que administración y seguridad de credenciales convivan en el mismo módulo de gestión personal:
- La gestión de altas (empleado/admin/revisor) permanece en `gestion_personal`.
- La recuperación de contraseña por usuario se ejecuta desde la tabla de usuarios en gestión personal (botón por fila “Enviar correo”).
- El cambio de contraseña del usuario autenticado se movió visualmente al mismo módulo.
- La experiencia final se consume desde navegación habitual (header), evitando ir a un submódulo de configuración separado para tareas de usuario.

### B. Inventarios (mejoras funcionales)
- Se agregó campo obligatorio `momento_inventario` (Apertura/Cierre).
- La columna visual pasó de “Restante” a “Diferencia”.
- Cálculo de diferencia con signo: `stock_actual - stock_sistema`.
- Flujo de inconsistencias ahora automático luego de verificar (filas precargadas con producto y diferencia).
- Se permite coma decimal en “stock actual” para casos de gramaje.

---

## 2) Archivos implicados y qué hace cada uno

## Usuarios

### `gestion_personal/index.html`
**Tipo de cambio:** UI/UX y estructura de módulo unificado.

**Qué se cambió:**
- Formularios de alta (`formEmpleado`, `formOtro`) reforzados para iniciar ocultos.
- Inputs de contraseña con `autocomplete`.
- Sección “Cambiar tu contraseña” integrada en la misma pantalla.

**Objetivo técnico:**
- Evitar render simultáneo de formularios.
- Unificar alta + seguridad básica en un solo punto operativo.

### `js/gestion_personal.js`
**Tipo de cambio:** Lógica de visibilidad y alta de usuarios.

**Qué se cambió:**
- `renderAlta()` controla `hidden` y `display` para mostrar solo un formulario según selector.

**Objetivo técnico:**
- Robustecer visibilidad ante CSS heredado/colisiones.

### `js/gestion_usuarios.js`
**Tipo de cambio:** Integración de tabla de usuarios + acciones de seguridad.

**Qué se cambió:**
- Carga de usuarios desde `usuarios_sistema`, `otros_usuarios`, `empleados`.
- Inclusión de columna “Reset contraseña” por fila.
- Resolución de email por `id` para soportar usuarios provenientes de distintas tablas.
- Acción por click para envío de recuperación usando helper global.
- Import dinámico de `contrasena.js` para exponer helper de recuperación.

**Objetivo técnico:**
- Gestionar activación/desactivación y recuperación desde una sola tabla.

### `js/contrasena.js`
**Tipo de cambio:** Reutilización funcional.

**Qué se cambió:**
- Exposición de `window.sendRecoveryForEmail(email)` para reutilizar desde gestión usuarios.
- Conservación de flujo de actualización de contraseña del usuario autenticado.

**Objetivo técnico:**
- Evitar duplicidad de lógica de recuperación.
- Reusar el mismo motor Supabase Auth para reset/update.

## Inventarios

### `cierre_inventarios/index.html`
**Tipo de cambio:** UI/semántica de operación.

**Qué se cambió:**
- Select `momento_inventario` con opciones Apertura/Cierre.
- Renombre de encabezado de columna final a “Diferencia”.
- Ajuste visual del bloque de inconsistencias para acompañar autogeneración.

### `js/cierre_inventarios.js`
**Tipo de cambio:** Flujo de validación, cálculo y payload.

**Qué se cambió:**
- Validación obligatoria de `momento_inventario`.
- Inclusión de `momento_inventario` en payload base.
- Cálculo de diferencia como `stock_actual - stock_sistema`.
- Generación automática de inconsistencias en verificación a partir de diferencias != 0.
- Ajuste de sanitización para aceptar coma decimal en stock actual.
- Envío de `cantidad_inconsistencias` calculada automáticamente.

---

## 3) Reversión de emergencia (archivo por archivo)

## Usuarios

### Revertir unificación visual en `gestion_personal/index.html`
1. Retirar bloque de “Cambiar tu contraseña” al final del módulo.
2. Restaurar flujo antiguo apuntando a `configuracion/contrasena.html` como vista separada.

### Revertir alternancia reforzada en `js/gestion_personal.js`
1. En `renderAlta()`, eliminar control por `style.display`.
2. Dejar solo `hidden` (comportamiento original simple).

### Revertir reset por fila en `js/gestion_usuarios.js`
1. Eliminar columna “Reset contraseña” de la tabla renderizada.
2. Eliminar listener de click `data-action="reset"`.
3. Eliminar `import("./contrasena.js")` si no será reutilizado.

### Revertir helper global en `js/contrasena.js`
1. Eliminar `window.sendRecoveryForEmail`.
2. Mantener solo lógica local del formulario de contraseña si se desea.

## Inventarios

### Revertir campo `momento_inventario`
1. Quitar select del HTML.
2. Quitar validación y `momento_inventario` del payload en JS.

### Revertir inconsistencias automáticas
1. Restaurar controles manuales de inconsistencias (si/no + cantidad).
2. Eliminar bloque `inconsistenciasAuto` y reconstruir flujo manual previo.

### Revertir diferencia con signo
1. Restaurar fórmula anterior si el negocio requiere otro criterio.
2. Renombrar encabezado “Diferencia” a “Restante” en UI y exportación.

---

## 4) Guía para migrar a `main` (paso a paso)

1. **Cherry-pick recomendado** de commits relacionados a usuarios e inventarios (sin apoyos):
   - Identificar commits que tocan exclusivamente:
     - `gestion_personal/index.html`
     - `js/gestion_personal.js`
     - `js/gestion_usuarios.js`
     - `js/contrasena.js`
     - `cierre_inventarios/index.html`
     - `js/cierre_inventarios.js`

2. **Validar dependencias de IDs DOM** en `main`:
   - Que existan los mismos IDs usados por JS (formularios, tabla de usuarios, inputs de inventario).

3. **Verificar centralización de URLs/webhooks**:
   - Este repo depende de `js/webhooks.js` como fuente central.
   - Replicar misma convención en `main` para no romper llamadas.

4. **Validar esquema Supabase**:
   - Confirmar que `usuarios_sistema` tenga `email` (no asumir `correo`).
   - Confirmar relaciones por `id` entre `usuarios_sistema` y `otros_usuarios` para resolver correo por fila.

5. **Smoke tests en `main` tras migrar**:
   - Gestión usuarios: listar todos los usuarios de empresa sin HTTP 400.
   - Formularios alta: inicio ocultos, mostrar solo uno por selector.
   - Reset contraseña por fila: envía correo usando email de esa fila.
   - Cambio contraseña propio: actualiza y cierra sesión.
   - Inventarios: exige `momento_inventario`, calcula diferencias con signo, autogenera inconsistencias al verificar.

---

## 5) Estado funcional (check de logs)
- **Gestión usuarios (tabla + toggle + reset por fila):** funcionando en rama de pruebas.
- **Alta de empleados/admin/revisor (visibilidad condicional):** funcionando con ocultamiento reforzado.
- **Cambio de contraseña del usuario autenticado en gestión personal:** funcionando.
- **Cierre inventarios (momento, diferencia con signo, inconsistencias automáticas):** funcionando según flujo actualizado.
- **Apoyos/cierre turno:** excluido en esta guía por instrucción.

---

## 6) Notas operativas para equipo
- Si en `main` aparece error 400 al listar usuarios, revisar inmediatamente columnas del `select` en `usuarios_sistema`.
- Si se vuelven a mostrar ambos formularios, auditar CSS global y mantener la doble estrategia `hidden + display`.
- Si falla recuperación por fila, verificar disponibilidad de `window.sendRecoveryForEmail` (import de `contrasena.js`) y sesión auth activa.
- Para inventarios con gramaje, mantener regla de coma decimal y validaciones de parsing consistentes en todo el pipeline.
