import { encode } from "uqr";

/**
 * QR code como imagem SVG (data URI): cada módulo escuro vira um quadrado do
 * mesmo `<path>`. Fundo branco e borda de 4 módulos, como pede a norma.
 * Montado no servidor ou no cliente, sem innerHTML.
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
  let d = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) d += `M${x} ${y}h1v1h-1z`;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges"><rect width="${modules}" height="${modules}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- data URI gerado aqui; next/image não otimiza SVG inline.
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      alt={label}
      width={size}
      height={size}
      className="rounded-xl"
    />
  );
}
