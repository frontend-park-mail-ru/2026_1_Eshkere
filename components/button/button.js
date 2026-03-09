import { renderTemplate } from "../../assets/js/utils/render.js";

export async function renderButton(options = {}) {
  return await renderTemplate("./components/button/button.hbs", {
    text: options.text || "Кнопка",
    type: options.type || "button",
    href: options.href || "",
    variant: options.variant || "primary",
    className: options.className || ""
  });
}