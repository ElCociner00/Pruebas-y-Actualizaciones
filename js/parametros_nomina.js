import { getUserContext } from "./session.js";
import { supabase } from "./supabase.js";

const tablaBody = document.getElementById("parametrosNominaBody");
const statusEl = document.getElementById("parametrosNominaStatus");
const btnAgregar = document.getElementById("btnAgregarParametro");
const btnRecargar = document.getElementById("btnRecargarParametros");

const state = {
  context: null,
  empresa: null,
  rows: []
};

const toUpperTrim = (value) => String(value || "").trim().toUpperCase();
const parseNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const setStatus = (message) => {
  if (statusEl) statusEl.textContent = message || "";
};

const canAccess = (role) => {
  const safeRole = String(role || "").toLowerCase();
  return safeRole === "admin" || safeRole === "admin_root";
};

const normalizeParametro = (row) => ({
  id: row?.id || "",
  nombre: String(row?.nombre || "").trim(),
  tipo: toUpperTrim(row?.tipo) === "DEDUCCION" ? "DEDUCCION" : "INGRESO",
  valor: parseNumber(row?.valor),
  unidad: String(row?.unidad || "pesos").trim() || "pesos"
});

const createEditableRowHtml = (row) => {
  const isNew = !row.id;
  return `
    <tr data-id="${row.id || "nuevo"}">
      <td><input type="text" data-field="nombre" value="${row.nombre}" placeholder="Ej: Hora ordinaria"></td>
      <td>
        <select data-field="tipo">
          <option value="INGRESO" ${row.tipo === "INGRESO" ? "selected" : ""}>INGRESO</option>
          <option value="DEDUCCION" ${row.tipo === "DEDUCCION" ? "selected" : ""}>DEDUCCIÓN</option>
        </select>
      </td>
      <td><input type="number" step="0.01" min="0" data-field="valor" value="${row.valor}"></td>
      <td><input type="text" data-field="unidad" value="${row.unidad}"></td>
      <td>
        <button type="button" data-action="guardar">${isNew ? "Crear" : "Guardar"}</button>
        ${isNew ? "" : '<button type="button" data-action="eliminar">Eliminar</button>'}
      </td>
    </tr>
  `;
};

const renderRows = () => {
  if (!tablaBody) return;
  if (!state.rows.length) {
    tablaBody.innerHTML = "<tr><td colspan='5'>No hay parámetros registrados. Agrega al menos uno.</td></tr>";
    return;
  }

  tablaBody.innerHTML = state.rows.map((row) => createEditableRowHtml(row)).join("");
};

const getRowPayload = (tr) => ({
  nombre: String(tr.querySelector('[data-field="nombre"]')?.value || "").trim(),
  tipo: toUpperTrim(tr.querySelector('[data-field="tipo"]')?.value || "INGRESO"),
  valor: parseNumber(tr.querySelector('[data-field="valor"]')?.value || 0),
  unidad: String(tr.querySelector('[data-field="unidad"]')?.value || "pesos").trim() || "pesos"
});

const loadRows = async () => {
  if (!state.context?.empresa_id) return;
  const { data, error } = await supabase
    .from("parametros_nomina")
    .select("id,nombre,tipo,valor,unidad,updated_at")
    .eq("empresa_id", state.context.empresa_id)
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    state.rows = [];
    renderRows();
    setStatus(`No fue posible cargar parámetros: ${error.message || "sin detalle"}`);
    return;
  }

  state.rows = (Array.isArray(data) ? data : []).map(normalizeParametro);
  renderRows();
  setStatus(state.rows.length
    ? `Parámetros cargados (${state.rows.length}).`
    : "Sin parámetros aún: el cálculo de nómina usará ceros hasta que configures datos.");
};

const createRow = () => {
  state.rows.unshift({
    id: "",
    nombre: "",
    tipo: "INGRESO",
    valor: 0,
    unidad: "pesos"
  });
  renderRows();
};

const saveRow = async (tr) => {
  const id = String(tr.dataset.id || "");
  const payload = getRowPayload(tr);

  if (!payload.nombre) {
    setStatus("El nombre del parámetro es obligatorio.");
    return;
  }

  if (!["INGRESO", "DEDUCCION"].includes(payload.tipo)) {
    setStatus("El tipo debe ser INGRESO o DEDUCCION.");
    return;
  }

  const base = {
    empresa_id: state.context.empresa_id,
    nombre: payload.nombre,
    tipo: payload.tipo,
    valor: payload.valor,
    unidad: payload.unidad
  };

  if (!id || id === "nuevo") {
    const { error } = await supabase.from("parametros_nomina").insert(base);
    if (error) {
      setStatus(`No se pudo crear: ${error.message || "sin detalle"}`);
      return;
    }
    setStatus("Parámetro creado.");
    await loadRows();
    return;
  }

  const { error } = await supabase
    .from("parametros_nomina")
    .update(base)
    .eq("id", id)
    .eq("empresa_id", state.context.empresa_id);

  if (error) {
    setStatus(`No se pudo guardar: ${error.message || "sin detalle"}`);
    return;
  }

  setStatus("Parámetro actualizado.");
  await loadRows();
};

const deleteRow = async (tr) => {
  const id = String(tr.dataset.id || "");
  if (!id || id === "nuevo") {
    tr.remove();
    return;
  }

  const { error } = await supabase
    .from("parametros_nomina")
    .delete()
    .eq("id", id)
    .eq("empresa_id", state.context.empresa_id);

  if (error) {
    setStatus(`No se pudo eliminar: ${error.message || "sin detalle"}`);
    return;
  }

  setStatus("Parámetro eliminado.");
  await loadRows();
};

const init = async () => {
  state.context = await getUserContext().catch(() => null);
  if (!state.context?.empresa_id) {
    setStatus("No se pudo resolver empresa activa.");
    return;
  }

  if (!canAccess(state.context?.rol)) {
    tablaBody.innerHTML = "<tr><td colspan='5'>No tienes permisos para administrar parámetros de nómina.</td></tr>";
    setStatus("Acceso restringido a administradores.");
    return;
  }

  await loadRows();
};

tablaBody?.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr");
  if (!tr) return;

  btn.disabled = true;
  try {
    if (btn.dataset.action === "guardar") await saveRow(tr);
    if (btn.dataset.action === "eliminar") await deleteRow(tr);
  } finally {
    btn.disabled = false;
  }
});

btnAgregar?.addEventListener("click", createRow);
btnRecargar?.addEventListener("click", loadRows);

init();
