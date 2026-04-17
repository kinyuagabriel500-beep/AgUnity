export default function KpiCard({ title, value, hint }) {
  return (
    <section className="kpi-card">
      <p>{title}</p>
      <h3>{value}</h3>
      <small>{hint}</small>
    </section>
  );
}
