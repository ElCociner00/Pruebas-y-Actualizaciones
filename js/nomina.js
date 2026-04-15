import { getUserContext } from "./session.js";
import { fetchResponsablesActivos } from "./responsables.js";
import { getActiveEnvironment } from "./environment.js";
import { supabase } from "./supabase.js";
import { WEBHOOK_NOMINA_TRANSFORMACION } from "./webhooks.js";

const empresaInput = document.getElementById("nominaEmpresa");
const fechaInicioInput = document.getElementById("nominaFechaInicio");
const fechaFinInput = document.getElementById("nominaFechaFin");
const corteSelect = document.getElementById("nominaCorte");
const empleadoSelect = document.getElementById("nominaEmpleado");
const consultarBtn = document.getElementById("consultarNomina");
const descargarBtn = document.getElementById("descargarComprobanteNomina");

const totalDevengadoEl = document.getElementById("nominaTotalDevengado");
const totalDeduccionesEl = document.getElementById("nominaTotalDeducciones");
const totalNetoEl = document.getElementById("nominaTotalNeto");
const movimientosBody = document.getElementById("nominaMovimientosBody");
const statusEl = document.getElementById("nominaStatus");

const empresaNombreEl = document.getElementById("nominaEmpresaNombre");
const empresaNitEl = document.getElementById("nominaEmpresaNit");
const empleadoDataEl = document.getElementById("nominaEmpleadoData");
const ingresosBody = document.getElementById("nominaIngresosBody");
const deduccionesBody = document.getElementById("nominaDeduccionesBody");
const totalIngresosTablaEl = document.getElementById("nominaTotalIngresosTabla");
const totalDeduccionesTablaEl = document.getElementById("nominaTotalDeduccionesTabla");
const netoPagarEl = document.getElementById("nominaNetoPagarComprobante");
const resumenMovimientosEl = document.getElementById("nominaResumenMovimientos");

const state = {
  context: null,
  responsables: [],
  empresa: null,
  parametros: [],
  ingresos: [],
  deducciones: [],
  tablaDetalle: [],
  resumenMovimientos: {
    inventarios: "Sin datos",
    cierre_turno: "Sin datos",
    horas_trabajadas: 0,
    observaciones: []
  }
};

const fmtMoney = (value) => Number(value || 0).toLocaleString("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const setStatus = (message) => {
  if (statusEl) statusEl.textContent = message || "";
};

const setDefaultDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 15);
  fechaInicioInput.value = start.toISOString().slice(0, 10);
  fechaFinInput.value = end.toISOString().slice(0, 10);
  corteSelect.value = "quincenal";
};

const canAccess = (role) => {
  const safeRole = String(role || "").toLowerCase();
  return safeRole === "admin" || safeRole === "admin_root";
};

const parseTipo = (tipoRaw) => {
  const tipo = String(tipoRaw || "").trim().toUpperCase();
  return tipo === "DEDUCCION" ? "DEDUCCION" : "INGRESO";
};

const normalizeParametro = (row) => ({
  id: row?.id || "",
  nombre: String(row?.nombre || "").trim() || "Concepto",
  tipo: parseTipo(row?.tipo),
  valor: asNumber(row?.valor),
  unidad: String(row?.unidad || "pesos").trim() || "pesos"
});

const toNominaItem = (row, origin = "parametros_nomina") => ({
  concepto: String(row?.concepto || row?.nombre || "Concepto").trim() || "Concepto",
  tipo: parseTipo(row?.tipo),
  cantidad: asNumber(row?.cantidad || 1),
  valor: asNumber(row?.valor),
  fuente: String(row?.fuente || origin).trim() || origin,
  estado: String(row?.estado || "Liquidable").trim() || "Liquidable"
});

const renderEmpleadoOptions = () => {
  if (!empleadoSelect) return;
  empleadoSelect.innerHTML = '<option value="">Selecciona un empleado</option>';
  state.responsables.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nombre_completo;
    empleadoSelect.appendChild(option);
  });
};

const renderResumenMovimientos = () => {
  if (!resumenMovimientosEl) return;
  const resumen = state.resumenMovimientos || {};
  const observaciones = Array.isArray(resumen.observaciones) ? resumen.observaciones : [];
  const extras = observaciones.length
    ? observaciones.map((line) => `<li>• ${line}</li>`).join("")
    : "<li>• Sin observaciones adicionales.</li>";

  resumenMovimientosEl.innerHTML = `
    <li>Inventarios: ${resumen.inventarios || "Sin datos"}</li>
    <li>Cierre de turno: ${resumen.cierre_turno || "Sin datos"}</li>
    <li>Horas calculadas: ${asNumber(resumen.horas_trabajadas)}</li>
    ${extras}
  `;
};

