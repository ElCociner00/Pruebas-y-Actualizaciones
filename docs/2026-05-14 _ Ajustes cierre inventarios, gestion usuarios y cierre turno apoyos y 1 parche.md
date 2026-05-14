# Objetivo
Corregir el parche previo: restaurar carga completa de usuarios, asegurar visibilidad condicional de formularios, añadir bloque de apoyos faltante en cierre turno, y dejar guía de migración/reversión.

## Archivos implicados y cambios
- `js/gestion_usuarios.js`: se removió columna `correo` del select a Supabase (causaba HTTP 400), se construyó mapa por `id` para resolver email de `otros_usuarios` desde `usuarios_sistema`, manteniendo botón de reset por fila.
- `gestion_personal/index.html`: se añadieron `autocomplete` a contraseñas y `style=display:none` inicial en ambos formularios.
- `js/gestion_personal.js`: además de `hidden`, se fuerza `display:none/block` para impedir doble render por estilos externos.
- `cierre_turno/index.html`: se agregó el bloque UI de apoyos faltante (`apoyo_hubo`, `apoyo_cantidad`, `consultarPropinaApoyos`, `apoyoRows`, etc.) para que la lógica existente en `js/cierre_turno.js` opere.

## Reversión de emergencia
1. `js/gestion_usuarios.js`: revertir `select(...email)` a estructura anterior y eliminar `bySistemaId` + `email` de `otrosUsuarios` si deseas volver al comportamiento previo.
2. `gestion_personal/index.html` y `js/gestion_personal.js`: quitar `style` y lógica `display` si deseas usar solo `hidden`.
3. `cierre_turno/index.html`: eliminar sección `<section class="bloque apoyos-inline-block">...` completa para regresar a UI previa sin apoyos.

## Exportar a otro repositorio
1. Copiar parches de estos archivos manteniendo mismos IDs del DOM.
2. Confirmar que `js/webhooks.js` centraliza URLs (este repo depende de ello).
3. Validar que tablas Supabase tengan `usuarios_sistema.email` y no dependan de `correo`.
4. Verificar que el CSS de apoyos (`css/cierre_turno.css`) ya existe; si no, migrarlo junto con el bloque HTML.

## Check funcional (log)
- Gestión usuarios: **funciona** cargando usuarios sin 400 por columna inexistente.
- Formularios alta usuarios: **funciona** (ocultos por defecto y muestra solo uno).
- Cierre turno/apoyos: **funciona** en UI (bloque visible y enlazable a lógica JS).
- Cierre inventarios: **sin cambios en este parche** (se mantiene estado del parche previo).

## Nota de parche
Este documento extiende el cambio grande del 2026-05-14 y corresponde a **1 parche posterior**.
