import { request } from "../utils/request.js";

const AUTH_KEY = "ads_auth";

export function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}

export async function registerUser({ email, phone, password }) {
  try {
    const response = await request("/advertiser/register", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim()
      })
    });

    return {
      ok: true,
      user: response.data
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message
    };
  }
}

export async function loginUser({ identifier, password }) {
  try {
    const response = await request("/advertiser/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: identifier.trim(),
        password: password.trim()
      })
    });

    localStorage.setItem(AUTH_KEY, JSON.stringify(response.data));

    return {
      ok: true,
      user: response.data
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message
    };
  }
}

export async function logoutUser() {
  try {
    await request("/advertiser/logout", {
      method: "POST"
    });

    return {
      ok: true
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message
    };
  } finally {
    localStorage.removeItem(AUTH_KEY);
  }
}