const sumItems = (list) => (Array.isArray(list) ? list : []).reduce((acc, item) => {
  const cantidad = asNumber(item.cantidad || 1);
  const valor = asNumber(item.valor);
  return acc + (cantidad * valor);
}, 0);

const renderResumen = () => {
  const ingresos = sumItems(state.ingresos);
  const deducciones = sumItems(state.deducciones);

  totalDevengadoEl.textContent = fmtMoney(ingresos);
  totalDeduccionesEl.textContent = fmtMoney(deducciones);
  totalNetoEl.textContent = fmtMoney(ingresos - deducciones);
  totalIngresosTablaEl.textContent = fmtMoney(ingresos);
  totalDeduccionesTablaEl.textContent = fmtMoney(deducciones);
  netoPagarEl.textContent = fmtMoney(ingresos - deducciones);
};

const renderMovimientos = () => {
  if (!state.tablaDetalle.length) {
    movimientosBody.innerHTML = "<tr><td colspan='6'>No hay movimientos para este período y empleado.</td></tr>";
  } else {
    movimientosBody.innerHTML = state.tablaDetalle.map((item) => `
      <tr>
        <td>${item.empleado_nombre || "-"}</td>
        <td>${item.concepto || "-"}</td>
        <td>${item.tipo || "-"}</td>
        <td>${fmtMoney(asNumber(item.valor) * asNumber(item.cantidad || 1))}</td>
        <td>${item.fuente || "-"}</td>
        <td>${item.estado || "Liquidable"}</td>
      </tr>
    `).join("");
  }

  ingresosBody.innerHTML = (state.ingresos.length ? state.ingresos : [{ concepto: "Sin ingresos", cantidad: 0, valor: 0 }])
    .map((item) => `<tr><td>${item.concepto}</td><td>${asNumber(item.cantidad)}</td><td>${fmtMoney(asNumber(item.valor) * asNumber(item.cantidad || 1))}</td></tr>`)
    .join("");

  deduccionesBody.innerHTML = (state.deducciones.length ? state.deducciones : [{ concepto: "Sin deducciones", cantidad: 0, valor: 0 }])
    .map((item) => `<tr><td>${item.concepto}</td><td>${asNumber(item.cantidad)}</td><td>${fmtMoney(asNumber(item.valor) * asNumber(item.cantidad || 1))}</td></tr>`)
    .join("");

  renderResumen();
  renderResumenMovimientos();
};

const renderComprobanteHeader = (empleado) => {
  const periodo = `${fechaInicioInput.value || "-"} - ${fechaFinInput.value || "-"}`;
  const comprobanteNumero = `NOM-${Date.now().toString().slice(-6)}`;
  const salarioBase = state.ingresos
    .filter((item) => String(item.concepto || "").toLowerCase().includes("salario"))
    .reduce((acc, item) => acc + asNumber(item.valor) * asNumber(item.cantidad || 1), 0);

  empleadoDataEl.innerHTML = `
    <div>Periodo de Pago: ${periodo}</div>
    <div>Comprobante Número: ${comprobanteNumero}</div>
    <div><strong>Nombre: ${empleado?.nombre_completo || "-"}</strong></div>
    <div>Identificación: ${empleado?.cedula || "-"}</div>
    <div>Cargo: ${empleado?.rol || "operativo"}</div>
    <div>Salario básico: ${fmtMoney(salarioBase)}</div>
  `;
};

const loadParametrosNomina = async (empresaId) => {
  const { data, error } = await supabase
    .from("parametros_nomina")
    .select("id,nombre,tipo,valor,unidad")
    .eq("empresa_id", empresaId)
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    state.parametros = [];
    return { ok: false, error };
  }

  state.parametros = (Array.isArray(data) ? data : []).map(normalizeParametro);
  return { ok: true };
};

