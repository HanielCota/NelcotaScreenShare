import { encode } from "uqr";

/**
 * QR code as an SVG image (data URI): each dark module becomes a square in the
 * same `<path>`. White background and a 4-module quiet zone, as the spec requires.
 * Built on the server or the client, without innerHTML.
 */
export function QrCode({
  value,
  label,
  size = 192,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const { data } = encode(value, { ecc: "M", border: 4 });
  const modules = data.length;
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges"><rect width="${modules}" height="${modules}" fill="#fff"/><path d="${path}" fill="#111"/></svg>`;
  return (
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      alt={label}
      width={size}
      height={size}
      className="rounded-xl"
    />
  );
}
