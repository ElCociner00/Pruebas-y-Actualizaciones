import { getUserContext } from "./session.js";
import { WEBHOOK_DASHBOARD_DATOS } from "./webhooks.js";

const DASHBOARD_TIMEOUT_MS = 3500;

const postDashboardSignal = async (empresaId) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    await fetch(WEBHOOK_DASHBOARD_DATOS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresaId }),
      signal: controller.signal
    });
  } catch (_error) {
    // Fallback silencioso: el dashboard nunca debe romperse.
  } finally {
    clearTimeout(timeoutId);
  }
};

const initDashboardSignal = async () => {
  try {
    const context = await getUserContext();
    const rol = String(context?.rol || "").toLowerCase();
    const empresaId = context?.empresa_id;
    if (!empresaId) return;
    if (rol !== "admin" && rol !== "admin_root") return;
    await postDashboardSignal(empresaId);
  } catch (_error) {
    // No-op para preservar UX.
  }
};

initDashboardSignal();