const callNominaWebhook = async (payload) => {
  const response = await fetch(WEBHOOK_NOMINA_TRANSFORMACION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook nómina respondió HTTP ${response.status}`);
  }

  return await response.json();
};

const buildFromParametros = () => {
  const baseIngresos = state.parametros
    .filter((item) => item.tipo === "INGRESO")
    .map((item) => toNominaItem({ ...item, cantidad: 1, fuente: "parametros_nomina", estado: "Base" }));

  const baseDeducciones = state.parametros
    .filter((item) => item.tipo === "DEDUCCION")
    .map((item) => toNominaItem({ ...item, cantidad: 1, fuente: "parametros_nomina", estado: "Base" }));

  return { baseIngresos, baseDeducciones };
};

const mergeNominaData = ({ webhookData, empleado }) => {
  const { baseIngresos, baseDeducciones } = buildFromParametros();

  const webhookIngresos = (Array.isArray(webhookData?.ingresos) ? webhookData.ingresos : [])
    .map((item) => toNominaItem({ ...item, tipo: "INGRESO", fuente: item?.fuente || "n8n" }, "n8n"));

  const webhookDeducciones = (Array.isArray(webhookData?.deducciones) ? webhookData.deducciones : [])
    .map((item) => toNominaItem({ ...item, tipo: "DEDUCCION", fuente: item?.fuente || "n8n" }, "n8n"));

  state.ingresos = [...baseIngresos, ...webhookIngresos];
  state.deducciones = [...baseDeducciones, ...webhookDeducciones];

  if (!state.ingresos.length && !state.deducciones.length) {
    state.ingresos = [{ concepto: "Sin parámetros de ingreso", tipo: "INGRESO", cantidad: 0, valor: 0, fuente: "default", estado: "Sin configuración" }];
    state.deducciones = [{ concepto: "Sin parámetros de deducción", tipo: "DEDUCCION", cantidad: 0, valor: 0, fuente: "default", estado: "Sin configuración" }];
  }

  const empleadoNombre = empleado?.nombre_completo || "Empleado";
  state.tablaDetalle = [...state.ingresos, ...state.deducciones].map((item) => ({
    ...item,
    empleado_nombre: empleadoNombre
  }));

  const resumen = webhookData?.resumen_movimientos || webhookData?.resumen || {};
  state.resumenMovimientos = {
    inventarios: String(resumen?.inventarios || "Sin datos"),
    cierre_turno: String(resumen?.cierre_turno || "Sin datos"),
    horas_trabajadas: asNumber(resumen?.horas_trabajadas),
    observaciones: Array.isArray(resumen?.observaciones) ? resumen.observaciones : []
  };
};

const consultarNomina = async () => {
  const empleadoId = empleadoSelect.value;
  if (!empleadoId) {
    setStatus("Selecciona un empleado para consultar su nómina.");
    return;
  }

  if (!fechaInicioInput.value || !fechaFinInput.value) {
    setStatus("Debes seleccionar un rango de fechas (desde - hasta).");
    return;
  }

  setStatus("Consultando y transformando datos de nómina...");

  const paramsResult = await loadParametrosNomina(state.context.empresa_id);
  if (!paramsResult.ok) {
    setStatus(`No fue posible cargar parámetros de nómina. Se usarán ceros. (${paramsResult.error?.message || "sin detalle"})`);
  }

  const empleado = state.responsables.find((item) => item.id === empleadoId);
  const payload = {
    empresa_id: state.context.empresa_id,
    empleado_id: empleadoId,
    empleado_nombre: empleado?.nombre_completo || "",
    corte: corteSelect.value || "quincenal",
    fecha_inicio: fechaInicioInput.value,
    fecha_fin: fechaFinInput.value,
    entorno: getActiveEnvironment() || "global"
  };

  let webhookData = {};
  try {
    webhookData = await callNominaWebhook(payload);
  } catch (error) {
    webhookData = {};
    setStatus(`Webhook de nómina no disponible por ahora. Se mostrará liquidación base con parámetros (${error?.message || "sin detalle"}).`);
  }

  mergeNominaData({ webhookData, empleado });
  renderComprobanteHeader(empleado);
  renderMovimientos();

  if (!String(statusEl?.textContent || "").includes("Webhook")) {
    setStatus(`Consulta completada en ${getActiveEnvironment() || "global"}. Ingresos: ${state.ingresos.length}, deducciones: ${state.deducciones.length}.`);
  }
};

const descargarComprobante = () => {
  const empleado = state.responsables.find((item) => item.id === empleadoSelect.value);
  if (!empleado) {
    setStatus("Selecciona un empleado antes de descargar el comprobante.");
    return;
  }

  const totalIngresos = sumItems(state.ingresos);
  const totalDeducciones = sumItems(state.deducciones);
  const neto = totalIngresos - totalDeducciones;

  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 54px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Comprobante de Nómina", canvas.width / 2, 76);
  ctx.textAlign = "left";

  const leftX = 70;
  const rightX = 1020;
  let y = 140;
  ctx.font = "bold 24px Arial";
  ctx.fillText(state.empresa?.nombre_comercial || "EMPRESA", leftX, y);
  y += 36;
  ctx.font = "20px Arial";
  ctx.fillText(`NIT ${state.empresa?.nit || "-"}`, leftX, y);

  let ry = 140;
  const periodo = `${fechaInicioInput.value || "-"} - ${fechaFinInput.value || "-"}`;
  const salarioBase = state.ingresos
    .filter((item) => String(item.concepto || "").toLowerCase().includes("salario"))
    .reduce((acc, item) => acc + asNumber(item.valor) * asNumber(item.cantidad || 1), 0);

  const lines = [
    `Periodo de Pago: ${periodo}`,
    `Comprobante Número: NOM-${Date.now().toString().slice(-6)}`,
    `Nombre: ${empleado.nombre_completo || "-"}`,
    `Identificación: ${empleado.cedula || "-"}`,
    `Cargo: ${empleado.rol || "operativo"}`,
    `Salario básico: ${fmtMoney(salarioBase)}`
  ];
  lines.forEach((line, index) => {
    ctx.font = index === 2 ? "bold 22px Arial" : "20px Arial";
    ctx.fillText(line, rightX, ry);
    ry += 34;
  });

  const tableTop = 360;
  const tableHeight = 500;
  const tableWidth = 860;
  const drawTable = (x, title, rows, total) => {
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(x, tableTop, tableWidth, 44);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 24px Arial";
    ctx.fillText(title, x + 12, tableTop + 30);

    ctx.font = "bold 18px Arial";
    ctx.fillText("Concepto", x + 12, tableTop + 72);
    ctx.fillText("Cant.", x + 520, tableTop + 72);
    ctx.fillText("Valor", x + 650, tableTop + 72);

    let rowY = tableTop + 104;
    (rows.length ? rows : [{ concepto: "Sin datos", valor: 0, cantidad: 0 }]).slice(0, 10).forEach((item) => {
      ctx.font = "17px Arial";
      ctx.fillText(item.concepto || "-", x + 12, rowY);
      ctx.fillText(String(asNumber(item.cantidad || 1)), x + 520, rowY);
      ctx.fillText(fmtMoney(asNumber(item.valor) * asNumber(item.cantidad || 1)), x + 650, rowY);
      rowY += 34;
    });

    ctx.font = "bold 20px Arial";
    ctx.fillText(`Total ${title.toLowerCase()}: ${fmtMoney(total)}`, x + 12, tableTop + tableHeight);
  };

  drawTable(70, "Ingresos", state.ingresos, totalIngresos);
  drawTable(980, "Deducciones", state.deducciones, totalDeducciones);

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(980, 910, 870, 120);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px Arial";
  ctx.fillText(`Inventarios: ${state.resumenMovimientos.inventarios || "Sin datos"}`, 1000, 952);
  ctx.fillText(`Cierre turno: ${state.resumenMovimientos.cierre_turno || "Sin datos"}`, 1000, 986);
  ctx.fillText(`Horas calculadas: ${asNumber(state.resumenMovimientos.horas_trabajadas)}`, 1000, 1020);

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(1180, 1070, 670, 92);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 30px Arial";
  ctx.fillText("NETO A PAGAR", 1210, 1128);
  ctx.textAlign = "right";
  ctx.fillText(fmtMoney(neto), 1820, 1128);
  ctx.textAlign = "left";

  ctx.fillStyle = "#6b7280";
  ctx.font = "16px Arial";
  ctx.fillText("Este comprobante fue generado por AXIOMA.", 70, 1240);

  const link = document.createElement("a");
  link.download = `comprobante_nomina_${(fechaFinInput.value || new Date().toISOString().slice(0, 10))}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  setStatus("Comprobante descargado correctamente.");
};

const init = async () => {
  setDefaultDates();
  state.context = await getUserContext().catch(() => null);
  if (!state.context?.empresa_id) {
    setStatus("No se pudo resolver la empresa activa para este módulo.");
    return;
  }

  if (!canAccess(state.context?.rol)) {
    setStatus("Acceso restringido: solo admin y admin_root pueden consultar nómina.");
    consultarBtn.disabled = true;
    descargarBtn.disabled = true;
    return;
  }

  empresaInput.value = state.context.empresa_id;
  state.responsables = await fetchResponsablesActivos(state.context.empresa_id).catch(() => []);
  renderEmpleadoOptions();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre_comercial,nit")
    .eq("id", state.context.empresa_id)
    .maybeSingle();
  state.empresa = empresa || null;
  empresaNombreEl.textContent = state.empresa?.nombre_comercial || "EMPRESA";
  empresaNitEl.textContent = `NIT ${state.empresa?.nit || "-"}`;

  await loadParametrosNomina(state.context.empresa_id);
  renderMovimientos();
  setStatus(`Módulo de nómina listo en modo compartido (${getActiveEnvironment() || "global"}).`);
};

consultarBtn?.addEventListener("click", consultarNomina);
descargarBtn?.addEventListener("click", descargarComprobante);

init();
