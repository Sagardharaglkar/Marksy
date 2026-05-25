/**
 * Shared auth helpers for Playwright tests.
 * These hit the backend API directly to set up state fast,
 * without going through the UI every time.
 */
const API = process.env.API_URL || "http://localhost:5000/api";

async function apiPost(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  return res.json();
}

async function apiPatch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPut(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiDelete(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers });
  return res.json();
}

async function loginViaAPI(college_id, phone, password) {
  const data = await apiPost("/auth/login", { college_id, phone, password });
  return data.token;
}

/**
 * Inject a JWT token into the browser's localStorage so the app treats
 * the page as already logged in. Call this before navigating to a protected page.
 */
async function injectToken(page, token, user) {
  await page.addInitScript(({ t, u }) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  }, { t: token, u: user });
}

module.exports = { apiPost, apiGet, apiPatch, apiPut, apiDelete, loginViaAPI, injectToken };
