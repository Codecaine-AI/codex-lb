import { useRef, useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { domToPng } from "modern-screenshot";

import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import type { DashboardOverview } from "@/features/dashboard/schemas";
import { useReports } from "@/features/reports/hooks/use-reports";
import { daysAgoLocalISO, localDateISO } from "@/features/reports/date";
import type { ReportsResponse } from "@/features/reports/schemas";
import {
  buildReceiptData,
  buildShareCardData,
  formatShareDateRange,
  withEstimatedModelTokens,
  SHARE_CADENCES,
  type ShareCadence,
} from "@/features/fork/share/share-data";
import { ShareCardHero } from "@/features/fork/share/components/share-card-hero";
import { ShareCardReceipt } from "@/features/fork/share/components/share-card-receipt";
import { SHARE_CAPTURE_SIZES } from "@/features/fork/share/components/share-theme";

const LANDSCAPE_SCALE = 0.36;
const PORTRAIT_SCALE = 0.32;

const BRAND_STORAGE_KEY = "codex-lb-fork-share-brand";
const QR_URL_STORAGE_KEY = "codex-lb-fork-share-qr-url";
const BRAND_PRESETS = ["Lascari AI", "Codecaine"];

function useStoredSetting(key: string, initial: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => window.localStorage.getItem(key) ?? initial);
  const update = (next: string) => {
    setValue(next);
    window.localStorage.setItem(key, next);
  };
  return [value, update];
}

type ShareLabSettings = {
  brandText: string;
  qrUrl: string;
};

type ShareLabSettingsBarProps = ShareLabSettings & {
  onBrandTextChange: (value: string) => void;
  onQrUrlChange: (value: string) => void;
};

function ShareLabSettingsBar({
  brandText,
  qrUrl,
  onBrandTextChange,
  onQrUrlChange,
}: ShareLabSettingsBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="share-brand-input">Branding</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="share-brand-input"
            value={brandText}
            onChange={(event) => onBrandTextChange(event.target.value)}
            placeholder="No branding"
            className="h-8 w-44"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => onBrandTextChange("")}>
            None
          </Button>
          {BRAND_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onBrandTextChange(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="share-qr-input">QR link</Label>
        <Input
          id="share-qr-input"
          value={qrUrl}
          onChange={(event) => onQrUrlChange(event.target.value)}
          placeholder="https://… (empty = barcode)"
          className="h-8 w-72"
        />
      </div>
    </div>
  );
}

type ScaledCardProps = {
  width: number;
  height: number;
  scale: number;
  label: string;
  fileName: string;
  children: ReactNode;
};

/**
 * Scaled preview that expands to a near-fullscreen modal on click and
 * downloads as a PNG at 2x capture size.
 */
