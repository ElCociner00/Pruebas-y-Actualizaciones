import { supabase } from "./supabase.js";
import { getUserContext } from "./session.js";

const recoveryEmail = document.getElementById("recoveryEmail");
const sendRecoveryEmail = document.getElementById("sendRecoveryEmail");
const newPassword = document.getElementById("newPassword");
const currentPassword = document.getElementById("currentPassword");
const updateMyPassword = document.getElementById("updateMyPassword");
const passwordStatus = document.getElementById("passwordStatus");

const setStatus = (msg) => { passwordStatus.textContent = msg; };
const RECOVERY_URL = "https://restaurantes.enkrato.com/configuracion/contrasena.html";

const loadEmpresaUsers = async () => {
  const context = await getUserContext();
  if (!context?.empresa_id || !recoveryEmail) return;
  const { data } = await supabase.from("usuarios_sistema").select("email").eq("empresa_id", context.empresa_id).eq("activo", true);
  recoveryEmail.innerHTML = `<option value="">Selecciona usuario</option>${(data || []).map((u) => `<option value="${u.email}">${u.email}</option>`).join("")}`;
};

sendRecoveryEmail?.addEventListener("click", async () => {
  const email = String(recoveryEmail?.value || "").trim();
  if (!email) return setStatus("Selecciona un usuario de tu empresa.");
  setStatus("Enviando correo de recuperación...");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
  if (error) return setStatus(`No se pudo enviar el correo: ${error.message}`);
  setStatus("Si el correo existe, recibirás un enlace de recuperación.");
});

updateMyPassword?.addEventListener("click", async () => {
  const password = String(newPassword?.value || "");
  const oldPassword = String(currentPassword?.value || "");
  if (!oldPassword) return setStatus("Ingresa tu contraseña actual.");
  if (password.length < 8) return setStatus("La nueva contraseña debe tener mínimo 8 caracteres.");
  setStatus("Actualizando contraseña...");
  const { data, error } = await supabase.rpc("cambiar_contrasena", { current_plain_password: oldPassword, new_plain_password: password });
  if (error) return setStatus(`No se pudo actualizar: ${error.message}`);
  if (String(data || "").toLowerCase().includes("incorrecta")) return setStatus("La contraseña actual no coincide.");
  await supabase.auth.signOut();
  setStatus("Contraseña actualizada. Inicia sesión nuevamente.");
});

loadEmpresaUsers();
