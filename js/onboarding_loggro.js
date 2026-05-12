const KEY = "loggro_onboarding_steps";
const getState = () => JSON.parse(localStorage.getItem(KEY) || "{\"step\":0}");
const setState = (next) => localStorage.setItem(KEY, JSON.stringify(next));

const drawArrowTo = (selector) => {
  document.querySelectorAll(".onb-arrow").forEach((n) => n.remove());
  const target = document.querySelector(selector);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const arrow = document.createElement("div");
  arrow.className = "onb-arrow";
  arrow.textContent = "⬇";
  arrow.style.left = `${Math.max(8, rect.left + rect.width / 2 - 20)}px`;
  arrow.style.top = `${Math.max(8, rect.top - 72)}px`;
  document.body.appendChild(arrow);
};

const paint = () => {
  const state = getState();
  if (state.step === 1 || state.step === 2) drawArrowTo(".user-menu-toggle");
  if (window.location.pathname.includes("/configuracion/") && state.step >= 2) {
    drawArrowTo("a[href$='loggro.html']");
  }
};

let attempts = 0;
const timer = setInterval(() => {
  attempts += 1;
  paint();
  if (document.querySelector(".onb-arrow") || attempts > 20) clearInterval(timer);
}, 300);
