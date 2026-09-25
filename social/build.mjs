// Writes the favicon and the three social preview cards as SVG, then rasterises them with
// rsvg-convert. The site itself has no build step; this runs only when an image changes.
//
//   DESIGN_DIR=<a checkout of the NoeticEcho UI design system> node social/build.mjs
//
// The mark is not drawn by hand. It is one frame of the design system's mark function
// (components/core/noetic.js, noetic-function/0.4.0): the canonical seed, the idle state,
// condensation 1, which the design system calls the rune and names as the form for a favicon
// or a stamp. Only the spines are drawn, at a weight that survives 16 px; how much detail to
// draw is a renderer's decision there, never a second identity.
//
// The PNGs need the site's own fonts (assets/fonts/). rsvg-convert finds fonts through
// fontconfig and cannot shape from WOFF2, so the script decompresses them to TrueType in a
// temporary directory (python3 with fontTools and brotli) and points FONTCONFIG_FILE there.
// Needs: node, rsvg-convert, python3 with fontTools and brotli.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const DESIGN = process.env.DESIGN_DIR;
if (!DESIGN) { console.error("DESIGN_DIR must name the design system checkout"); process.exit(2); }

const { evaluate } = await import(pathToFileURL(path.join(DESIGN, "components/core/noetic.js")).href);
const { paletteOf, mapPoints } = await import(pathToFileURL(path.join(DESIGN, "components/core/noetic-render.js")).href);
const T = JSON.parse(fs.readFileSync(path.join(DESIGN, "tokens/noetic.json"), "utf8"));

// Token values, dark (ink) register, from tokens/colors.css.
const C = {
  ink000: "#0A0B09", ink100: "#121113", ink200: "#1A181B",
  paper100: "#E9E3D2", ash300: "#B3AFA3", ash400: "#98948A", muted: "#848179",
  brass300: "#E4CDA0", brass500: "#C9A66B", hairline: "rgba(233,227,210,0.16)",
  rule: "#45453F",
};
const PIGMENTS = { mutation: "#B85C32", state: "#4D776D", discovery: "#C6A447", uncertainty: "#5D536B", transition: "#7A5C9E", echo: "#8FB7D6" };

const frame = evaluate({ seed: T.seed, genome: T.genome, laws: T.laws, state: T.states.idle, envelope: T.signatureEnvelope, time: 96, condensation: 1 });
const P = paletteOf(frame, { ink: C.paper100, pigments: PIGMENTS, hueArc: 26 });

/* The rune's spines, fitted into a square at (x, y) of side `size` with the given stroke. */
function rune(x, y, size, stroke) {
  const unit = { x: 0, y: 0, size: 1 };
  const arms = frame.glyphs.map((g) => ({ g, pts: mapPoints(g.spine || g.nodes, g, unit) }));
  const all = arms.flatMap((a) => a.pts);
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
  const inner = size - stroke * 2;
  const k = inner / Math.max(maxX - minX, maxY - minY);
  const ox = x + stroke + (inner - (maxX - minX) * k) / 2, oy = y + stroke + (inner - (maxY - minY) * k) / 2;
  const n = (v) => v.toFixed(2);
  return arms.map(({ g, pts }) => {
    const d = pts.map((p, i) => (i ? "L" : "M") + n(ox + (p[0] - minX) * k) + " " + n(oy + (p[1] - minY) * k)).join("");
    return `<path d="${d}" stroke="${P.lineage(g.hue, g.vitality, 0.26, 1.9)}" stroke-width="${n(stroke)}"/>`;
  }).join("\n    ");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const provenance = `<!-- The mark: noetic-function/0.4.0, seed ${T.seed}, state idle, time 96, condensation 1 (the rune), spines only. -->`;

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round">
  ${provenance}
  <title>NoeticEcho</title>
  <rect width="64" height="64" fill="${C.ink000}"/>
  <g>
    ${rune(6, 6, 52, 5)}
  </g>
</svg>
`;
}

/* One social card: 1280 x 640, the ink canvas, a hairline frame, a plate label, a serif title,
   a body in sans, a mono data row, and the mark at the right, apart from the name. */
function card({ label, title, titleSize = 112, lines, data, foot }) {
  const W = 1280, H = 640, M = 64;
  const body = lines.map((l, i) => `<text x="${M}" y="${372 + i * 44}" font-family="IBM Plex Sans" font-size="30" fill="${C.ash300}">${esc(l)}</text>`).join("\n  ");
  const rows = (data || []).map((d, i) => `<text x="${M}" y="${372 + lines.length * 44 + 28 + i * 34}" font-family="JetBrains Mono" font-size="22" letter-spacing="0.9" fill="${C.ash400}">${esc(d)}</text>`).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke-linecap="round" stroke-linejoin="round">
  ${provenance}
  <rect width="${W}" height="${H}" fill="${C.ink000}"/>
  <rect x="24.5" y="24.5" width="${W - 49}" height="${H - 49}" stroke="${C.hairline}" stroke-width="1"/>
  <text x="${M}" y="${M + 44}" font-family="JetBrains Mono" font-size="20" letter-spacing="4.4" fill="${C.ash400}">${esc(label.toUpperCase())}</text>
  <line x1="${M}" y1="${M + 66}" x2="${M + 40}" y2="${M + 66}" stroke="${C.brass500}" stroke-width="2"/>
  <text x="${M - 4}" y="${M + 200}" font-family="Literata" font-size="${titleSize}" letter-spacing="1.5" fill="${C.paper100}">${esc(title)}</text>
  ${body}
  ${rows}
  <line x1="${M}" y1="${H - 104}" x2="${W - M}" y2="${H - 104}" stroke="${C.hairline}" stroke-width="1"/>
  <text x="${M}" y="${H - 64}" font-family="JetBrains Mono" font-size="22" letter-spacing="0.9" fill="${C.ash400}">${esc(foot)}</text>
  <g>
    ${rune(W - M - 280, 104, 280, 6)}
  </g>
</svg>
`;
}

