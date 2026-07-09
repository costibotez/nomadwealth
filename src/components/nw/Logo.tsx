import { cn } from "@/lib/utils";

/**
 * The NomadWealth mark (orange "N" + arrow + hexagon). Square, theme-agnostic
 * (orange reads on both light and dark). Used where only the mark fits, e.g. a
 * collapsed sidebar. `size` is the rendered px height/width.
 */
export function LogoMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo-mark.png"
      alt="NomadWealth"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * The full NomadWealth wordmark (mark + "NomadWealth"). Two artworks are shipped
 * and swapped by theme: white text on dark surfaces, dark text on light. The
 * active one is chosen via the `.light` class on <html> (see globals.css), so it
 * works in both marketing and dashboard chrome with no JS.
 */
export function Wordmark({
  className,
  height = 26,
}: {
  className?: string;
  height?: number;
}) {
  const common = "w-auto";
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* dark surfaces → white-text logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt="NomadWealth"
        className={cn("nw-logo--dark", common)}
        style={{ height }}
      />
      {/* light surfaces → dark-text logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.png"
        alt="NomadWealth"
        className={cn("nw-logo--light", common)}
        style={{ height }}
      />
    </span>
  );
}
