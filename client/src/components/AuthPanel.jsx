import { useState } from "react";

export default function AuthPanel({ onLogin, onRegister, loading }) {
  const roles = ["farmer", "transporter", "warehouse", "retailer", "consumer", "admin"];
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "farmer"
  });

  const submit = async (event) => {
    event.preventDefault();
    if (mode === "login") {
      await onLogin(form.email, form.password, form.role);
      return;
    }
    await onRegister(form);
  };

  return (
    <section className="auth-panel">
      <h2>{mode === "login" ? "Sign in to AGUNITY" : "Create role-based account"}</h2>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && (
          <>
            <input
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </>
        )}
        <select
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          required
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          minLength={8}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
      <button className="link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "New user? Register" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
