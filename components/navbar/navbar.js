import { renderTemplate } from "../../assets/js/utils/render.js";
import { isAuthenticated } from "../../assets/js/services/auth.service.js";
import { getCurrentUser } from "../../assets/js/services/auth.service.js";

export async function renderNavbar(pathname = "/") {
  let isAuth = isAuthenticated();
  let user = getCurrentUser();

  // Заглушка: как будто получили пользователя с бэк
  user = {
    id: "stub-id-1",
    email: "stub@example.com",
    phone: "+7 999 123-45-67",
    name: "Иван Заглушкин",
    balance: 453678,
    avatar: "../../assets/images/avatar-placeholder.png"
  };

  return await renderTemplate("./components/navbar/navbar.hbs", {
    isLogin: pathname === "/login",
    isRegister: pathname === "/register",
    isAuthenticated: isAuth,
    user: user
  });
}