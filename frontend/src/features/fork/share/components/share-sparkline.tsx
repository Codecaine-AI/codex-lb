export type ShareSparklineProps = {
  values: number[];
  width: number;
  height: number;
  stroke: string;
  fillOpacity?: number;
};

/**
 * Inline-SVG sparkline for share cards. Hand-rolled instead of Recharts so
 * the markup is static and deterministic for DOM-to-image capture.
 */
export function ShareSparkline({ values, width, height, stroke, fillOpacity = 0.12 }: ShareSparklineProps) {
  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={area} fill={stroke} fillOpacity={fillOpacity} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
