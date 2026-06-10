/**
 * Seamless honeycomb (hexagon) texture — pure CSS background, no JS, fully
 * server-renderable. Drop it as an absolutely-positioned layer over any
 * surface. Used faintly app-wide (the BeeEnglish "tổ ong" motif) and strongly
 * over the sage-green hero/nav bands.
 *
 *   <Honeycomb className="absolute inset-0" color="#ffffff" opacity={0.14} />
 */
export function Honeycomb({
  className,
  color = "#ffffff",
  opacity = 0.12,
  size = 28,
}: {
  className?: string;
  /** Hex outline color (any CSS hex). */
  color?: string;
  opacity?: number;
  /** Tile width in px (height scales to keep the comb regular). */
  size?: number;
}) {
  // Encode the fill color for the data-URI (e.g. "#fff" -> "%23fff").
  const fill = color.replace("#", "%23");
  const svg =
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E` +
    `%3Cg fill-rule='evenodd'%3E%3Cg fill='${fill}'%3E` +
    `%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E` +
    `%3C/g%3E%3C/g%3E%3C/svg%3E`;
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url("${svg}")`,
        backgroundSize: `${size}px ${Math.round((size * 49) / 28)}px`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}
