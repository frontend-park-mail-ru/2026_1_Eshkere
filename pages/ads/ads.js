import { renderTemplate } from "../../assets/js/utils/render.js";
import { renderDashboardLayout } from "../../layouts/dashboard/dashboard-layout.js";
import { logoutUser } from "../../assets/js/services/auth.service.js";

const campaigns = [
  {
    title: "Смарт-кампания по продвижению аккаунта",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "В работе",
    statusType: "working",
    enabled: true
  },
  {
    title: "Смарт-кампания по продвижению конкурса Гусей...",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Приостановлено",
    statusType: "paused",
    enabled: false
  },
  {
    title: "Смарт-кампания",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Ожидает оплаты",
    statusType: "pending",
    enabled: true
  },
  {
    title: "Смарт-кампания",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Приостановлено",
    statusType: "paused",
    enabled: false
  },
  {
    title: "Смарт-кампания",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Приостановлено",
    statusType: "paused",
    enabled: false
  },
  {
    title: "Смарт-кампания",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Приостановлено",
    statusType: "paused",
    enabled: false
  },
  {
    title: "Смарт-кампания",
    budget: "400,00 ₽",
    goal: "Клики по рекламе",
    lastActionDate: "14.02.2026",
    status: "Приостановлено",
    statusType: "paused",
    enabled: false
  }
];

export async function renderAdsPage() {
  const content = await renderTemplate("./pages/ads/ads.hbs", {
    campaigns
  });

  return await renderDashboardLayout(content);
}

export function initAdsPage() {
  const logoutButton = document.getElementById("logout-button");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    logoutUser();
    location.hash = "#/login";
  });
}