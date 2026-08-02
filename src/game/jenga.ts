// ---------------------------------------------------------------------------
// Jenga game logic: tower structure, pull/place rules, and a physics-inspired
// stability model that drives wobble, the danger meter and collapse detection.
// ---------------------------------------------------------------------------

export const CFG = {
  blockLen: 3, // long side (x or z depending on orientation)
  blockWid: 1, // short side
  blockHt: 0.6, // height of a single block
  initialLevels: 16, // starting number of levels (3 blocks each)
};

export type Orient = "x" | "z";

export interface Block {
  id: string;
  levelIndex: number;
  slot: number; // 0,1,2 within its level
  orient: Orient;
  pos: [number, number, number];
  rotY: number;
  removed: boolean;
  placedTop: boolean;
}

export interface Level {
  orient: Orient;
  blocks: (Block | null)[]; // length 3; null where a block has been pulled
}

export interface Stability {
  /** 0..1 overall instability, drives wobble + danger colour */
  instability: number;
  /** true when the structure cannot physically support itself (guaranteed fall) */
  collapse: boolean;
  /** the level that fails (or the weakest level when no structural failure) */
  failLevel: number;
  /** unit-ish direction the tower leans / tips */
  tipDir: [number, number];
  label: "STABLE" | "FERME" | "BANCAL" | "CRITIQUE";
  weakLevel: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Resting transform of a block from its level/slot/orientation. */
export function blockTransform(
  levelIndex: number,
  slot: number,
  orient: Orient
): { pos: [number, number, number]; rotY: number } {
  const y = (levelIndex + 0.5) * CFG.blockHt;
  if (orient === "x") {
    return { pos: [0, y, slot - 1], rotY: 0 };
  }
  return { pos: [slot - 1, y, 0], rotY: Math.PI / 2 };
}

/** Footprint (support area) of a single block on the ground plane. */
function footprint(slot: number, orient: Orient) {
  if (orient === "x") {
    return { xmin: -1.5, xmax: 1.5, zmin: slot - 1.5, zmax: slot - 0.5 };
  }
  return { xmin: slot - 1.5, xmax: slot - 0.5, zmin: -1.5, zmax: 1.5 };
}

export function createTower(): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < CFG.initialLevels; i++) {
    const orient: Orient = i % 2 === 0 ? "x" : "z";
    const blocks: (Block | null)[] = [];
    for (let s = 0; s < 3; s++) {
      const t = blockTransform(i, s, orient);
      blocks.push({
        id: `L${i}S${s}`,
        levelIndex: i,
        slot: s,
        orient,
        pos: t.pos,
        rotY: t.rotY,
        removed: false,
        placedTop: false,
      });
    }
    levels.push({ orient, blocks });
  }
  return levels;
}

/** Index of the highest level that still has all 3 blocks. */
export function topCompleteIndex(levels: Level[]): number {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i].blocks.every((b) => b)) return i;
  }
  return -1;
}

/**
 * Levels you may pull from: at least two blocks remain and the level sits below
 * the top complete row. Allowing a second pull from a gutted level is what
 * makes leaving a single (outer) block possible: a guaranteed topple.
 */
export function pullableLevelSet(levels: Level[]): Set<number> {
  const tc = topCompleteIndex(levels);
  const set = new Set<number>();
  for (let i = 0; i < levels.length; i++) {
    const present = levels[i].blocks.filter((b) => b).length;
    if (i < tc && present >= 2) set.add(i);
  }
  return set;
}

export function blockById(levels: Level[]): Map<string, Block> {
  const m = new Map<string, Block>();
  for (const lvl of levels) for (const b of lvl.blocks) if (b) m.set(b.id, b);
  return m;
}

export interface PullResult {
  levels: Level[];
  moved: Block | null;
  target: { pos: [number, number, number]; rotY: number };
}

/** Remove a block from its level and stack it on top of the tower. */
export function pullAndPlace(levels: Level[], blockId: string): PullResult {
  const newLevels: Level[] = levels.map((l) => ({
    orient: l.orient,
    blocks: l.blocks.map((b) => (b ? { ...b } : null)),
  }));

  let moved: Block | null = null;
  outer: for (let i = 0; i < newLevels.length; i++) {
    for (let s = 0; s < 3; s++) {
      if (newLevels[i].blocks[s]?.id === blockId) {
        moved = newLevels[i].blocks[s] as Block;
        newLevels[i].blocks[s] = null;
        break outer;
      }
    }
  }
  if (!moved) {
    return {
      levels: newLevels,
      moved: null,
      target: { pos: [0, 0, 0], rotY: 0 },
    };
  }

  const top = newLevels[newLevels.length - 1];
  const topComplete = top.blocks.every((b) => b);
  let targetOrient: Orient;
  let targetSlot: number;
  let targetLevel: number;

  if (topComplete) {
    // start a fresh level, perpendicular to the one below, centred first
    targetOrient = top.orient === "x" ? "z" : "x";
    targetSlot = 1;
    targetLevel = newLevels.length;
    const nl: Level = { orient: targetOrient, blocks: [null, null, null] };
    nl.blocks[targetSlot] = moved;
    newLevels.push(nl);
  } else {
    targetOrient = top.orient;
    targetSlot = [1, 0, 2].find((s) => !top.blocks[s]) ?? 1;
    top.blocks[targetSlot] = moved;
    targetLevel = newLevels.length - 1;
  }

  moved.levelIndex = targetLevel;
  moved.slot = targetSlot;
  moved.orient = targetOrient;
  moved.placedTop = true;
  const t = blockTransform(targetLevel, targetSlot, targetOrient);
  moved.pos = t.pos;
  moved.rotY = t.rotY;

  return { levels: newLevels, moved, target: { pos: t.pos, rotY: t.rotY } };
}

