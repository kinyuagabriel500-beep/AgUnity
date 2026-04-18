export default function LandingPage({ onGetStarted, onSignIn }) {
  const highlights = [
    { value: "24/7", label: "AI advisory coverage" },
    { value: "1", label: "platform for all roles" },
    { value: "Live", label: "traceability + finance" }
  ];

  const capabilities = [
    {
      title: "Climate intelligence",
      description: "Actionable weather alerts, crop guidance, and field recommendations built for fast decisions."
    },
    {
      title: "Enterprise workflows",
      description: "Plan, track, and manage farming operations across farmers, buyers, transporters, and warehouses."
    },
    {
      title: "Financial control",
      description: "Monitor sales, settlements, and payments with a platform that is ready for real transactions."
    },
    {
      title: "Traceability by design",
      description: "Follow produce from farm to buyer with a clean digital chain of custody for every batch."
    }
  ];

  const audiences = [
    "Farmers who need clear actions",
    "Buyers who need supply visibility",
    "Transporters and warehouses who need coordination"
  ];

  return (
    <section className="landing-shell">
      <div className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">AGUNITY • AgOS for Africa</span>
          <h1>The agricultural operating system for modern food systems.</h1>
          <p className="lead">
            AGUNITY brings advisory, enterprise management, payments, and traceability into one
            platform so farms, buyers, and logistics teams can work from the same source of truth.
          </p>

          <div className="landing-actions">
            <button type="button" onClick={onGetStarted}>Get started</button>
            <button type="button" className="secondary-action" onClick={onSignIn}>Sign in</button>
          </div>

          <div className="landing-highlights" aria-label="Platform highlights">
            {highlights.map((item) => (
              <div key={item.label} className="landing-highlight">
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
              <li>AI advisory for weather, crops, and field decisions</li>
              <li>Role-based dashboards for every part of the value chain</li>
              <li>Payment-ready backend with traceable records</li>
            </ul>
          </div>
          <div className="landing-band">
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
          {capabilities.map((item) => (
            <article key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="landing-section landing-split">
        <div className="section-heading compact">
          <span className="eyebrow">Who it’s for</span>
          <h2>Built for the people moving food through the system.</h2>
        </div>

        <div className="audience-list">
          {audiences.map((item) => (
            <div key={item} className="audience-item">
              <span className="audience-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}