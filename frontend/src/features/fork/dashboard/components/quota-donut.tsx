import { useMemo, useState, type ReactNode } from "react";
import { Cell, Pie, PieChart, Sector, type PieSectorShapeProps } from "recharts";

import type { RemainingItem } from "@/features/dashboard/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { useThemeStore } from "@/hooks/use-theme";
import { formatCompactNumber, formatNumber } from "@/utils/formatters";

const CHART_SIZE = 152;
const CHART_MARGIN = 4;
const PIE_CX = 72;
const PIE_CY = 72;
const INNER_R = 53;
const OUTER_R = 68;
const ACTIVE_RADIUS_OFFSET = 4;

type DonutDatum = {
  id: string;
  name: string;
  isEmail: boolean;
  value: number;
  fill: string;
};

export type QuotaDonutProps = {
  title: string;
  /** Per-account remaining segments; not listed out, only shown on hover. */
  items: RemainingItem[];
  /** Window capacity in credits. */
  total: number;
  /** Sum of remaining credits, rendered in the donut center. */
  centerValue: number;
  footer?: ReactNode;
};

/**
 * Legend-free aggregate quota donut. The per-account breakdown stays out of
 * the layout; hovering a segment reveals that account in the readout line.
 */
export function QuotaDonut({ title, items, total, centerValue, footer }: QuotaDonutProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const blurred = usePrivacyStore((s) => s.blurred);
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);
  const consumedColor = isDark ? "#404040" : "#d3d3d3";

  const chartData: DonutDatum[] = useMemo(() => {
    const segments = [...items]
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        id: item.accountId,
        name: `${item.label}${item.labelSuffix}`,
        isEmail: item.isEmail,
        value: Math.max(0, item.value),
        fill: item.color,
      }));
    const remainingSum = segments.reduce((sum, segment) => sum + segment.value, 0);
    const consumed = Math.max(0, total - remainingSum);
    if (consumed > 0) {
      segments.push({ id: "__consumed__", name: "__consumed__", isEmail: false, value: consumed, fill: consumedColor });
    }
    if (!segments.some((segment) => segment.value > 0)) {
      return [{ id: "__empty__", name: "__empty__", isEmail: false, value: 1, fill: consumedColor }];
    }
    return segments;
  }, [items, total, consumedColor]);

  const activeItem = activeId
    ? chartData.find((datum) => datum.id === activeId && !datum.id.startsWith("__"))
    : undefined;

  const renderDonutShape = (props: PieSectorShapeProps) => {
    const isHighlighted =
      props.isActive || (props.payload as DonutDatum | undefined)?.id === activeId;
    const outerRadius = typeof props.outerRadius === "number"
      ? props.outerRadius + (isHighlighted ? ACTIVE_RADIUS_OFFSET : 0)
      : OUTER_R + (isHighlighted ? ACTIVE_RADIUS_OFFSET : 0);

    return (
      <Sector
        {...props}
        outerRadius={outerRadius}
        stroke={isHighlighted ? "hsl(var(--background))" : "none"}
        strokeWidth={isHighlighted ? 2 : 0}
      />
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-center text-sm font-semibold">{title}</h3>
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="relative h-[152px] w-[152px] overflow-visible">
          <PieChart
            width={CHART_SIZE}
            height={CHART_SIZE}
            margin={{ top: CHART_MARGIN, right: CHART_MARGIN, bottom: CHART_MARGIN, left: CHART_MARGIN }}
          >
            <Pie
              data={chartData}
              cx={PIE_CX}
              cy={PIE_CY}
              innerRadius={INNER_R}
              outerRadius={OUTER_R}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              shape={renderDonutShape}
              isAnimationActive={!reducedMotion}
              animationDuration={600}
              animationEasing="ease-out"
              onMouseEnter={(data) => {
                const datum = data.payload as DonutDatum | undefined;
                if (typeof datum?.id === "string" && !datum.id.startsWith("__")) {
                  setActiveId(datum.id);
                } else {
                  setActiveId(null);
                }
              }}
              onMouseLeave={() => setActiveId(null)}
              onMouseOut={() => setActiveId(null)}
            >
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Credits
            </span>
            <span className="text-lg font-semibold tabular-nums">{formatNumber(Math.round(centerValue))}</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {formatNumber(Math.round(total))}
            </span>
          </div>
        </div>
        {/* Empty until a segment is hovered — reserved height avoids reflow. */}
        <p data-testid="quota-donut-readout" className="h-4 text-xs text-muted-foreground">
          {activeItem ? (
            <>
              <span className={blurred && activeItem.isEmail ? "privacy-blur" : undefined}>
                {activeItem.name}
              </span>
              {" · "}
              <span className="tabular-nums">{formatCompactNumber(activeItem.value)} left</span>
            </>
          ) : null}
        </p>
        {footer}
      </div>
    </div>
  );
}
