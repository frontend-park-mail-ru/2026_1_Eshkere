import { request } from "../utils/request.js";

export async function getAds() {
  try {
    const response = await request("/ads", {
      method: "GET"
    });

    return {
      ok: true,
      ads: response.data.ads || []
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      ads: []
    };
  }
}