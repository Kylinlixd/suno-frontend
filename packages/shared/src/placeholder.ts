/** 本地 SVG 占位图，避免运行时依赖 picsum 等外网图片服务 */

const PALETTES: Array<[string, string]> = [
  ["#dcd8cc", "#b3ad9d"],
  ["#d6d3c6", "#a3ac93"],
  ["#ddd3c5", "#c2b299"],
  ["#d2d5ca", "#96a48b"],
  ["#d8d0c2", "#b7a58e"]
];

export function placeholderImage(seed: string, ratio: "portrait" | "landscape" = "portrait"): string {
  const hash = Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const [bg, fg] = PALETTES[hash % PALETTES.length];
  const label = (seed.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "SUNO");
  const width = ratio === "portrait" ? 800 : 1200;
  const height = ratio === "portrait" ? 1000 : 900;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${bg}"/><circle cx="${50 + (hash % 30) - 15}%" cy="${46 + (hash % 24) - 12}%" r="${30 + (hash % 16)}%" fill="${fg}" opacity=".5"/><text x="50%" y="54%" font-family="Georgia, 'Times New Roman', serif" font-size="${Math.round(width / 6.4)}" letter-spacing="${Math.round(width / 40)}" fill="rgba(21,23,20,.4)" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
