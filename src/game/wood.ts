import * as THREE from "three";

/**
 * Generate a seamless-ish wood-grain texture on a canvas so the build needs no
 * external image assets. Each block tints the shared texture for variation.
 */
export function makeWoodTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  // base wood tone
  ctx.fillStyle = "#c08a54";
  ctx.fillRect(0, 0, size, size);

  // long vertical grain streaks
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * size;
    const w = 0.5 + Math.random() * 2.2;
    const dark = Math.random() > 0.5;
    const shade = dark
      ? 80 + Math.random() * 40
      : 200 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${shade},${Math.floor(shade * 0.72)},${
      Math.floor(shade * 0.45)
    },${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    const wobble = Math.random() * 8 - 4;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + wobble,
      size * 0.33,
      x - wobble,
      size * 0.66,
      x + (Math.random() * 6 - 3),
      size
    );
    ctx.stroke();
  }

  // a few darker grain bands
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size;
    ctx.strokeStyle = `rgba(70,45,20,${0.05 + Math.random() * 0.07})`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() * 14 - 7), size);
    ctx.stroke();
  }

  // subtle knots
  for (let i = 0; i < 3; i++) {
    const kx = Math.random() * size;
    const ky = Math.random() * size;
    const r = 4 + Math.random() * 7;
    const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, r);
    grad.addColorStop(0, "rgba(60,38,18,0.5)");
    grad.addColorStop(1, "rgba(60,38,18,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(kx, ky, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const WOOD_TINTS = [
  "#d39a5e",
  "#c98a4c",
  "#cda066",
  "#bb7e44",
  "#d6a86e",
  "#c4945a",
  "#cf9d57",
];

/** Stable per-block tint so the same block keeps its shade between pulls. */
export function tintForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return WOOD_TINTS[h % WOOD_TINTS.length];
}
