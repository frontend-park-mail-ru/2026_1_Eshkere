import { renderRoute } from "./router.js";

window.addEventListener("DOMContentLoaded", () => {
  renderRoute();
});

window.addEventListener("hashchange", () => {
  renderRoute();
});