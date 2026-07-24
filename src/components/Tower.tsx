import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CFG,
  blockById,
  type Level,
  type Orient,
} from "../game/jenga";
import { makeWoodTexture, tintForId } from "../game/wood";
import { sound } from "../game/sound";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const shortestAngle = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

interface PullCmd {
  blockId: string;
  target: { pos: [number, number, number]; rotY: number };
  nonce: number;
}
interface CollapseCmd {
  failLevel: number;
  tipDir: [number, number];
  nonce: number;
}

interface TowerProps {
  levels: Level[];
  instability: number;
  tipDir: [number, number];
  selectedId: string | null;
  pullableIds: Set<string>;
  interactive: boolean;
  accent: number;
  pullCmd: PullCmd | null;
  collapseCmd: CollapseCmd | null;
  onPullDone: () => void;
  onCollapseDone: () => void;
  onSelect: (id: string | null) => void;
}

type AnimState = {
  mode: "idle" | "pull" | "collapse";
  t: number;
  done: boolean;
  blockId?: string;
  fromPos?: [number, number, number];
  fromRotY?: number;
  fromOrient?: Orient;
  toPos?: [number, number, number];
  toRotY?: number;
  failLevel?: number;
  tip?: [number, number];
};

type Phys = {
  pos: [number, number, number];
  vel: [number, number, number];
  rot: [number, number, number];
  angVel: [number, number, number];
};

type BlockView = {
  id: string;
  pos: [number, number, number];
  rotY: number;
  orient: Orient;
  levelIndex: number;
};

