import { supabase } from "./supabase.js";

const recoveryEmail = document.getElementById("recoveryEmail");
const sendRecoveryEmail = document.getElementById("sendRecoveryEmail");
const newPassword = document.getElementById("newPassword");
const updateMyPassword = document.getElementById("updateMyPassword");
const passwordStatus = document.getElementById("passwordStatus");

const setStatus = (msg) => { passwordStatus.textContent = msg; };
const RECOVERY_URL = `${window.location.origin}/Pruebas-y-Actualizaciones/configuracion/contrasena.html`;

sendRecoveryEmail?.addEventListener("click", async () => {
  const email = String(recoveryEmail?.value || "").trim();
  if (!email) return setStatus("Ingresa un correo válido.");
  setStatus("Enviando correo de recuperación...");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
  if (error) return setStatus(`No se pudo enviar el correo: ${error.message}`);
  setStatus("Si el correo existe, recibirás un enlace de recuperación.");
});

updateMyPassword?.addEventListener("click", async () => {
  const password = String(newPassword?.value || "");
  if (password.length < 8) return setStatus("La nueva contraseña debe tener mínimo 8 caracteres.");
  setStatus("Actualizando contraseña...");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return setStatus(`No se pudo actualizar: ${error.message}`);
  await supabase.auth.signOut();
  setStatus("Contraseña actualizada. Inicia sesión nuevamente.");
});
