import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import FarmerDashboard from "./pages/FarmerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TransporterDashboard from "./pages/TransporterDashboard";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import AuthPanel from "./components/AuthPanel";
import ClimateAdvisoryPanel from "./components/ClimateAdvisoryPanel";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { user, loading, isAuthenticated, signIn, signUp, signOut } = useAuth();
  const [authError, setAuthError] = useState("");
  const role = String(user?.role || "farmer").trim().toLowerCase();
  const isAdmin = role === "admin";

  const defaultRouteByRole = {
    farmer: "/",
    transporter: "/transporter",
    warehouse: "/warehouse",
    retailer: "/retailer",
    consumer: "/consumer",
    admin: "/admin"
  };

  const roleHome = defaultRouteByRole[role] || "/";

  const navItems = [];
  if (role === "farmer" || isAdmin) navItems.push({ path: "/", label: "Farmer", end: true });
  if (role === "transporter" || isAdmin) navItems.push({ path: "/transporter", label: "Transporter" });
  if (role === "warehouse" || isAdmin) navItems.push({ path: "/warehouse", label: "Warehouse" });
  if (role === "retailer" || isAdmin) navItems.push({ path: "/retailer", label: "Retailer" });
  if (role === "consumer" || isAdmin) navItems.push({ path: "/consumer", label: "Consumer" });
  if (isAdmin) navItems.push({ path: "/buyer", label: "Buyer" });
  if (isAdmin) navItems.push({ path: "/admin", label: "Admin" });

  const guard = (allowedRoles, element) => {
    const normalized = allowedRoles.map((item) => String(item).toLowerCase());
    return normalized.includes(role) || isAdmin ? element : <Navigate to={roleHome} replace />;
  };

  if (!isAuthenticated) {
    return (
      <main className="content">
        <AuthPanel
          loading={loading}
          onLogin={async (email, password, roleHint) => {
            try {
              setAuthError("");
              await signIn(email, password, roleHint);
            } catch (_error) {
              setAuthError("Invalid login. Check credentials.");
            }
          }}
          onRegister={async (payload) => {
            try {
              setAuthError("");
              await signUp(payload);
            } catch (_error) {
              setAuthError("Registration failed. Try another email.");
            }
          }}
        />
        {authError ? <p className="error">{authError}</p> : null}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>UFIP</h1>
        <span className="welcome">Hi, {user?.fullName || "Farmer"}</span>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end}>{item.label}</NavLink>
          ))}
          <button className="logout-btn" onClick={signOut} type="button">Logout</button>
        </nav>
      </header>

      <main className="content">
        {(role === "farmer" || isAdmin) ? <ClimateAdvisoryPanel /> : null}
        <Routes>
          <Route
            path="/"
            element={
              role === "farmer" || isAdmin
                ? <FarmerDashboard />
                : <Navigate to={roleHome} replace />
            }
          />
          <Route path="/transporter" element={guard(["transporter"], <TransporterDashboard />)} />
          <Route path="/warehouse" element={guard(["warehouse"], <WarehouseDashboard />)} />
          <Route path="/retailer" element={guard(["retailer"], <RetailerDashboard />)} />
          <Route path="/consumer" element={guard(["consumer"], <ConsumerDashboard />)} />
          <Route path="/buyer" element={isAdmin ? <BuyerDashboard /> : <Navigate to={roleHome} replace />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to={roleHome} replace />} />
          <Route path="*" element={<Navigate to={roleHome} replace />} />
        </Routes>
      </main>
    </div>
  );
}
