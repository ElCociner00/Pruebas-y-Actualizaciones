export const GITHUB_PAGES_BASE_PATH = "/Pruebas-y-Actualizaciones";

const route = (path = "") => `${GITHUB_PAGES_BASE_PATH}${path}`;

export const APP_URLS = {
  home: route("/"),
  login: route("/index.html"),
  dashboard: route("/dashboard/"),
  registro: route("/registro/"),
  registroIndex: route("/registro/index.html"),
  registroUsuario: route("/registro/usuario.html"),
  cierreTurno: route("/cierre_turno/"),
  cierreTurnoAntiguos: route("/cierre_turno/turnos_anteriores.html"),
  cierreTurnoHistorico: route("/cierre_turno/historico_cierre_turno.html"),
  cierreInventarios: route("/cierre_inventarios/"),
  cierreInventariosHistorico: route("/cierre_inventarios/historico_cierre_inventarios.html"),
  inventarios: route("/inventarios/"),
  configuracion: route("/configuracion/"),
  configuracionLoggro: route("/configuracion/loggro.html"),
  visualizacionCierreTurno: route("/configuracion/visualizacion_cierre_turno.html"),
  visualizacionCierreTurnoHistorico: route("/configuracion/visualizacion_cierre_turno_historico.html"),
  visualizacionCierreInventarios: route("/configuracion/visualizacion_cierre_inventarios.html"),
  visualizacionCierreInventariosHistorico: route("/configuracion/visualizacion_cierre_inventarios_historico.html"),
  permisos: route("/configuracion/permisos.html"),
  registroEmpleados: route("/configuracion/registro_empleados.html"),
  registroOtrosUsuarios: route("/configuracion/registro_otros_usuarios.html"),
  gestionUsuarios: route("/configuracion/gestion_usuarios.html"),
  gestionEmpresas: route("/gestion_empresas/"),
  facturacion: route("/facturacion/"),
  revisionPagos: route("/facturacion/revision_pagos.html"),
  dashboardSiigo: route("/siigo/dashboard_siigo/"),
  configuracionSiigo: route("/siigo/configuracion_siigo/"),
  subirFacturasSiigo: route("/siigo/subir_facturas_siigo/"),
  historicoFacturasSiigo: route("/siigo/subir_facturas_siigo/"),
  nomina: route("/nomina/"),
  configuracionNominaParametros: route("/configuracion/parametros_nomina.html"),
  legalTerminos: route("/legal/terminos.html"),
  legalPrivacidad: route("/legal/privacidad.html"),
  legalCookies: route("/legal/cookies.html"),
  legalDatos: route("/legal/datos.html"),
  legalResponsabilidad: route("/legal/responsabilidad.html"),
  legalSeguridad: route("/legal/seguridad.html"),
  legalConsentimientos: route("/legal/consentimientos.html")
};

export const APP_ASSETS = {
  logo: route("/images/Logo.webp"),
  mobileCss: route("/css/mobile_native.css"),
  bannerCss: route("/css/banner_impago.css"),
  bannerHtml: route("/components/banner_impago.html")
};
