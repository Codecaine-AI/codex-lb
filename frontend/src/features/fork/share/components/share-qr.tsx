import { useMemo } from "react";
import qrcode from "qrcode-generator";

export type ShareQrCodeProps = {
  value: string;
  size: number;
  color: string;
  background?: string;
};

const QUIET_ZONE_MODULES = 2;

/**
 * Inline-SVG QR code for share cards. One unit per module with a quiet
 * zone, crisp-edges rendering — deterministic for DOM-to-image capture.
 */
export function ShareQrCode({ value, size, color, background }: ShareQrCodeProps) {
  const modules = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const rows: boolean[][] = [];
    for (let row = 0; row < count; row += 1) {
      const cells: boolean[] = [];
      for (let col = 0; col < count; col += 1) {
        cells.push(qr.isDark(row, col));
      }
      rows.push(cells);
    }
    return rows;
  }, [value]);

  const total = modules.length + QUIET_ZONE_MODULES * 2;

  return (
    <svg
      data-testid="share-qr"
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {background ? <rect x={0} y={0} width={total} height={total} fill={background} /> : null}
      {modules.flatMap((row, rowIndex) =>
        row.map((dark, colIndex) =>
          dark ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex + QUIET_ZONE_MODULES}
              y={rowIndex + QUIET_ZONE_MODULES}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
