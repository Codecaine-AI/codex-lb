export type ShareBrandProps = {
  color: string;
  accent: string;
  /** Wordmark next to the logo mark; empty renders the mark alone. */
  text?: string;
};

export function ShareBrand({ color, accent, text }: ShareBrandProps) {
  return (
    <span className="flex items-center gap-3">
      <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true">
        <circle cx={13} cy={13} r={11} fill="none" stroke={accent} strokeWidth={3} />
        <circle cx={13} cy={13} r={5} fill={accent} />
      </svg>
      {text ? (
        <span className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color }}>
          {text}
        </span>
      ) : null}
    </span>
  );
}
