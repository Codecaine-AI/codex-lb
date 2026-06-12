import { formatCompactNumber, formatCurrency, formatNumber, truncateText } from "@/utils/formatters";
import type { ReceiptData } from "@/features/fork/share/share-data";
import { ShareQrCode } from "@/features/fork/share/components/share-qr";
import { SHARE_CAPTURE_SIZES, SHARE_PAPER } from "@/features/fork/share/components/share-theme";

// Placeholder while prototyping; becomes a fork setting if this variant
// ships (plans differ: Plus $20/mo, Pro $200/mo).
const PLAN_USD_PER_MONTH = 200;

function ReceiptRule() {
  return <div className="border-t-2 border-dashed" style={{ borderColor: SHARE_PAPER.rule }} />;
}

type ReceiptRowProps = {
  label: string;
  value: string;
  indent?: boolean;
  muted?: boolean;
};

function ReceiptRow({ label, value, indent = false, muted = false }: ReceiptRowProps) {
  const color = muted ? SHARE_PAPER.muted : SHARE_PAPER.text;
  return (
    <div className="flex items-baseline justify-between text-[28px]" style={{ color }}>
      <span className={indent ? "pl-8" : undefined}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Deterministic decorative barcode derived from the token count. */
function ReceiptBarcode({ seed }: { seed: number }) {
  const digits = String(Math.abs(Math.trunc(seed))).padStart(12, "7");
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const char of `${digits}${digits}`) {
    const width = (Number(char) % 4) + 2;
    bars.push({ x, width });
    x += width + 5;
  }
  return (
    <svg width={x} height={56} viewBox={`0 0 ${x} 56`} aria-hidden="true">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={56} fill={SHARE_PAPER.text} />
      ))}
    </svg>
  );
}

export type ShareCardReceiptProps = {
  data: ReceiptData;
  /** Brand line printed above the receipt title; empty omits it. */
  brandText?: string;
  /** QR target; empty falls back to the decorative barcode. */
  qrUrl?: string;
};

/**
 * Receipt share card: 1080x1350 (4:5 portrait), itemized usage on a fixed
 * paper-light palette — tokens broken down by model, requests, and the
 * est.-API-cost vs. plan-cost punchline.
 */
export function ShareCardReceipt({ data, brandText, qrUrl }: ShareCardReceiptProps) {
  const { width, height } = SHARE_CAPTURE_SIZES.receipt;
  const planPaidUsd = data.accountCount * PLAN_USD_PER_MONTH * (data.windowDays / 30);
  const savingsPercent =
    data.costUsd > 0 && planPaidUsd > 0 ? Math.round((1 - planPaidUsd / data.costUsd) * 100) : null;

  return (
    <div
      data-testid="share-card-receipt"
      className="flex flex-col px-20 py-16 font-mono"
      style={{ width, height, backgroundColor: SHARE_PAPER.bg, color: SHARE_PAPER.text }}
    >
      <div className="text-center">
        {brandText ? (
          <p className="text-[30px] font-semibold tracking-[0.08em]">{brandText}</p>
        ) : null}
        <p className={`text-[44px] font-bold tracking-[0.22em]${brandText ? " mt-2" : ""}`}>USAGE RECEIPT</p>
        <p className="mt-4 text-[26px]" style={{ color: SHARE_PAPER.muted }}>
          {data.cadenceLabel} · {data.dateRangeLabel}
        </p>
      </div>

      <div className="mt-12 space-y-7">
        <ReceiptRule />
        <ReceiptRow label="TOKENS" value={formatCompactNumber(data.tokens)} />
        {data.modelLines.map((line) => (
          <ReceiptRow
            key={line.model}
            label={`· ${truncateText(line.model, 20)}`}
            value={formatCompactNumber(line.tokens)}
            indent
            muted
          />
        ))}
        <ReceiptRow label="REQUESTS" value={formatNumber(data.requests)} />
        <ReceiptRule />
      </div>

      <div className="mt-10 space-y-7">
        <div className="flex items-baseline justify-between text-[40px] font-bold">
          <span>EST. API COST</span>
          <span>{formatCurrency(data.costUsd)}</span>
        </div>
        <ReceiptRow
          label={`YOU PAID (${data.accountCount}× plan)`}
          value={`~${formatCurrency(planPaidUsd)}`}
          muted
        />
        <div
          className="flex items-baseline justify-between px-6 py-4 text-[40px] font-bold"
          style={{ backgroundColor: SHARE_PAPER.text, color: SHARE_PAPER.bg }}
        >
          <span>SAVINGS</span>
          <span>{savingsPercent !== null ? `${savingsPercent}%` : "--"}</span>
        </div>
        <ReceiptRule />
      </div>

      <div className="mt-auto flex flex-col items-center gap-5 text-center">
        {qrUrl ? (
          <>
            <ShareQrCode value={qrUrl} size={200} color={SHARE_PAPER.text} background={SHARE_PAPER.bg} />
            <p className="text-[22px]" style={{ color: SHARE_PAPER.muted }}>
              {qrUrl.replace(/^https?:\/\//, "")}
            </p>
          </>
        ) : (
          <ReceiptBarcode seed={data.tokens} />
        )}
      </div>
    </div>
  );
}
