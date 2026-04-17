import { useState } from "react";
import { authStore, login, register } from "../api/client";

export function useAuth() {
  const [user, setUser] = useState(authStore.getUser());
  const [loading, setLoading] = useState(false);
  const isAuthenticated = Boolean(authStore.getToken());

  const signIn = async (email, password, role) => {
    setLoading(true);
    try {
      const data = await login(email, password, role);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (payload) => {
    setLoading(true);
    try {
      const data = await register(payload);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    authStore.clear();
    setUser(null);
  };

  return { user, loading, isAuthenticated, signIn, signUp, signOut };
}
