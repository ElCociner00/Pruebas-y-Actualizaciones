import { supabase } from "./supabase.js";
import { getUserContext } from "./session.js";

const recoveryEmail = document.getElementById("recoveryEmail");
const sendRecoveryEmail = document.getElementById("sendRecoveryEmail");
const newPassword = document.getElementById("newPassword");
const currentPassword = document.getElementById("currentPassword");
const updateMyPassword = document.getElementById("updateMyPassword");
const recoveryForm = document.getElementById("recoveryForm");
const changePasswordForm = document.getElementById("changePasswordForm");
const passwordStatus = document.getElementById("passwordStatus");

const setStatus = (msg) => { passwordStatus.textContent = msg; };
const RECOVERY_URL = "https://restaurantes.enkrato.com/configuracion/contrasena.html";

const loadEmpresaUsers = async () => {
  const context = await getUserContext();
  if (!context?.empresa_id || !recoveryEmail) return;
  const { data } = await supabase.from("usuarios_sistema").select("email,correo,nombre_completo").eq("empresa_id", context.empresa_id).eq("activo", true);
  recoveryEmail.innerHTML = `<option value="">Selecciona usuario</option>${(data || []).map((u) => {
    const email = u.email || u.correo || "";
    return email ? `<option value="${email}">${u.nombre_completo || email} (${email})</option>` : "";
  }).join("")}`;
};

recoveryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = String(recoveryEmail?.value || "").trim();
  if (!email) return setStatus("Selecciona un usuario de tu empresa.");
  setStatus("Enviando correo de recuperación...");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
  if (error) return setStatus(`No se pudo enviar el correo: ${error.message}`);
  setStatus("Si el correo existe, recibirás un enlace de recuperación.");
});

changePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(newPassword?.value || "");
  const oldPassword = String(currentPassword?.value || "");
  if (!oldPassword) return setStatus("Ingresa tu contraseña actual.");
  if (password.length < 8) return setStatus("La nueva contraseña debe tener mínimo 8 caracteres.");
  setStatus("Actualizando contraseña...");
  const { data: authData } = await supabase.auth.getUser();
  const email = authData?.user?.email || "";
  if (!email) return setStatus("No se pudo validar el usuario autenticado.");
  const reauth = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (reauth.error) return setStatus("La contraseña actual no coincide.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return setStatus(`No se pudo actualizar: ${error.message}`);
  await supabase.auth.signOut();
  setStatus("Contraseña actualizada. Inicia sesión nuevamente.");
});

loadEmpresaUsers();
