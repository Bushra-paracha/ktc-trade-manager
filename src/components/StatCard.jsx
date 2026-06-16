export default function StatCard({ icon: Icon, label, value, delta, deltaDirection, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-icon" style={{ background: accent + '22', color: accent }}>
          <Icon />
        </div>
        {delta && (
          <span className={'stat-card-delta ' + (deltaDirection || '')}>
            {delta}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
