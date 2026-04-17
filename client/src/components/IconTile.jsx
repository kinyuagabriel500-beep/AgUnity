export default function IconTile({ icon, label, value }) {
  return (
    <article className="icon-tile">
      <span className="emoji" aria-hidden>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
