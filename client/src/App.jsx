import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useRef, useState } from "react";
import FarmerDashboard from "./pages/FarmerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TransporterDashboard from "./pages/TransporterDashboard";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import MarketplacePage from "./pages/MarketplacePage";
import AuthPanel from "./components/AuthPanel";
import LandingPage from "./components/LandingPage";
import ClimateAdvisoryPanel from "./components/ClimateAdvisoryPanel";
import { useAuth } from "./hooks/useAuth";
import agunityLogo from "./assets/agunity-logo.svg";

export default function App() {
  const { user, loading, isAuthenticated, signIn, signUp, signOut } = useAuth();
  const [authError, setAuthError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const authPanelRef = useRef(null);
  const role = String(user?.role || "farmer").trim().toLowerCase();
  const isAdmin = role === "admin";

  const roleGuides = [
    { role: "Farmer", detail: "Records farm activity, gets advisory, manages harvest and insurance." },
    { role: "Buyer", detail: "Finds produce, verifies traceability, and places marketplace orders." },
    { role: "Transporter", detail: "Accepts delivery jobs and updates shipment milestones." },
    { role: "Warehouse", detail: "Receives stock, tracks storage conditions, and dispatches inventory." },
    { role: "Retailer", detail: "Monitors supply availability and retail-ready batches." },
    { role: "Consumer", detail: "Views product journey and trust signals from farm to shelf." },
    { role: "Admin", detail: "Oversees users, system flows, and platform operations." }
  ];

  const defaultRouteByRole = {
    farmer: "/",
    buyer: "/marketplace",
    transporter: "/transporter",
    warehouse: "/warehouse",
    retailer: "/retailer",
    consumer: "/consumer",
    admin: "/admin"
  };

  const roleHome = defaultRouteByRole[role] || "/";

  const navItems = [];
  if (role === "farmer" || isAdmin) navItems.push({ path: "/", label: "Farmer", end: true });
  if (role === "farmer" || role === "buyer" || isAdmin) navItems.push({ path: "/marketplace", label: "Marketplace" });
  if (role === "transporter" || isAdmin) navItems.push({ path: "/transporter", label: "Transporter" });
  if (role === "warehouse" || isAdmin) navItems.push({ path: "/warehouse", label: "Warehouse" });
  if (role === "retailer" || isAdmin) navItems.push({ path: "/retailer", label: "Retailer" });
  if (role === "consumer" || isAdmin) navItems.push({ path: "/consumer", label: "Consumer" });
  if (role === "buyer" || isAdmin) navItems.push({ path: "/buyer", label: "Buyer Dashboard" });
  if (isAdmin) navItems.push({ path: "/admin", label: "Admin" });

  const guard = (allowedRoles, element) => {
    const normalized = allowedRoles.map((item) => String(item).toLowerCase());
    return normalized.includes(role) || isAdmin ? element : <Navigate to={roleHome} replace />;
  };

  const openAuthSection = () => {
    setShowAuth(true);
    setTimeout(() => {
      const panel = authPanelRef.current || document.getElementById("auth-panel");
      if (!panel) return;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof panel.focus === "function") panel.focus();
    }, 0);
  };

  if (!isAuthenticated) {
    return (
      <main className="public-page">
        <LandingPage
          onGetStarted={openAuthSection}
          onSignIn={openAuthSection}
        />

        <section
          className={`auth-section ${showAuth ? "visible" : ""}`}
          id="auth-panel"
          ref={authPanelRef}
          tabIndex={-1}
        >
          <div className="auth-section-copy">
            <span className="eyebrow">Access the platform</span>
            <h2>Sign in to your AGUNITY workspace</h2>
            <p>
              Use your account to access the dashboard for your role, track activity, and start
              working with live platform data.
            </p>
            <div className="role-explainer" aria-label="Platform roles and interactions">
              {roleGuides.map((item) => (
                <article key={item.role} className="role-explainer-card">
                  <h3>{item.role}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <AuthPanel
            loading={loading}
            onLogin={async (email, password, roleHint) => {
              try {
                setAuthError("");
                await signIn(email, password, roleHint);
              } catch (error) {
                setAuthError(error.message || "Invalid login. Check credentials.");
              }
            }}
            onRegister={async (payload) => {
              try {
                setAuthError("");
                await signUp(payload);
              } catch (error) {
                setAuthError(error.message || "Registration failed. Try another email.");
              }
            }}
          />

          {authError ? <p className="error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-brand">
          <img src={agunityLogo} alt="AGUNITY" className="logo-icon" />
          <h1>AGUNITY</h1>
        </div>
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
          <Route
            path="/marketplace"
            element={
              role === "farmer" || role === "buyer" || isAdmin
                ? <MarketplacePage role={role} />
                : <Navigate to={roleHome} replace />
            }
          />
          <Route path="/transporter" element={guard(["transporter"], <TransporterDashboard />)} />
          <Route path="/warehouse" element={guard(["warehouse"], <WarehouseDashboard />)} />
          <Route path="/retailer" element={guard(["retailer"], <RetailerDashboard />)} />
          <Route path="/consumer" element={guard(["consumer"], <ConsumerDashboard />)} />
          <Route path="/buyer" element={(role === "buyer" || isAdmin) ? <BuyerDashboard /> : <Navigate to={roleHome} replace />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to={roleHome} replace />} />
          <Route path="*" element={<Navigate to={roleHome} replace />} />
        </Routes>
      </main>
    </div>
  );
}
