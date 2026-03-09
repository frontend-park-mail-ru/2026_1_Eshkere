import { renderTemplate } from "../../assets/js/utils/render.js";
import { renderNavbar } from "../../components/navbar/navbar.js";

export async function renderPublicLayout(content, pathname = "/") {
  const navbar = await renderNavbar(pathname);

  return await renderTemplate("./layouts/public/public-layout.hbs", {
    navbar,
    content
  });
}