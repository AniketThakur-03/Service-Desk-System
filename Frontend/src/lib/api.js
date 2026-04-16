const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let accessToken = "";

function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.error && (data.error.message || data.error)) || (typeof data === "string" ? data : "Request failed");
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  setAccessToken(token) {
    accessToken = token || "";
  },
  login(email, password) { return request("/auth/login", { method: "POST", body: { email, password } }); },
  register(email, password) { return request("/auth/register", { method: "POST", body: { email, password } }); },
  logout() { return request("/auth/logout", { method: "POST", body: {} }); },
  changePassword(currentPassword, newPassword) { return request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }); },
  getMe() { return request("/me"); },

  getOverview() { return request("/analytics/overview"); },
  getWorkload() { return request("/analytics/workload"); },
  getInsights() { return request("/analytics/insights"); },
  getUsers() { return request("/admin/users"); },
  getAudit(limit = 50) { return request(`/audit?limit=${limit}`); },

  listTickets(params = {}) {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));
    const usp = new URLSearchParams(cleanParams);
    const qs = usp.toString() ? `?${usp.toString()}` : "";
    return request(`/tickets${qs}`);
  },
  getTicket(id) { return request(`/tickets/${id}`); },
  createTicket(payload) { return request("/tickets", { method: "POST", body: payload }); },
  updateTicket(id, payload) { return request(`/tickets/${id}`, { method: "PATCH", body: payload }); },
  updateStatus(id, status, extra = {}) { return request(`/tickets/${id}/status`, { method: "PATCH", body: { status, ...extra } }); },
  assignTicket(id, email) { return request(`/tickets/${id}/assign`, { method: "PATCH", body: { assignee: { email } } }); },
  getComments(id) { return request(`/tickets/${id}/comments`); },
  addComment(id, body, isInternal = false) { return request(`/tickets/${id}/comments`, { method: "POST", body: { body, isInternal } }); },
  getHistory(id) { return request(`/tickets/${id}/history`); },

  getAssets() { return request('/assets'); },
  createAsset(payload) { return request('/assets', { method: 'POST', body: payload }); },
  getKnowledge() { return request('/knowledge'); },
  createArticle(payload) { return request('/knowledge', { method: 'POST', body: payload }); },
  getNotifications() { return request('/notifications'); },
  readAllNotifications() { return request('/notifications/read-all', { method: 'POST', body: {} }); },
};

export default api;
