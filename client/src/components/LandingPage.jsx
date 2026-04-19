import agunityLogo from "../assets/agunity-logo.svg";

export default function LandingPage({ onGetStarted, onSignIn }) {
  const highlights = [
    { value: "24/7", label: "AI advisory coverage", icon: "🌍" },
    { value: "1", label: "platform for all roles", icon: "🤝" },
    { value: "Live", label: "traceability + finance", icon: "⚡" }
  ];

  const capabilities = [
    {
      title: "Climate intelligence",
      description: "Actionable weather alerts, crop guidance, and field recommendations built for fast decisions.",
      icon: "🌦️"
    },
    {
      title: "Enterprise workflows",
      description: "Plan, track, and manage farming operations across farmers, buyers, transporters, and warehouses.",
      icon: "📋"
    },
    {
      title: "Financial control",
      description: "Monitor sales, settlements, and payments with a platform that is ready for real transactions.",
      icon: "💰"
    },
    {
      title: "Traceability by design",
      description: "Follow produce from farm to buyer with a clean digital chain of custody for every batch.",
      icon: "🔗"
    }
  ];

  const audiences = [
    "Farmers who need clear actions",
    "Buyers who need supply visibility",
    "Transporters and warehouses who need coordination"
  ];

  return (
    <section className="landing-shell">
      {/* Logo Header */}
      <div className="landing-logo-header">
        <img src={agunityLogo} alt="AGUNITY" className="landing-logo" />
        <h1 className="landing-logo-text">AGUNITY</h1>
        <p className="landing-logo-subtitle">Agricultural Operating System for Africa</p>
      </div>

      {/* Animated background elements */}
      <div className="landing-animated-bg">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">AGUNITY • AgOS for Africa</span>
          <h1>The agricultural operating system for modern food systems.</h1>
          <p className="lead">
            AGUNITY brings advisory, enterprise management, payments, and traceability into one
            platform so farms, buyers, and logistics teams can work from the same source of truth.
          </p>

          <div className="landing-actions">
            <button type="button" onClick={onGetStarted} className="btn-primary-glow">Get started</button>
            <button type="button" className="secondary-action" onClick={onSignIn}>Sign in</button>
          </div>

          <div className="landing-highlights" aria-label="Platform highlights">
            {highlights.map((item) => (
              <div key={item.label} className="landing-highlight highlight-hover">
                <span className="highlight-icon animate-bounce">{item.icon}</span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-panel">
          <div className="landing-panel-card">
            <span className="panel-kicker">What AGUNITY does</span>
            <h2>One platform. Multiple roles. Real operations.</h2>
            <ul className="landing-list">
              <li>⚙️ AI advisory for weather, crops, and field decisions</li>
              <li>👥 Role-based dashboards for every part of the value chain</li>
              <li>💳 Payment-ready backend with traceable records</li>
            </ul>
          </div>
          <div className="landing-band">
            <div className="animated-network">
              <div className="network-node node-1">👨‍🌾</div>
              <div className="network-node node-2">🏪</div>
              <div className="network-node node-3">🚚</div>
              <div className="network-node node-4">📦</div>
            </div>
            <p>Built to support farmers, buyers, transporters, warehouses, retailers, and administrators.</p>
          </div>
        </div>
      </div>

      <div className="landing-section">
        <div className="section-heading">
          <span className="eyebrow">Why AGUNITY</span>
          <h2>Designed for execution, not just dashboards.</h2>
          <p>
            The product is built to remove friction across the farm-to-market journey, with
            practical tools that help teams act faster.
          </p>
        </div>

        <div className="feature-grid">
          {capabilities.map((item, idx) => (
            <article key={item.title} className="feature-card feature-card-animate" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="feature-icon-container">
                <span className="feature-icon">{item.icon}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="landing-section landing-split stats-section">
        <div className="section-heading compact">
          <span className="eyebrow">Impact by the numbers</span>
          <h2>Powering the future of agriculture.</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-animate">
            <span className="stat-number">1000+</span>
            <span className="stat-label">Farmers Connected</span>
          </div>
          <div className="stat-card stat-animate" style={{ animationDelay: '0.1s' }}>
            <span className="stat-number">50M+</span>
            <span className="stat-label">KES Transacted</span>
          </div>
          <div className="stat-card stat-animate" style={{ animationDelay: '0.2s' }}>
            <span className="stat-number">100%</span>
            <span className="stat-label">Traceability Rate</span>
          </div>
        </div>
      </div>

      <div className="landing-section landing-split">
        <div className="section-heading compact">
          <span className="eyebrow">Who it’s for</span>
          <h2>Built for the people moving food through the system.</h2>
        </div>

        <div className="audience-list">
          {audiences.map((item, idx) => (
            <div key={item} className="audience-item audience-hover" style={{ animationDelay: `${idx * 0.1}s` }}>
              <span className="audience-dot pulse" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="landing-cta-final">
        <h2>Ready to transform your farming?</h2>
        <p>Join thousands of farmers and enterprises already using AGUNITY.</p>
        <button type="button" onClick={onGetStarted} className="btn-final-cta">Start your journey</button>
      </div>
    </section>
  );
}