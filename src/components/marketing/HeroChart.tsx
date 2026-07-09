/** Lightweight inline SVG area chart for the landing preview (token colors). */
const SERIES = [
  620, 640, 610, 660, 690, 700, 730, 760, 745, 800, 850, 830, 880, 930, 910,
  965, 1000, 1010, 1033,
];

export function HeroChart() {
  const w = 1000;
  const h = 220;
  const min = Math.min(...SERIES);
  const max = Math.max(...SERIES);
  const stepX = w / (SERIES.length - 1);
  const y = (v: number) => h - ((v - min) / (max - min)) * (h - 20) - 10;
  const pts = SERIES.map((v, i) => `${i * stepX},${y(v)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label="Net worth trending upward"
    >
      <defs>
        <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-fill-top)" />
          <stop offset="100%" stopColor="var(--chart-fill-bot)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="0"
          x2={w}
          y1={h * f}
          y2={h * f}
          stroke="var(--chart-grid)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#hero-fill)" />
      <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="2.5" />
      <circle
        cx={(SERIES.length - 1) * stepX}
        cy={y(SERIES[SERIES.length - 1])}
        r="5"
        fill="var(--chart-line)"
        stroke="var(--chart-dot-ring)"
        strokeWidth="3"
      />
    </svg>
  );
}
