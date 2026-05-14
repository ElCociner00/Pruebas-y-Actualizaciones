import { WEBHOOK_REGISTRAR_EMPLEADO, WEBHOOK_REGISTRO_OTROS_USUARIOS } from "./webhooks.js";
import { getUserContext } from "./session.js";

const tipoAltaUsuario = document.getElementById("tipoAltaUsuario");
const formEmpleado = document.getElementById("formEmpleado");
const formOtro = document.getElementById("formOtro");
const altaStatus = document.getElementById("altaStatus");
const setStatus = (m) => { altaStatus.textContent = m; };

const renderAlta = () => {
  const value = tipoAltaUsuario?.value || "";
  if (formEmpleado) { formEmpleado.hidden = value !== "empleado"; formEmpleado.style.display = value === "empleado" ? "block" : "none"; }
  if (formOtro) { formOtro.hidden = value !== "otro"; formOtro.style.display = value === "otro" ? "block" : "none"; }
};

tipoAltaUsuario?.addEventListener("change", renderAlta);
renderAlta();

formEmpleado?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const context = await getUserContext();
  const payload = {
    empresa_id: context?.empresa_id,
    nombre: document.getElementById("empNombre").value.trim(),
    cedula: document.getElementById("empCedula").value.trim(),
    fecha_ingreso: document.getElementById("empFechaIngreso").value,
    email: document.getElementById("empEmail").value.trim(),
    password: document.getElementById("empPassword").value
  };
  setStatus("Registrando empleado...");
  const res = await fetch(WEBHOOK_REGISTRAR_EMPLEADO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  setStatus(data?.message || (data?.ok ? "Empleado registrado." : "No se pudo registrar."));
});

formOtro?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const context = await getUserContext();
  const payload = {
    empresa_id: context?.empresa_id,
    nombre: document.getElementById("otroNombre").value.trim(),
    cedula: document.getElementById("otroCedula").value.trim(),
    email: document.getElementById("otroEmail").value.trim(),
    password: document.getElementById("otroPassword").value,
    rol: document.getElementById("otroRol").value
  };
  setStatus("Registrando usuario...");
  const res = await fetch(WEBHOOK_REGISTRO_OTROS_USUARIOS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  setStatus(data?.message || (data?.ok ? "Usuario registrado." : "No se pudo registrar."));
});
