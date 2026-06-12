import { formatCompactNumber, formatCurrency, formatNumber } from "@/utils/formatters";
import type { ShareCardData } from "@/features/fork/share/share-data";
import { ShareBrand } from "@/features/fork/share/components/share-brand";
import { ShareSparkline } from "@/features/fork/share/components/share-sparkline";
import { SHARE_CAPTURE_SIZES, SHARE_DARK } from "@/features/fork/share/components/share-theme";

type HeroStatProps = {
  value: string;
  label: string;
  qualifier: string;
};

function HeroStat({ value, label, qualifier }: HeroStatProps) {
  return (
    <div>
      <p className="text-[64px] font-semibold leading-none tracking-[-0.03em]" style={{ color: SHARE_DARK.text }}>
        {value}
      </p>
      <p className="mt-4 text-[15px] font-medium uppercase tracking-[0.18em]" style={{ color: SHARE_DARK.muted }}>
        {label}
      </p>
      <p className="mt-2 text-[16px]" style={{ color: SHARE_DARK.faint }}>
        {qualifier}
      </p>
    </div>
  );
}

export type ShareCardHeroProps = {
  data: ShareCardData;
  /** Wordmark next to the logo mark; empty renders the mark alone. */
  brandText?: string;
};

/**
 * Hero share card: 1200x675 (Twitter summary_large_image ratio), three big
 * stats and a token sparkline on a fixed dark palette.
 */
export function ShareCardHero({ data, brandText }: ShareCardHeroProps) {
  const { width, height } = SHARE_CAPTURE_SIZES.hero;
  const cachedQualifier =
    data.cachedPercent !== null ? `${Math.round(data.cachedPercent)}% cached` : "cache: --";
  const successQualifier =
    data.successPercent !== null ? `${data.successPercent.toFixed(1)}% success` : "success: --";

  return (
    <div
      data-testid="share-card-hero"
      className="flex flex-col justify-between px-16 py-12"
      style={{ width, height, backgroundColor: SHARE_DARK.bg }}
    >
      <div className="flex items-center justify-between">
        <ShareBrand color={SHARE_DARK.text} accent={SHARE_DARK.accent} text={brandText} />
        <span className="text-[18px] font-medium" style={{ color: SHARE_DARK.muted }}>
          {data.rangeLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-10">
        <HeroStat value={formatCompactNumber(data.tokens)} label="Tokens" qualifier={cachedQualifier} />
        <HeroStat value={formatCurrency(data.costUsd)} label="Est. API cost" qualifier="if paid per-token" />
        <HeroStat value={formatNumber(data.requests)} label="Requests" qualifier={successQualifier} />
      </div>

      <div>
        <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.18em]" style={{ color: SHARE_DARK.faint }}>
          Token volume
        </p>
        <ShareSparkline values={data.tokensTrend} width={width - 128} height={104} stroke={SHARE_DARK.accent} />
      </div>

      <div
        className="flex items-center justify-between border-t pt-6 text-[16px]"
        style={{ borderColor: SHARE_DARK.border, color: SHARE_DARK.muted }}
      >
        <span>{data.cadenceLabel} snapshot</span>
        <span>{data.dateRangeLabel}</span>
      </div>
    </div>
  );
}
