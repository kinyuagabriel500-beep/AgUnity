export default function NetworkBadge({ online }) {
  return <span className={`network ${online ? "ok" : "warn"}`}>{online ? "Online" : "Low Network"}</span>;
}