export default function Tower({
  levels,
  instability,
  tipDir,
  selectedId,
  pullableIds,
  interactive,
  accent,
  pullCmd,
  collapseCmd,
  onPullDone,
  onCollapseDone,
  onSelect,
}: TowerProps) {
  const refs = useRef<Record<string, THREE.Group | null>>({});
  const anim = useRef<AnimState>({ mode: "idle", t: 0, done: false });
  const phys = useRef<Map<string, Phys>>(new Map());
  const wobble = useRef({ impulse: 0 });
  const lastNonce = useRef<{ pull?: number; collapse?: number }>({});
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const root = useRef<THREE.Group>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const tex = useMemo(() => makeWoodTexture(), []);
  const blockMap = useMemo(() => blockById(levels), [levels]);
  const blocks = useMemo<BlockView[]>(
    () =>
      levels.flatMap((lvl) =>
        lvl.blocks
          .filter((b): b is NonNullable<typeof b> => !!b)
          .map((b) => ({
            id: b.id,
            pos: b.pos,
            rotY: b.rotY,
            orient: b.orient,
            levelIndex: b.levelIndex,
          }))
      ),
    [levels]
  );
  const idsKey = useMemo(() => blocks.map((b) => b.id).join(","), [blocks]);
  const materials = useMemo(() => {
    const m: Record<string, THREE.MeshStandardMaterial> = {};
    for (const b of blocks) {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: tintForId(b.id),
        roughness: 0.6,
        metalness: 0.05,
      });
      mat.emissive = new THREE.Color(0x000000);
      m[b.id] = mat;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, tex]);
  const geo = useMemo(
    () => new THREE.BoxGeometry(CFG.blockLen, CFG.blockHt, CFG.blockWid),
    []
  );

  // dispose GPU resources when the tower is remounted (new game)
  useEffect(() => {
    return () => {
      geo.dispose();
      tex.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [geo, tex, materials]);

  const startCollapse = (failLevel: number, tip: [number, number]) => {
    anim.current = { mode: "collapse", t: 0, done: false, failLevel, tip };
    phys.current.clear();
    for (const b of blockMap.values()) {
      if (b.levelIndex < failLevel) continue; // base stays standing
      const rad = Math.hypot(b.pos[0], b.pos[2]);
      const outx = rad > 0.01 ? b.pos[0] / rad : tip[0];
      const outz = rad > 0.01 ? b.pos[2] / rad : tip[1];
      const h = b.pos[1];
      const power = 1.0 + h * 0.16;
      phys.current.set(b.id, {
        pos: [b.pos[0], b.pos[1], b.pos[2]],
        vel: [
          (tip[0] * power + outx * 0.9) * (0.8 + Math.random() * 0.7) +
            (Math.random() - 0.5) * 1.3,
          0.5 + Math.random() * 1.8 + h * 0.05,
          (tip[1] * power + outz * 0.9) * (0.8 + Math.random() * 0.7) +
            (Math.random() - 0.5) * 1.3,
        ],
        rot: [0, b.rotY, 0],
        angVel: [
          (Math.random() - 0.5) * 7,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 7,
        ],
      });
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const time = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    const pulseSlow = 0.5 + 0.5 * Math.sin(time * 1.8);

    // ---- detect new commands ----
    if (pullCmd && pullCmd.nonce !== lastNonce.current.pull) {
      lastNonce.current.pull = pullCmd.nonce;
      const b = blockMap.get(pullCmd.blockId);
      if (b) {
        anim.current = {
          mode: "pull",
          t: 0,
          done: false,
          blockId: pullCmd.blockId,
          fromPos: [b.pos[0], b.pos[1], b.pos[2]],
          fromRotY: b.rotY,
          fromOrient: b.orient,
          toPos: pullCmd.target.pos,
          toRotY: pullCmd.target.rotY,
        };
        wobble.current.impulse = Math.max(wobble.current.impulse, 0.5);
        sound.scrape();
      }
    }
    if (collapseCmd && collapseCmd.nonce !== lastNonce.current.collapse) {
      lastNonce.current.collapse = collapseCmd.nonce;
      startCollapse(collapseCmd.failLevel, collapseCmd.tipDir);
      sound.crash();
    }

    wobble.current.impulse = Math.max(0, wobble.current.impulse - dt * 0.9);

    const imp = wobble.current.impulse;
    const towerH = Math.max(CFG.blockHt, levels.length * CFG.blockHt);

    // root shake during early collapse
    if (root.current && anim.current.mode === "collapse" && anim.current.t < 0.5) {
      const s = (0.5 - anim.current.t) * 0.5;
      root.current.position.set(
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s * 0.6,
        (Math.random() - 0.5) * s
      );
    } else if (root.current) {
      root.current.position.set(0, 0, 0);
    }

    for (const b of blocks) {
      const g = refs.current[b.id];
      if (!g) continue;

      // ---- highlight ----
      const m = materials[b.id];
      if (m) {
        if (selectedId === b.id) {
          m.emissive.setHex(accent);
          m.emissiveIntensity = 0.5 + 0.45 * pulse;
        } else if (hoverId === b.id) {
          const ok = pullableIds.has(b.id);
          m.emissive.setHex(ok ? accent : 0xff4d4d);
          m.emissiveIntensity = ok ? 0.32 : 0.14;
        } else {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = pullableIds.has(b.id)
            ? 0.03 + 0.05 * pulseSlow
            : 0;
        }
      }

      // ---- collapse physics ----
      if (anim.current.mode === "collapse") {
        const ph = phys.current.get(b.id);
        if (ph) {
          ph.vel[1] -= 15 * dt;
          ph.pos[0] += ph.vel[0] * dt;
          ph.pos[1] += ph.vel[1] * dt;
          ph.pos[2] += ph.vel[2] * dt;
          ph.rot[0] += ph.angVel[0] * dt;
          ph.rot[1] += ph.angVel[1] * dt;
          ph.rot[2] += ph.angVel[2] * dt;
          if (ph.pos[1] < 0.32) {
            ph.pos[1] = 0.32;
            if (ph.vel[1] < 0) ph.vel[1] = -ph.vel[1] * 0.3;
            ph.vel[0] *= 0.6;
            ph.vel[2] *= 0.6;
            ph.angVel[0] *= 0.5;
            ph.angVel[2] *= 0.5;
            if (
              Math.abs(ph.vel[1]) < 0.6 &&
              Math.hypot(ph.vel[0], ph.vel[2]) < 0.4
            ) {
              ph.vel = [0, 0, 0];
              ph.angVel = [0, 0, 0];
            }
          }
          g.position.set(ph.pos[0], ph.pos[1], ph.pos[2]);
          g.rotation.set(ph.rot[0], ph.rot[1], ph.rot[2]);
        } else {
          g.position.set(b.pos[0], b.pos[1], b.pos[2]);
          g.rotation.set(0, b.rotY, 0);
        }
        continue;
      }

      // ---- pull animation ----
      if (anim.current.mode === "pull" && anim.current.blockId === b.id) {
        anim.current.t += dt;
        const dur = 1.15;
        const p = Math.min(1, anim.current.t / dur);
        const from = anim.current.fromPos!;
        const orient = anim.current.fromOrient!;
        const axisIdx = orient === "x" ? 0 : 2;
        const slideOut = 2.6;
        let pos: [number, number, number];
        if (p < 0.42) {
          const k = p / 0.42;
          const e = 1 - Math.pow(1 - k, 3);
          pos = [from[0], from[1], from[2]];
          pos[axisIdx] = from[axisIdx] + slideOut * e;
        } else {
          const k = (p - 0.42) / 0.58;
          const e = easeInOut(k);
          const start: [number, number, number] = [
            from[0],
            from[1],
            from[2],
          ];
          start[axisIdx] = from[axisIdx] + slideOut;
          const to = anim.current.toPos!;
          const rise = to[1] - start[1];
          const arc = Math.sin(k * Math.PI) * Math.max(2.5, rise * 0.5 + 2);
          pos = [
            start[0] + (to[0] - start[0]) * e,
            start[1] + (to[1] - start[1]) * e + arc,
            start[2] + (to[2] - start[2]) * e,
          ];
        }
        const rot =
          anim.current.fromRotY! +
          shortestAngle(anim.current.fromRotY!, anim.current.toRotY!) *
            easeInOut(p);
        g.position.set(pos[0], pos[1], pos[2]);
        g.rotation.set(0, rot, 0);
        if (p >= 1 && !anim.current.done) {
          anim.current.done = true;
          sound.thud(150);
          anim.current = { mode: "idle", t: 0, done: false };
          onPullDone();
        }
        continue;
      }

      // ---- standing sway (cantilever: higher blocks sway more) ----
      const k = clamp(b.pos[1] / towerH, 0, 1);
      const amp = instability * 0.5 + imp * 0.5 + 0.02;
      const swayMag = amp * 0.34 * (0.08 + k * k * 0.92) + imp * 0.4 * k;
      const lean = instability * instability * 1.4 * k * k;
      const tremor =
        instability > 0.72
          ? (Math.random() - 0.5) * 0.014 * (instability - 0.7) * 3
          : 0;
      const ox =
        (Math.sin(time * 1.7) * 0.6 + Math.sin(time * 2.7 + 1.1) * 0.4) *
          swayMag +
        tipDir[0] * lean +
        tremor;
      const oz =
        (Math.sin(time * 1.3 + 0.7) * 0.6 + Math.sin(time * 2.2 + 2.0) * 0.4) *
          swayMag +
        tipDir[1] * lean +
        tremor;
      g.position.set(b.pos[0] + ox, b.pos[1], b.pos[2] + oz);
      const tilt = (amp * 0.05 + imp * 0.05) * k;
      g.rotation.set(
        Math.sin(time * 1.7 + 0.5) * tilt + tipDir[1] * lean * 0.5,
        b.rotY,
        Math.sin(time * 1.3) * tilt + tipDir[0] * lean * 0.5
      );
    }

    if (anim.current.mode === "collapse") {
      anim.current.t += dt;
      if (anim.current.t > 2.6 && !anim.current.done) {
        anim.current.done = true;
        onCollapseDone();
      }
    }
  });

  return (
    <group ref={root}>
      {blocks.map((b) => (
        <group
          key={b.id}
          ref={(el) => {
            refs.current[b.id] = el;
          }}
          position={b.pos}
          rotation={[0, b.rotY, 0]}
        >
          <mesh
            geometry={geo}
            material={materials[b.id]}
            castShadow
            receiveShadow
            onPointerDown={(e) => {
              if (!interactive) return;
              downPos.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              if (!interactive) return;
              const dp = downPos.current;
              downPos.current = null;
              if (!dp) return;
              const dist = Math.hypot(e.clientX - dp.x, e.clientY - dp.y);
              if (dist < 6) {
                sound.click();
                onSelect(b.id);
              }
            }}
            onPointerOver={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              setHoverId(b.id);
            }}
            onPointerOut={() => setHoverId((h) => (h === b.id ? null : h))}
          />
        </group>
      ))}
    </group>
  );
}
