// Deterministic pseudo-random star field: box-shadow strings for 3 layers.
// Seeded so SSR and client render identical output.

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(seed: number, count: number, width = 2000, height = 2000) {
  const rand = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * width);
    const y = Math.floor(rand() * height);
    parts.push(`${x}px ${y}px #fff`);
  }
  return parts.join(",");
}

export const STARS_1 = buildStars(1, 700);
export const STARS_2 = buildStars(2, 200);
export const STARS_3 = buildStars(3, 100);
