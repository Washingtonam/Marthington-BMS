const iconMap = {
  add: "+",
  alert: "!",
  arrow: "->",
  boxes: "#",
  building: "B",
  chart: "%",
  dollar: "$",
  loader: "...",
  logout: "x",
  menu: "=",
  package: "P",
  search: "/",
  settings: "*",
  stock: "S",
  team: "@",
  cart: "$",
  receipt: "R",
  wallet: "W"
};

const Icon = ({ name, className = "" }) => {
  return (
    <span aria-hidden="true" className={`text-icon ${className}`}>
      {iconMap[name] || "•"}
    </span>
  );
};

export default Icon;
