# Registro de cambios — 2026-04-15 22:01 UTC (Cambios previos no documentados)

## Objetivo original solicitado
Separar el repositorio de pruebas del repositorio principal cambiando rutas internas de GitHub Pages, crear un archivo central de URLs internas (distinto a `webhooks.js`), habilitar avances del módulo de nómina y mejorar la constancia visual de cierre para incluir totales.

## Resumen de lo que se había cambiado
1. Se centralizaron URLs internas en `js/urls.js` (`APP_URLS`, `APP_ASSETS`, `GITHUB_PAGES_BASE_PATH`) para apuntar a `/Pruebas-y-Actualizaciones`.
2. Se migraron múltiples referencias hardcodeadas de rutas internas a `APP_URLS` / `APP_ASSETS`.
3. Se añadió configuración de parámetros de nómina y lógica base del módulo nómina con integración a webhook.
4. Se añadió webhook de nómina en `js/webhooks.js`.
5. Se mejoró la imagen de cierre de turno para mostrar totales.

## Archivos implicados (alto nivel)
- URLs/ruteo interno: `js/urls.js`, `js/config.js`, `js/router.js`, `js/header.js`, `js/footer.js`, `js/auth.js`, `js/access_control.local.js`, `js/public_chrome.js`, `js/mobile_shell.js`, `index.html`, `components/banner_impago.html`.
- Nómina: `nomina/index.html`, `css/nomina.css`, `js/nomina.js`, `configuracion/index.html`, `configuracion/parametros_nomina.html`, `js/parametros_nomina.js`.
- Webhooks: `js/webhooks.js`.
- Cierre turno PNG: `js/cierre_turno.js`.

## Reversión (si se requiere)
1. **Rutas internas**: restaurar prefijos anteriores en `js/urls.js` o regresar a hardcodes previos (no recomendado).
2. **Nómina parámetros**: eliminar enlace de configuración y remover `configuracion/parametros_nomina.html` + `js/parametros_nomina.js`.
3. **Webhook nómina**: retirar `WEBHOOK_NOMINA_TRANSFORMACION` y `WEBHOOKS.NOMINA_TRANSFORMACION` de `js/webhooks.js`.
4. **Totales en PNG de cierre**: revertir bloques de totales añadidos en `js/cierre_turno.js`.

## Nota
Este archivo se crea para dejar trazabilidad explícita de cambios ya aplicados que no habían quedado registrados en `docs/`.
