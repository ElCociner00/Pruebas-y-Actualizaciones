# Objetivo
Aplicar una actualización integral de experiencia de usuario para onboarding inicial, claridad de formularios y mensajes operativos en módulos críticos antes de recibir nuevos usuarios.

## Archivos implicados y cambios
- `registro/usuario.html`: se transformó en formulario con labels visibles por campo; se retiró texto de correo sugerido; se agregó control visual para mostrar/ocultar contraseña.
- `js/usuario.js`: se eliminó lógica de `correo sugerido`; se añadió sanitización para nombre (sin caracteres especiales) y toggle de contraseña.
- `css/usuario.css`: estilos para bloque de contraseña con botón “ojito”.
- `registro/index.html`: se agregaron labels y ajuste de texto en NIT a `NIT (sin dígito de verificación)`.
- `js/registro.js`: se añadió sanitización para campos de negocio (nombre comercial y razón social) permitiendo solo letras, números y espacios; correo mantiene formato libre por ser email.
- `configuracion/loggro.html`: se reemplazó formulario de token/url por correo+contraseña de Loggro.
- `js/loggro.js`: payload actualizado para enviar `correo`, `password`, `url: loggro.com` y `plataforma: loggro`; se agregó toggle de contraseña.
- `css/loggro.css`: estilos para botón “ojito” en contraseña.
- `js/cierre_turno.js`: corrección de consulta de gastos para respetar `data.ok === false`, mostrar `data.message` real y activar bandera local de onboarding cuando falten credenciales de Loggro.
- `cierre_turno/historico_cierre_turno.html`: simplificación de filtros para dejar únicamente rango de fechas.
- `js/historico_cierre_turno.js`: ajustes defensivos por filtros eliminados y mensaje de error legible para usuario final.
- `js/historico_cierre_inventarios.js`: mensajes de estado más claros (sin tecnicismos).

## Reversión de emergencia
1. Formularios registro/loggro:
   - Restaurar `placeholder`-only inputs previos.
   - Quitar botones `togglePassword` y `toggleLoggroPassword`.
   - En `js/loggro.js`, volver payload a `token` + `url`.
2. Sanitización:
   - En `js/registro.js` y `js/usuario.js`, retirar funciones `normalizeBusinessText`/`normalizeTextValue` y sus listeners.
3. Cierre turno gastos:
   - En `js/cierre_turno.js`, eliminar bloque `if (data?.ok === false)` para volver a comportamiento anterior.
4. Históricos:
   - Reinsertar inputs eliminados en `cierre_turno/historico_cierre_turno.html`.
   - Restaurar mensajes previos en `js/historico_cierre_turno.js` y `js/historico_cierre_inventarios.js`.

## Exportación a otro repositorio
1. Copiar en bloque los archivos listados arriba.
2. Verificar que el repositorio destino también use archivo central de webhooks (`js/webhooks.js`) y que `WEBHOOK_REGISTRO_CREDENCIALES` apunte al flujo n8n que recibe `correo/password`.
3. Confirmar que las páginas de registro carguen los JS exactos (`registro.js` y `usuario.js`) sin duplicados de listeners.
4. Revisar conflictos con validadores existentes para no duplicar sanitización.
5. Probar manualmente: registro empresa, registro admin, conexión loggro, cierre turno/consultar gastos, históricos turno/inventario.

## Check funcional (logs)
- ✅ Registro empresa: más claro y con NIT etiquetado sin dígito de verificación.
- ✅ Registro usuario admin: más claro, sin texto sugerido, con visor de contraseña.
- ✅ Loggro configuración: simplificado a correo/contraseña.
- ✅ Cierre turno (consultar gastos): respeta `ok:false` y muestra mensaje real.
- ✅ Histórico cierre turno: filtros reducidos a rango de fecha y errores legibles.
- ✅ Histórico inventarios: mensajes más claros.
- ⚠️ Guía visual animada completa por flechas multinivel: parcial (se deja bandera de onboarding para continuar integración por pasos).
- ⚠️ Fusión total de módulos de usuarios + recuperación de contraseña: pendiente para siguiente entrega.