/**
 * Evaluate structural integrity. For every level we look at the centre of mass
 * of everything resting above it versus the support box of the blocks that
 * remain. A narrow or off-centre support raises instability; a centre of mass
 * that escapes the support (or an empty level under load) means certain collapse.
 */
export function evaluateStability(levels: Level[]): Stability {
  const present: { x: number; z: number; level: number }[] = [];
  for (let i = 0; i < levels.length; i++) {
    for (const b of levels[i].blocks) {
      if (b) {
        const t = blockTransform(i, b.slot, levels[i].orient);
        present.push({ x: t.pos[0], z: t.pos[2], level: i });
      }
    }
  }
  if (present.length === 0) {
    return {
      instability: 1,
      collapse: true,
      failLevel: 0,
      tipDir: [0, 0],
      label: "CRITIQUE",
      weakLevel: 0,
    };
  }

  const totalBlocks = present.length;
  let collapse = false;
  let structFailLevel = -1;
  let structTip: [number, number] = [0, 0];
  let maxEff = 0;
  let weakLevel = 0;
  let weakTip: [number, number] = [0, 0];

  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    const above = present.filter((p) => p.level > i);
    if (above.length === 0) continue;

    const here = lvl.blocks.filter((b) => b) as Block[];
    if (here.length === 0) {
      if (!collapse) {
        collapse = true;
        structFailLevel = i;
        structTip = [0, 0];
      }
      continue;
    }

    let xmin = Infinity,
      xmax = -Infinity,
      zmin = Infinity,
      zmax = -Infinity;
    for (const b of here) {
      const fp = footprint(b.slot, lvl.orient);
      xmin = Math.min(xmin, fp.xmin);
      xmax = Math.max(xmax, fp.xmax);
      zmin = Math.min(zmin, fp.zmin);
      zmax = Math.max(zmax, fp.zmax);
    }

    let cx = 0,
      cz = 0;
    for (const p of above) {
      cx += p.x;
      cz += p.z;
    }
    cx /= above.length;
    cz /= above.length;

    const margin = Math.min(cx - xmin, xmax - cx, cz - zmin, zmax - cz);
    const boxcx = (xmin + xmax) / 2;
    const boxcz = (zmin + zmax) / 2;

    if (margin < -0.03 && !collapse) {
      collapse = true;
      structFailLevel = i;
      const dx = cx - boxcx;
      const dz = cz - boxcz;
      const m = Math.hypot(dx, dz) || 1;
      structTip = [dx / m, dz / m];
    }

    const missingPenalty = ((3 - here.length) / 3) * 0.2;
    const marginScore = clamp(margin / 1.5, 0, 1);
    const singlePenalty = here.length === 1 ? 0.22 : 0;
    let inst = clamp(
      (1 - marginScore) * 0.5 + missingPenalty + singlePenalty,
      0,
      1
    );
    const load = above.length / totalBlocks;
    inst = inst * (0.55 + 0.45 * load);

    if (inst > maxEff) {
      maxEff = inst;
      weakLevel = i;
      const dx = cx - boxcx;
      const dz = cz - boxcz;
      const m = Math.hypot(dx, dz);
      weakTip = m > 0.02 ? [dx / m, dz / m] : [0, 0];
    }
  }

  // each pulled block is re-stacked on top, so the tower grows taller and the
  // gutted base weakens; both steadily raise the tension over a game.
  const gutted = levels.reduce(
    (acc, l, i) =>
      i < CFG.initialLevels ? acc + l.blocks.filter((b) => !b).length : acc,
    0
  );
  const globalTension = Math.min(gutted * 0.015, 0.15);
  const heightInstability = Math.min(gutted * 0.02, 0.35);
  const instability = clamp(
    maxEff + globalTension + heightInstability,
    0,
    1
  );

  let label: Stability["label"] = "STABLE";
  if (instability >= 0.78) label = "CRITIQUE";
  else if (instability >= 0.55) label = "BANCAL";
  else if (instability >= 0.3) label = "FERME";

  return {
    instability,
    collapse,
    failLevel: collapse && structFailLevel >= 0 ? structFailLevel : weakLevel,
    tipDir: collapse && structFailLevel >= 0 ? structTip : weakTip,
    label,
    weakLevel,
  };
}
