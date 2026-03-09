import { renderTemplate } from "../../assets/js/utils/render.js";
import { renderDashboardLayout } from "../../layouts/dashboard/dashboard-layout.js";
import { logoutUser } from "../../assets/js/services/auth.service.js";
import { getAds } from "../../assets/js/services/ads.service.js";

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ru-RU");
}

function mapAdsToCampaigns(ads = []) {
  return ads.map((ad) => ({
    id: ad.id,
    title: ad.title || "Без названия",
    budget: typeof ad.price === "number" ? formatPrice(ad.price) : "—",
    goal: ad.description || "Без описания",
    lastActionDate: formatDate(ad.created_at),
    status: "Активно",
    statusType: "working",
    enabled: true
  }));
}

export async function renderAdsPage() {
  const result = await getAds();

  const campaigns = mapAdsToCampaigns(result.ads);

  const content = await renderTemplate("./pages/ads/ads.hbs", {
    campaigns,
    hasCampaigns: campaigns.length > 0,
    loadError: result.ok ? "" : result.message
  });

  return await renderDashboardLayout(content);
}

export function initAdsPage() {
  const logoutButton = document.getElementById("logout-button");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      await logoutUser();
      location.hash = "#/login";
    });
  }
}