import { LOGO_INK, LOGO_SUN, LOGO_VIEWBOX } from "./logo-paths";

/** The «табыл» wordmark; the letters follow the text colour, the sun stays yellow. */
export function Logo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label="Табыл">
      <path fill="#FFD43B" d={LOGO_SUN} />
      <path fill="currentColor" d={LOGO_INK} />
    </svg>
  );
}
