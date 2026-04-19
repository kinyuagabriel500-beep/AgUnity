const defaultApiBaseUrl = "https://agunity.onrender.com/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || defaultApiBaseUrl;
const TOKEN_KEY = "agunity-token";
const USER_KEY = "agunity-user";

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (payload?.message) return payload.message;
  } catch (_error) {
    // Ignore JSON parsing failures and use fallback text.
  }
  return `Request failed (${response.status})`;
};

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setSession: ({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
};

const withAuth = (headers = {}) => {
  const token = authStore.getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export const getJson = async (path) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: withAuth()
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return response.json();
};

export const postJson = async (path, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return response.json();
};

export const postFormData = async (path, formData) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: withAuth(),
    body: formData
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return response.json();
};

export const patchJson = async (path, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: withAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response));
  return response.json();
};

export const deleteJson = async (path) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: withAuth()
  });
  if (!response.ok && response.status !== 204) throw new Error(await parseErrorMessage(response));
  if (response.status === 204) return null;
  return response.json();
};

export const login = async (email, password, role) => {
  const data = await postJson("/auth/login", {
    email,
    password,
    ...(role ? { role } : {})
  });
  authStore.setSession(data);
  return data;
};

export const register = async (payload) => {
  const data = await postJson("/auth/register", payload);
  authStore.setSession(data);
  return data;
};
