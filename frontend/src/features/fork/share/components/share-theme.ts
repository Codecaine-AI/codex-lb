/**
 * Fixed palettes and capture dimensions for share cards. Hardcoded (not
 * theme tokens) so the exported image is identical in light and dark mode
 * and the rasterizer never resolves CSS variables.
 */
export const SHARE_DARK = {
  bg: "#0a0a0f",
  border: "#26262e",
  text: "#fafafa",
  muted: "#8e8e99",
  faint: "#63636e",
  accent: "#34d399",
} as const;

export const SHARE_PAPER = {
  bg: "#f7f4ec",
  rule: "#d8d2c4",
  text: "#292524",
  muted: "#78716c",
  accent: "#0d7a52",
} as const;

export const SHARE_CAPTURE_SIZES = {
  hero: { width: 1200, height: 675 },
  receipt: { width: 1080, height: 1350 },
} as const;