function ScaledCard({ width, height, scale, label, fileName, children }: ScaledCardProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const handleOpen = () => {
    setZoom(Math.min((window.innerWidth - 96) / width, (window.innerHeight - 160) / height, 1));
    setOpen(true);
  };

  const handleDownload = async () => {
    if (!captureRef.current || downloading) {
      return;
    }
    setDownloading(true);
    try {
      // width/height must be explicit: the library otherwise sizes the
      // canvas from getBoundingClientRect(), which reflects the preview's
      // scale() transform and crops the capture to the top-left corner.
      const dataUrl = await domToPng(captureRef.current, {
        width,
        height,
        scale: 2,
        style: { transform: "none" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const downloadButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={downloading}
      onClick={() => void handleDownload()}
    >
      <Download className="h-3.5 w-3.5" />
      {downloading ? "Rendering…" : "PNG"}
    </Button>
  );

  return (
    <figure className="space-y-2">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Expand ${label}`}
        className="block cursor-zoom-in overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          ref={captureRef}
          style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </button>
      <figcaption className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        {downloadButton}
      </figcaption>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto max-w-none sm:max-w-none">
          <DialogTitle className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <span>{label}</span>
            {downloadButton}
          </DialogTitle>
          <div
            className="overflow-hidden rounded-lg border"
            style={{ width: width * zoom, height: height * zoom }}
          >
            <div style={{ width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

function receiptDateRangeLabel(windowDays: number, now: Date = new Date()): string {
  const start = new Date(now);
  start.setDate(now.getDate() - (windowDays - 1));
  return formatShareDateRange(start, now);
}

type CadenceSectionProps = {
  cadence: ShareCadence;
  settings: ShareLabSettings;
};

function CadenceSection({ cadence, settings }: CadenceSectionProps) {
  const overviewQuery = useDashboard(cadence.timeframe);
  const reportsQuery = useReports({
    startDate: daysAgoLocalISO(cadence.windowDays - 1),
    endDate: localDateISO(),
    accountId: [],
    model: undefined,
  });

  return (
    <section
      data-testid={`share-lab-section-${cadence.cadenceLabel.toLowerCase()}`}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          {cadence.cadenceLabel}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <QueryError query={overviewQuery} />
      <QueryError query={reportsQuery} />
      <div className="flex flex-wrap items-start gap-6">
        <HeroPreview cadence={cadence} overviewQuery={overviewQuery} settings={settings} />
        <ReceiptPreview
          cadence={cadence}
          overviewQuery={overviewQuery}
          reportsQuery={reportsQuery}
          settings={settings}
        />
      </div>
    </section>
  );
}

function QueryError({ query }: { query: UseQueryResult<unknown> }) {
  const message = (query.error instanceof Error && query.error.message) || null;
  return message ? <AlertMessage variant="error">{message}</AlertMessage> : null;
}

type HeroPreviewProps = {
  cadence: ShareCadence;
  overviewQuery: UseQueryResult<DashboardOverview>;
  settings: ShareLabSettings;
};

function HeroPreview({ cadence, overviewQuery, settings }: HeroPreviewProps) {
  const { width, height } = SHARE_CAPTURE_SIZES.hero;
  if (!overviewQuery.data) {
    return <LoadingCard width={width * LANDSCAPE_SCALE} height={height * LANDSCAPE_SCALE} />;
  }
  return (
    <ScaledCard
      width={width}
      height={height}
      scale={LANDSCAPE_SCALE}
      label={`Hero · ${width}×${height}`}
      fileName={`usage-hero-${cadence.cadenceLabel.toLowerCase()}.png`}
    >
      <ShareCardHero data={buildShareCardData(overviewQuery.data)} brandText={settings.brandText} />
    </ScaledCard>
  );
}

type ReceiptPreviewProps = {
  cadence: ShareCadence;
  overviewQuery: UseQueryResult<DashboardOverview>;
  reportsQuery: UseQueryResult<ReportsResponse>;
  settings: ShareLabSettings;
};

function ReceiptPreview({ cadence, overviewQuery, reportsQuery, settings }: ReceiptPreviewProps) {
  const { width, height } = SHARE_CAPTURE_SIZES.receipt;
  if (!reportsQuery.data || !overviewQuery.data) {
    return <LoadingCard width={width * PORTRAIT_SCALE} height={height * PORTRAIT_SCALE} />;
  }
  const { reports, estimated } = withEstimatedModelTokens(reportsQuery.data);
  const data = buildReceiptData(reports, {
    cadenceLabel: cadence.cadenceLabel,
    dateRangeLabel: receiptDateRangeLabel(cadence.windowDays),
    windowDays: cadence.windowDays,
    accountCount: overviewQuery.data.accounts.length,
  });
  const label = estimated
    ? `Receipt · ${width}×${height} · model split estimated from cost share`
    : `Receipt · ${width}×${height}`;
  return (
    <ScaledCard
      width={width}
      height={height}
      scale={PORTRAIT_SCALE}
      label={label}
      fileName={`usage-receipt-${cadence.cadenceLabel.toLowerCase()}.png`}
    >
      <ShareCardReceipt data={data} brandText={settings.brandText} qrUrl={settings.qrUrl.trim()} />
    </ScaledCard>
  );
}

function LoadingCard({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border text-sm text-muted-foreground"
      style={{ width, height }}
    >
      Loading…
    </div>
  );
}

/**
 * Prototype gallery for the usage share image: the hero and receipt layout
 * candidates at every posting cadence, rendered from live data. Not linked
 * from the nav; visit /share-lab directly.
 */
export function ForkShareLabPage() {
  const [brandText, setBrandText] = useStoredSetting(BRAND_STORAGE_KEY, "");
  const [qrUrl, setQrUrl] = useStoredSetting(QR_URL_STORAGE_KEY, "https://lascari.ai");
  const settings: ShareLabSettings = { brandText, qrUrl };

  return (
    <div data-testid="fork-share-lab-page" className="animate-fade-in-up space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Share lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Layout candidates for the shareable usage image, rendered from live data at each posting
          cadence. Click a card to inspect it near full size.
        </p>
      </div>
      <ShareLabSettingsBar
        brandText={brandText}
        qrUrl={qrUrl}
        onBrandTextChange={setBrandText}
        onQrUrlChange={setQrUrl}
      />
      {SHARE_CADENCES.map((cadence) => (
        <CadenceSection key={cadence.timeframe} cadence={cadence} settings={settings} />
      ))}
    </div>
  );
}
