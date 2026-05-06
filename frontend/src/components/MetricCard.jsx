import Icon from "./Icon.jsx";

const MetricCard = ({ icon, label, value, tone = "neutral", meta }) => {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {meta ? <small>{meta}</small> : null}
      </div>
    </article>
  );
};

export default MetricCard;
