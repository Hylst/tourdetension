import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./components/Scene";
import Tower from "./components/Tower";
import HUD, { THEMES, type Phase, type Screen } from "./components/HUD";
import { sound } from "./game/sound";
import {
  createTower,
  evaluateStability,
  pullAndPlace,
  pullableLevelSet,
  type Level,
  type Stability,
} from "./game/jenga";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

interface GameResult {
  loser: number;
  winner: number;
  reason: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [phase, setPhase] = useState<Phase>("idle");
  const [gameId, setGameId] = useState(0);
  const [levels, setLevels] = useState<Level[]>(() => createTower());
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [names, setNames] = useState<[string, string]>(["Joueur 1", "Joueur 2"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pullCmd, setPullCmd] = useState<{
    blockId: string;
    target: { pos: [number, number, number]; rotY: number };
    nonce: number;
  } | null>(null);
  const [collapseCmd, setCollapseCmd] = useState<{
    failLevel: number;
    tipDir: [number, number];
    nonce: number;
  } | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [shake, setShake] = useState(false);

  const pendingRef = useRef<{ newLevels: Level[]; movedId: string } | null>(
    null
  );
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const stability: Stability = useMemo(
    () => evaluateStability(levels),
    [levels]
  );
  const pullableSet = useMemo(() => pullableLevelSet(levels), [levels]);
  const pullableIds = useMemo(() => {
    const s = new Set<string>();
    levels.forEach((lvl, li) => {
      if (pullableSet.has(li))
        lvl.blocks.forEach((b) => {
          if (b) s.add(b.id);
        });
    });
    return s;
  }, [levels, pullableSet]);

  const instabilityRef = useRef(stability.instability);
  instabilityRef.current = stability.instability;

  // ambient tension sounds while idle and wobbly
  useEffect(() => {
    if (screen !== "playing") return;
    const id = window.setInterval(() => {
      const inst = instabilityRef.current;
      if (phaseRef.current !== "idle") return;
      if (inst > 0.78) sound.heartbeat();
      else if (inst > 0.5) sound.creak(inst);
    }, 1500);
    return () => window.clearInterval(id);
  }, [screen]);

  const resetGame = useCallback(() => {
    setLevels(createTower());
    setTurn(0);
    setScores([0, 0]);
    setSelectedId(null);
    setPullCmd(null);
    setCollapseCmd(null);
    setResult(null);
    setPhase("idle");
    setGameId((g) => g + 1);
  }, []);

  const handleStart = useCallback(() => {
    sound.init();
    sound.setEnabled(soundOn);
    resetGame();
    setScreen("playing");
  }, [resetGame, soundOn]);

  const handleSelect = useCallback(
    (id: string | null) => {
      if (phaseRef.current !== "idle" || !id) {
        setSelectedId(null);
        return;
      }
      if (pullableIds.has(id)) setSelectedId(id);
    },
    [pullableIds]
  );

  const handlePull = useCallback(() => {
    if (!selectedId || phaseRef.current !== "idle") return;
    const res = pullAndPlace(levels, selectedId);
    if (!res.moved) return;
    pendingRef.current = { newLevels: res.levels, movedId: res.moved.id };
    setSelectedId(null);
    setPhase("pulling");
    setPullCmd({
      blockId: selectedId,
      target: res.target,
      nonce: Date.now(),
    });
  }, [levels, selectedId]);

  const triggerCollapse = useCallback(
    (stab: Stability) => {
      const failLevel = stab.collapse ? stab.failLevel : stab.weakLevel;
      const loser = turnRef.current;
      setPhase("collapsing");
      setCollapseCmd({
        failLevel,
        tipDir: stab.tipDir,
        nonce: Date.now(),
      });
      setResult({
        loser,
        winner: 1 - loser,
        reason: stab.collapse ? "structural" : "tension",
      });
      setShake(true);
      window.setTimeout(() => setShake(false), 750);
    },
    []
  );

  const handlePullDone = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const newLevels = pending.newLevels;
    const stab = evaluateStability(newLevels);
    setLevels(newLevels);
    setPullCmd(null);

    let collapse = stab.collapse;
    if (!collapse && stab.instability > 0.6) {
      let chance = clamp((stab.instability - 0.6) / 0.4, 0, 1) * 0.5;
      if (stab.instability > 0.9) chance += 0.15;
      collapse = Math.random() < chance;
    }
    if (collapse) {
      triggerCollapse(stab);
    } else {
      setScores((prev) => {
        const n: [number, number] = [prev[0], prev[1]];
        n[turnRef.current] += 1;
        return n;
      });
      setTurn((t) => 1 - t);
      setPhase("idle");
    }
  }, [triggerCollapse]);

  const handleCollapseDone = useCallback(() => {
    setCollapseCmd(null);
    setScreen("gameover");
  }, []);

  const handleRestart = useCallback(() => {
    resetGame();
    setScreen("playing");
  }, [resetGame]);

  const handleToggleSound = useCallback(() => {
    setSoundOn((s) => {
      const next = !s;
      sound.setEnabled(next);
      return next;
    });
  }, []);

  const interactive = screen === "playing" && phase === "idle";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0d14]">
      <div className={shake ? "shake h-full w-full" : "h-full w-full"}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true }}
          camera={{ position: [12.5, 9.5, 15], fov: 40, near: 0.1, far: 120 }}
          onPointerMissed={() =>
            interactive && selectedId && setSelectedId(null)
          }
        >
          <Scene danger={stability.instability}>
            <Tower
              key={gameId}
              levels={levels}
              instability={stability.instability}
              tipDir={stability.tipDir}
              selectedId={selectedId}
              pullableIds={pullableIds}
              interactive={interactive}
              accent={THEMES[turn].hex}
              pullCmd={pullCmd}
              collapseCmd={collapseCmd}
              onPullDone={handlePullDone}
              onCollapseDone={handleCollapseDone}
              onSelect={handleSelect}
            />
          </Scene>
        </Canvas>
      </div>

      <HUD
        screen={screen}
        phase={phase}
        themes={THEMES}
        names={names}
        turn={turn}
        scores={scores}
        stability={stability}
        selectedId={selectedId}
        result={result}
        soundOn={soundOn}
        onStart={handleStart}
        onRestart={handleRestart}
        onPull={handlePull}
        onCancel={() => setSelectedId(null)}
        onNameChange={(i, name) =>
          setNames((n) => {
            const c: [string, string] = [n[0], n[1]];
            c[i] = name;
            return c;
          })
        }
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
