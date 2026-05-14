import { supabase } from "./supabase.js";

const newPassword = document.getElementById("newPassword");
const currentPassword = document.getElementById("currentPassword");
const changePasswordForm = document.getElementById("changePasswordForm");
const passwordStatus = document.getElementById("passwordStatus");

const setStatus = (msg) => { if (passwordStatus) passwordStatus.textContent = msg; };
const RECOVERY_URL = "https://restaurantes.enkrato.com/configuracion/contrasena.html";

window.sendRecoveryForEmail = async (email) => {
  const clean = String(email || "").trim();
  if (!clean) return setStatus("Usuario sin correo.");
  setStatus("Enviando correo de recuperación...");
  const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: RECOVERY_URL });
  if (error) return setStatus(`No se pudo enviar el correo: ${error.message}`);
  setStatus("Si el correo existe, recibirá un enlace de recuperación.");
};

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
