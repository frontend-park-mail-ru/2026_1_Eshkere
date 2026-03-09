import { renderTemplate } from "../../assets/js/utils/render.js";

export async function renderSidebar() {
  return await renderTemplate("./components/sidebar/sidebar.hbs");
}