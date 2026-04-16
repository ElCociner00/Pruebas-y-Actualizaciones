import { enforceNumericInput } from "./input_utils.js";
import { getUserContext } from "./session.js";
import { fetchResponsablesActivos } from "./responsables.js";
import { WEBHOOK_CONSULTAR_DATOS_CIERRE, WEBHOOK_CONSULTAR_GASTOS, WEBHOOK_SUBIR_CIERRE } from "./webhooks.js";

document.addEventListener("DOMContentLoaded", () => {
  const fechaDia = document.getElementById("fechaDia");
  const btnConsultarTotales = document.getElementById("consultarTotales");
  const btnConsultarGastos = document.getElementById("consultarGastos");
  const btnVerificar = document.getElementById("verificarTotales");
  const btnSubir = document.getElementById("subirTurnos");
  const cantidadTurnos = document.getElementById("cantidadTurnos");
  const contenedorTurnos = document.getElementById("contenedorTurnos");
  const estado = document.getElementById("estado");
  const totalesDia = document.getElementById("totalesDia");

  const MONEY_FIELDS = ["efectivo", "datafono", "rappi", "nequi", "transferencias", "bono_regalo", "propina", "domicilios", "gastos"];
  const SYSTEM_RULE_FIELDS = ["efectivo", "datafono", "rappi", "nequi", "transferencias", "bono_regalo", "propina", "domicilios", "gastos"];
  const turnos = [];
  const responsables = [];
  const touched = new Map();
  const totals = {
    efectivo: 0,
    datafono: 0,
    rappi: 0,
    nequi: 0,
    transferencias: 0,
    bono_regalo: 0,
    propina: 0,
    domicilios: 0,
    gastos: 0
  };

  const asNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const setEstado = (msg, type = "") => {
    estado.textContent = msg;
    estado.className = `estado ${type}`.trim();
  };

  const getContextPayload = async () => {
    const context = await getUserContext();
    if (!context?.empresa_id) return null;
    return {
      empresa_id: context.empresa_id,
      tenant_id: context.empresa_id,
      usuario_id: context.user?.id || context.user?.user_id,
      rol: context.rol,
      registrado_por: context.user?.id || context.user?.user_id,
      timestamp: new Date().toISOString()
    };
  };

  const readResponseBody = async (res) => {
    const raw = await res.text();
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return { message: raw }; }
  };

  const getConsultaPayload = async () => {
    const contextPayload = await getContextPayload();
    if (!contextPayload || !fechaDia.value) return null;
    return {
      fecha: fechaDia.value,
      responsable: "",
      turno: {
        hora_llegada: "05:00 AM",
        inicio: "00:00",
        fin: "22:00",
        inicio_momento: "AM",
        fin_momento: "PM"
      },
      ...contextPayload
    };
  };

  const renderTotales = () => {
    const labels = {
      efectivo: "Efectivo sistema (total día)",
      datafono: "Datáfono sistema",
      rappi: "Rappi sistema",
      nequi: "Nequi sistema",
      transferencias: "Transferencias sistema",
      bono_regalo: "Bono regalo sistema",
      propina: "Propina total",
      domicilios: "Domicilios total",
      gastos: "Gastos total"
    };
    totalesDia.innerHTML = "";
    Object.entries(labels).forEach(([key, label]) => {
      const card = document.createElement("article");
      card.className = "total-card";
      card.innerHTML = `
        <span class="total-label">${label}</span>
        <strong>${String(totals[key] || 0)}</strong>
      `;
      totalesDia.append(card);
    });
  };

  const normalizeExtras = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.gastos)) return payload.gastos;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const formatFechaCompleta = (fecha) => `${fecha.replace(/-/g, "/")}T00:00:00`;

  const getTouchedSet = (field) => {
    if (!touched.has(field)) touched.set(field, new Set());
    return touched.get(field);
  };

  const getSystemInput = (turno, field) => turno.querySelector(`[data-field="${field}"][data-col="sistema"]`);
  const getAllSystemInputs = (field) => turnos.map((node) => getSystemInput(node, field));

  const distributeEvenly = (total, count) => {
    if (count <= 0) return [];
    const base = Math.floor(total / count);
    let rem = total - (base * count);
    return Array.from({ length: count }, () => {
      const extra = rem > 0 ? 1 : 0;
      rem = Math.max(rem - 1, 0);
      return base + extra;
    });
  };

  const applyInitialDistribution = () => {
    SYSTEM_RULE_FIELDS.forEach((field) => {
      const distribution = distributeEvenly(asNumber(totals[field]), turnos.length);
      getTouchedSet(field).clear();
      distribution.forEach((value, idx) => {
        const input = getSystemInput(turnos[idx], field);
        if (input) input.value = String(value);
      });
    });
  };

  const rebalanceFromEdit = (field, editedIdx) => {
    const total = asNumber(totals[field]);
    const inputs = getAllSystemInputs(field);
    const edited = inputs[editedIdx];
    if (!edited) return;

    const editedValue = Math.max(0, Math.min(asNumber(edited.value), total));
    edited.value = String(editedValue);

    const touchedSet = getTouchedSet(field);
    touchedSet.add(editedIdx);

    const sumCurrent = inputs.reduce((acc, node) => acc + asNumber(node?.value), 0);
    if (sumCurrent > total) {
      const restIndexes = inputs.map((_, i) => i).filter((i) => i !== editedIdx);
      const redistributed = distributeEvenly(Math.max(total - editedValue, 0), restIndexes.length);
      restIndexes.forEach((i, pos) => {
        if (inputs[i]) inputs[i].value = String(redistributed[pos] || 0);
      });
      setEstado(`Se ajustó ${field} automáticamente para no superar el total del sistema.`, "warn");
      return;
    }

    const untouchedIndexes = inputs
      .map((_, i) => i)
      .filter((i) => i !== editedIdx && !touchedSet.has(i));

    if (untouchedIndexes.length) {
      const usedByTouched = inputs
        .map((node, idx) => (touchedSet.has(idx) ? asNumber(node?.value) : 0))
        .reduce((acc, v) => acc + v, 0);
      const pending = Math.max(total - usedByTouched, 0);
      const touchedNoEdited = Array.from(touchedSet).filter((i) => i !== editedIdx)
        .reduce((acc, idx) => acc + asNumber(inputs[idx]?.value), 0);
      const forUntouched = Math.max(total - editedValue - touchedNoEdited, 0);
      const redistributed = distributeEvenly(forUntouched, untouchedIndexes.length);
      untouchedIndexes.forEach((i, pos) => {
        if (inputs[i]) inputs[i].value = String(redistributed[pos] || 0);
      });
      if (pending !== total) {
        setEstado(`Se redistribuyó ${field} en turnos no diligenciados para agilizar el cargue.`, "ok");
      }
    }
  };

  const buildRow = (label, field) => `
    <div class="field-row">
      <div class="field-title">${label}</div>
      <label class="field-cell">
        <span>Sistema</span>
        <input data-field="${field}" data-col="sistema" type="text" inputmode="numeric" pattern="[0-9]*">
      </label>
      <label class="field-cell">
        <span>Real</span>
        <input data-field="${field}" data-col="real" type="text" inputmode="numeric" pattern="[0-9]*">
      </label>
      <label class="field-cell">
        <span>Diferencia</span>
        <input data-field="${field}" data-col="diferencia" type="text" readonly>
      </label>
    </div>
  `;

  const createTurnoCard = (idx) => {
    const card = document.createElement("article");
    card.className = "turno-card";
    card.innerHTML = `
      <h3>Turno ${idx + 1}</h3>
      <div class="turno-grid">
        <label>Responsable
          <select data-role="responsable"><option value="">Seleccione</option></select>
        </label>
        <label>Hora inicio
          <input data-role="inicio" type="time">
        </label>
        <label>Hora fin
          <input data-role="fin" type="time">
        </label>
        <label>Efectivo apertura
          <input data-role="efectivo_apertura" type="text" inputmode="numeric" pattern="[0-9]*">
        </label>
        <label>Bolsa
          <input data-role="bolsa" type="text" inputmode="numeric" pattern="[0-9]*">
        </label>
        <label>Caja
          <input data-role="caja" type="text" inputmode="numeric" pattern="[0-9]*">
        </label>
      </div>

      <div class="tabla-campos">
        <div class="table-title">Detalle financiero del turno</div>
        ${buildRow("Efectivo", "efectivo")}
        ${buildRow("Datáfono", "datafono")}
        ${buildRow("Rappi", "rappi")}
        ${buildRow("Nequi", "nequi")}
        ${buildRow("Transferencias", "transferencias")}
        ${buildRow("Bono regalo", "bono_regalo")}
        ${buildRow("Propina", "propina")}
        ${buildRow("Domicilios", "domicilios")}
        ${buildRow("Gastos", "gastos")}
      </div>
      <label>Comentarios
        <textarea data-role="comentarios" placeholder="Notas del turno"></textarea>
      </label>
    `;

    const selectResponsable = card.querySelector('[data-role="responsable"]');
    responsables.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.nombre_completo;
      selectResponsable.appendChild(opt);
    });

    enforceNumericInput(Array.from(card.querySelectorAll('input[type="text"]')));

    MONEY_FIELDS.forEach((field) => {
      const input = getSystemInput(card, field);
      input?.addEventListener("input", () => rebalanceFromEdit(field, idx));
    });

    const caja = card.querySelector('[data-role="caja"]');
    const bolsa = card.querySelector('[data-role="bolsa"]');
    const efectivoReal = card.querySelector('[data-field="efectivo"][data-col="real"]');
    const syncEfectivo = () => {
      if (!efectivoReal) return;
      efectivoReal.value = String(asNumber(caja?.value) + asNumber(bolsa?.value));
    };
    caja?.addEventListener("input", syncEfectivo);
    bolsa?.addEventListener("input", syncEfectivo);

    return card;
  };

  const renderTurnos = () => {
    const count = asNumber(cantidadTurnos.value) || 1;
    contenedorTurnos.innerHTML = "";
    turnos.length = 0;
    for (let i = 0; i < count; i += 1) {
      const card = createTurnoCard(i);
      turnos.push(card);
      contenedorTurnos.appendChild(card);
    }
    applyInitialDistribution();
    btnSubir.disabled = true;
  };

  const verificarDistribucion = () => {
    const errors = [];
    SYSTEM_RULE_FIELDS.forEach((field) => {
      const sum = getAllSystemInputs(field).reduce((acc, input) => acc + asNumber(input?.value), 0);
      const total = asNumber(totals[field]);
      if (sum > total) {
        errors.push(`${field}: suma ${sum} supera total ${total}`);
      }
      if (sum < total) {
        errors.push(`${field}: suma ${sum} es menor al total ${total}`);
      }
    });

    turnos.forEach((card, idx) => {
      const responsable = card.querySelector('[data-role="responsable"]')?.value;
      const inicio = card.querySelector('[data-role="inicio"]')?.value;
      const fin = card.querySelector('[data-role="fin"]')?.value;
      if (!responsable || !inicio || !fin) {
        errors.push(`Turno ${idx + 1}: completa responsable, hora inicio y hora fin.`);
      }

      MONEY_FIELDS.forEach((field) => {
        const sistema = asNumber(card.querySelector(`[data-field="${field}"][data-col="sistema"]`)?.value);
        const real = asNumber(card.querySelector(`[data-field="${field}"][data-col="real"]`)?.value);
        const diff = real - sistema;
        const diffInput = card.querySelector(`[data-field="${field}"][data-col="diferencia"]`);
        if (diffInput) diffInput.value = String(diff);
      });
    });

    if (errors.length) {
      setEstado(`Validación: ${errors[0]}. Revisa los formularios.`, "error");
      btnSubir.disabled = true;
      return false;
    }

    setEstado("Distribución validada. Puedes subir los turnos antiguos.", "ok");
    btnSubir.disabled = false;
    return true;
  };

  const buildPayloadFromCard = async (card) => {
    const context = await getContextPayload();
    if (!context) return null;

    const responsable = card.querySelector('[data-role="responsable"]')?.value || "";
    const inicio = card.querySelector('[data-role="inicio"]')?.value || "";
    const fin = card.querySelector('[data-role="fin"]')?.value || "";
    const efectivoApertura = card.querySelector('[data-role="efectivo_apertura"]')?.value || 0;
    const bolsa = card.querySelector('[data-role="bolsa"]')?.value || 0;
    const caja = card.querySelector('[data-role="caja"]')?.value || 0;
    const comentarios = card.querySelector('[data-role="comentarios"]')?.value || "";

    const medios = ["efectivo", "datafono", "rappi", "nequi", "transferencias", "bono_regalo"];
    const itemsFinanzas = medios.flatMap((field) => {
      const sistema = card.querySelector(`[data-field="${field}"][data-col="sistema"]`)?.value || 0;
      const real = card.querySelector(`[data-field="${field}"][data-col="real"]`)?.value || 0;
      const diff = asNumber(real) - asNumber(sistema);
      return [
        { tipo: field, categoria: "sistema", valor: String(sistema), id_referencia: null, tiene_diferencia: false },
        { tipo: field, categoria: "real", valor: String(real), id_referencia: null, tiene_diferencia: diff !== 0, diferencia: String(diff) }
      ];
    });

    const gastosSistema = card.querySelector('[data-field="gastos"][data-col="sistema"]')?.value || 0;

    return {
      global: {
        fecha: fechaDia.value,
        empresa_id: context.empresa_id,
        tenant_id: context.tenant_id,
        usuario_id: context.usuario_id,
        responsable_id: responsable,
        registrado_por: context.registrado_por,
        rol: context.rol,
        timestamp: context.timestamp,
        comentarios,
        turno: {
          hora_llegada: "",
          inicio,
          fin,
          inicio_momento: asNumber(inicio.split(":")[0]) >= 12 ? "PM" : "AM",
          fin_momento: asNumber(fin.split(":")[0]) >= 12 ? "PM" : "AM",
          fecha_inicio: formatFechaCompleta(fechaDia.value),
          fecha_fin: formatFechaCompleta(fechaDia.value)
        },
        efectivo_apertura: efectivoApertura,
        propina_global: card.querySelector('[data-field="propina"][data-col="sistema"]')?.value || 0,
        domicilios_global: card.querySelector('[data-field="domicilios"][data-col="sistema"]')?.value || 0,
        bolsa_global: bolsa,
        caja_global: caja
      },
      items: [
        ...itemsFinanzas,
        { tipo: "gasto_extra", categoria: "general", valor: String(gastosSistema), id_referencia: null, tiene_diferencia: false }
      ],
      resumen: {
        total_sistema: medios.reduce((acc, field) => acc + asNumber(card.querySelector(`[data-field="${field}"][data-col="sistema"]`)?.value), 0),
        total_real: medios.reduce((acc, field) => acc + asNumber(card.querySelector(`[data-field="${field}"][data-col="real"]`)?.value), 0),
        diferencia_total: medios.reduce((acc, field) => acc + asNumber(card.querySelector(`[data-field="${field}"][data-col="diferencia"]`)?.value), 0),
        total_gastos_extras: asNumber(gastosSistema),
        total_domicilios_operativos: asNumber(card.querySelector('[data-field="domicilios"][data-col="sistema"]')?.value),
        total_domicilios_clientes: 0,
        total_propinas: asNumber(card.querySelector('[data-field="propina"][data-col="sistema"]')?.value),
        total_bolsa: asNumber(bolsa),
        caja_final: asNumber(caja)
      }
    };
  };

  const cargarResponsables = async () => {
    const context = await getContextPayload();
    if (!context) return;
    const users = await fetchResponsablesActivos(context.empresa_id);
    responsables.splice(0, responsables.length, ...users);
  };

  btnConsultarTotales.addEventListener("click", async () => {
    const payload = await getConsultaPayload();
    if (!payload) {
      setEstado("Selecciona fecha para consultar totales del día.", "error");
      return;
    }

    setEstado("Consultando datos generales del día...", "warn");
    const res = await fetch(WEBHOOK_CONSULTAR_DATOS_CIERRE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readResponseBody(res);
    if (!res.ok) {
      setEstado(data?.message || `Error consultando totales (${res.status})`, "error");
      return;
    }

    totals.efectivo = asNumber(data.efectivo_sistema ?? data.efectivo ?? data.total_efectivo ?? 0);
    totals.datafono = asNumber(data.datafono_sistema);
    totals.rappi = asNumber(data.rappi_sistema);
    totals.nequi = asNumber(data.nequi_sistema);
    totals.transferencias = asNumber(data.transferencias_sistema);
    totals.bono_regalo = asNumber(data.bono_regalo_sistema);
    totals.propina = asNumber(data.propina);
    renderTotales();
    renderTurnos();
    setEstado("Totales del día cargados. Ahora consulta gastos y distribuye por turnos.", "ok");
  });

  btnConsultarGastos.addEventListener("click", async () => {
    const payload = await getConsultaPayload();
    if (!payload) {
      setEstado("Selecciona fecha antes de consultar gastos.", "error");
      return;
    }

    setEstado("Consultando gastos del día...", "warn");
    const res = await fetch(WEBHOOK_CONSULTAR_GASTOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readResponseBody(res);
    if (!res.ok) {
      setEstado(data?.message || `Error consultando gastos (${res.status})`, "error");
      return;
    }

    const extras = normalizeExtras(data);
    totals.gastos = extras.reduce((acc, item) => acc + asNumber(item.valor ?? item.value ?? item.monto), 0);
    totals.domicilios = extras
      .filter((item) => /domicilios?/i.test(String(item.nombre || item.name || "")))
      .reduce((acc, item) => acc + asNumber(item.valor ?? item.value ?? item.monto), 0);
    renderTotales();
    applyInitialDistribution();
    setEstado("Gastos cargados y distribuidos automáticamente.", "ok");
  });

  btnVerificar.addEventListener("click", () => {
    verificarDistribucion();
  });

  btnSubir.addEventListener("click", async () => {
    if (!verificarDistribucion()) return;
    setEstado("Subiendo turnos antiguos...", "warn");

    for (let i = 0; i < turnos.length; i += 1) {
      const payload = await buildPayloadFromCard(turnos[i]);
      if (!payload) {
        setEstado("No se pudo construir payload por sesión inválida.", "error");
        return;
      }

      const res = await fetch(WEBHOOK_SUBIR_CIERRE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readResponseBody(res);
      if (!res.ok) {
        setEstado(`Turno ${i + 1}: ${data?.message || `falló (${res.status})`}`, "error");
        return;
      }
    }

    setEstado("Turnos antiguos subidos correctamente por el flujo normal de cierre.", "ok");
  });

  cantidadTurnos.addEventListener("change", () => {
    renderTurnos();
  });

  cargarResponsables().then(() => renderTurnos()).catch(() => {
    renderTurnos();
    setEstado("Advertencia: no se pudieron cargar responsables automáticamente.", "warn");
  });
});