const cards = {
  org: card({
    label: "Open source",
    title: "NoeticEcho",
    lines: ["Open systems for meaning, cognition", "and human–AI collaboration."],
    data: ["control-room · TypedbEx"],
    foot: "open.noeticecho.space",
  }),
  "control-room": card({
    label: "NoeticEcho · open source",
    title: "control-room",
    lines: ["One person, one AI coordinator, many AI coding", "agents, and one desk for the owner's decisions."],
    data: ["protocol · prompts · scripts · Apache-2.0"],
    foot: "open.noeticecho.space/control-room",
  }),
  typedbex: card({
    label: "NoeticEcho · open source",
    title: "TypedbEx",
    lines: ["An Elixir driver for TypeDB 3.x,", "over the HTTP API and gRPC."],
    data: ["typedb · typedb_grpc · Apache-2.0"],
    foot: "github.com/NoeticEcho/TypedbEx",
  }),
};

fs.writeFileSync(path.join(ROOT, "favicon.svg"), favicon());
for (const [name, svg] of Object.entries(cards)) fs.writeFileSync(path.join(HERE, name + ".svg"), svg);

/* fontconfig lists a WOFF2 file, but the text shaper cannot read one, and rsvg-convert then
   falls back to a system face without saying so. So the fonts are decompressed to TrueType in a
   temporary directory first (python3 with fontTools and brotli). */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "noeticecho-fonts-"));
const fontDir = path.join(ROOT, "assets/fonts");
for (const f of fs.readdirSync(fontDir).filter((f) => f.endsWith(".woff2"))) {
  execFileSync("python3", ["-m", "fontTools.ttLib.woff2", "decompress", "-o", path.join(tmp, f.replace(/\.woff2$/, ".ttf")), path.join(fontDir, f)], { stdio: "ignore" });
}
fs.writeFileSync(path.join(tmp, "fonts.conf"), `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>${tmp}</dir><cachedir>${tmp}/cache</cachedir></fontconfig>
`);
const env = Object.assign({}, process.env, { FONTCONFIG_FILE: path.join(tmp, "fonts.conf") });
const rsvg = (args) => execFileSync("rsvg-convert", args, { env, stdio: "inherit" });
for (const name of Object.keys(cards)) rsvg(["-w", "1280", "-h", "640", path.join(HERE, name + ".svg"), "-o", path.join(HERE, name + ".png")]);
rsvg(["-w", "48", "-h", "48", path.join(ROOT, "favicon.svg"), "-o", path.join(ROOT, "favicon.png")]);
rsvg(["-w", "180", "-h", "180", path.join(ROOT, "favicon.svg"), "-o", path.join(ROOT, "apple-touch-icon.png")]);
rsvg(["-w", "512", "-h", "512", path.join(ROOT, "favicon.svg"), "-o", path.join(ROOT, "icon-512.png")]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("wrote favicon.svg, favicon.png, apple-touch-icon.png, icon-512.png and social/{org,control-room,typedbex}.{svg,png}");
