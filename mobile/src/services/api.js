const API_BASE_URL = process.env.MOBILE_API_BASE_URL || "http://localhost:4000/api";
let token = "";

export const setAuthToken = (nextToken) => {
  token = nextToken || "";
};

const withAuth = () => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const login = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error("Login failed");
  return response.json();
};

export const sendActivity = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/activities`, {
    method: "POST",
    headers: withAuth(),
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Failed to sync activity");
  return response.json();
};
