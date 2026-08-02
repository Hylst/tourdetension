import { useState } from "react";
import { cn } from "../utils/cn";
import type { Stability } from "../game/jenga";

export type Screen = "menu" | "playing" | "gameover";
export type Phase = "idle" | "pulling" | "collapsing";

export interface PlayerTheme {
  name: string;
  color: string; // hex string for css
  hex: number; // for three.js
  grad: string;
  text: string;
  ring: string;
  border: string;
}

export const THEMES: PlayerTheme[] = [
  {
    name: "Joueur 1",
    color: "#22d3ee",
    hex: 0x22d3ee,
    grad: "from-cyan-400 to-sky-600",
    text: "text-cyan-300",
    ring: "ring-cyan-400/70",
    border: "border-cyan-400/40",
  },
  {
    name: "Joueur 2",
    color: "#f59e0b",
    hex: 0xf59e0b,
    grad: "from-amber-400 to-orange-600",
    text: "text-amber-300",
    ring: "ring-amber-400/70",
    border: "border-amber-400/40",
  },
];

const DANGER_STYLE: Record<
  Stability["label"],
  { bar: string; text: string; chip: string }
> = {
  STABLE: {
    bar: "from-emerald-400 to-emerald-500",
    text: "text-emerald-300",
    chip: "bg-emerald-500/15 border-emerald-400/40",
  },
  FERME: {
    bar: "from-lime-400 to-yellow-500",
    text: "text-lime-300",
    chip: "bg-lime-500/15 border-lime-400/40",
  },
  BANCAL: {
    bar: "from-yellow-400 to-orange-500",
    text: "text-orange-300",
    chip: "bg-orange-500/15 border-orange-400/40",
  },
  CRITIQUE: {
    bar: "from-orange-500 to-red-600",
    text: "text-red-300",
    chip: "bg-red-500/20 border-red-400/50",
  },
};

interface HUDProps {
  screen: Screen;
  phase: Phase;
  themes: PlayerTheme[];
  names: string[];
  turn: number;
  scores: number[];
  stability: Stability;
  selectedId: string | null;
  result: { loser: number; winner: number; reason: string } | null;
  soundOn: boolean;
  onStart: () => void;
  onRestart: () => void;
  onPull: () => void;
  onCancel: () => void;
  onNameChange: (i: number, name: string) => void;
  onToggleSound: () => void;
}

function PlayerCard({
  theme,
  name,
  score,
  active,
  side,
}: {
  theme: PlayerTheme;
  name: string;
  score: number;
  active: boolean;
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md transition-all duration-300",
        active && cn("ring-2 bg-white/10 scale-[1.03]", theme.ring, theme.border)
      )}
    >
      <div
        className={cn(
          "h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br shadow-lg",
          theme.grad,
          side === "right" && "order-2"
        )}
      />
      <div className={cn(side === "right" && "order-1 text-right")}>
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider text-white/50",
            active && theme.text
          )}
        >
          {name}
        </div>
        <div className="text-lg font-bold leading-none text-white">
          {score}{" "}
          <span className="text-xs font-medium text-white/40">retraits</span>
        </div>
      </div>
      {active && (
        <div
          className={cn(
            "h-2 w-2 animate-ping rounded-full bg-current",
            theme.text,
            side === "right" && "order-3"
          )}
        />
      )}
    </div>
  );
}

function DangerMeter({ stability }: { stability: Stability }) {
  const s = DANGER_STYLE[stability.label];
  const critical = stability.label === "CRITIQUE";
  const pct = Math.round(stability.instability * 100);
  return (
    <div className="w-[min(64vw,420px)]">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
          Tension de la tour
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide",
            s.chip,
            s.text,
            critical && "animate-pulse"
          )}
        >
          {stability.label}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
            s.bar,
            critical && "animate-pulse"
          )}
          style={{ width: `${pct}%` }}
        />
        {[30, 55, 78].map((t) => (
          <div
            key={t}
            className="absolute top-0 h-full w-px bg-black/40"
            style={{ left: `${t}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function HUD(props: HUDProps) {
  const [showInfo, setShowInfo] = useState(false);
  const {
    screen,
    phase,
    themes,
    names,
    turn,
    scores,
    stability,
    selectedId,
    result,
    soundOn,
    onStart,
    onRestart,
    onPull,
    onCancel,
    onNameChange,
    onToggleSound,
  } = props;

  const vignette = Math.max(0, (stability.instability - 0.58) / 0.42);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* vignette de danger */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: vignette * 0.6,
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(220,20,20,0.55) 100%)",
        }}
      />

      {/* bouton son */}
      <button
        onClick={onToggleSound}
        className="pointer-events-auto absolute right-4 top-4 z-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 backdrop-blur-md transition hover:bg-white/10"
        title="Activer / désactiver le son"
      >
        {soundOn ? "🔊" : "🔇"}
      </button>

      {/* barre du haut */}
      {screen === "playing" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <PlayerCard
            theme={themes[0]}
            name={names[0]}
            score={scores[0]}
            active={turn === 0 && phase !== "collapsing"}
            side="left"
          />
          <div className="flex flex-1 justify-center pt-1">
            <DangerMeter stability={stability} />
          </div>
          <PlayerCard
            theme={themes[1]}
            name={names[1]}
            score={scores[1]}
            active={turn === 1 && phase !== "collapsing"}
            side="right"
          />
        </div>
      )}

      {/* barre d'action du bas */}
      {screen === "playing" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-5">
          {phase === "collapsing" ? (
            <div className="animate-pulse rounded-2xl border border-red-500/40 bg-red-950/60 px-6 py-3 text-center text-xl font-black uppercase tracking-widest text-red-300 backdrop-blur-md">
              💥 La tour s'écroule !
            </div>
          ) : phase === "pulling" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 backdrop-blur-md">
              Placement du bloc en haut…
            </div>
          ) : selectedId ? (
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
              <span className="text-sm text-white/70">
                Retirer ce bloc ?
              </span>
              <button
                onClick={onPull}
                className={cn(
                  "rounded-xl bg-gradient-to-br px-5 py-2 text-sm font-bold text-white shadow-lg transition active:scale-95",
                  themes[turn].grad
                )}
              >
                Retirer ⟶
              </button>
              <button
                onClick={onCancel}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-center text-sm text-white/60 backdrop-blur-md">
              Tour de{" "}
              <span className={cn("font-semibold", themes[turn].text)}>
                {names[turn]}
              </span>{" "}
              : touchez un bloc lumineux pour le sélectionner
            </div>
          )}
        </div>
      )}

      {/* MENU */}
      {screen === "menu" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-8 text-center shadow-2xl">
            <div className="mb-1 text-6xl">🧱</div>
            <h1 className="bg-gradient-to-br from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-5xl font-black tracking-tight text-transparent">
              TOUR DE TENSION
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Retirez un bloc. Empilez-le tout en haut. Ne soyez pas celui qui
              fait tomber la tour.
            </p>

            <div className="mt-6 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br",
                      themes[i].grad
                    )}
                  />
                  <input
                    value={names[i]}
                    onChange={(e) => onNameChange(i, e.target.value)}
                    maxLength={14}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white outline-none transition focus:border-white/30 focus:bg-white/10"
                    placeholder={`Joueur ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            <ul className="mx-auto mt-5 max-w-xs space-y-1 text-left text-xs text-white/45">
              <li>• Glissez pour orbiter · défilez pour zoomer</li>
              <li>• Impossible de retirer de la rangée du haut</li>
              <li>• Plus la tour est haute et vide, plus c'est risqué</li>
            </ul>

            <button
              onClick={onStart}
              className="mt-6 w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 px-6 py-3.5 text-lg font-bold text-white shadow-xl shadow-orange-900/40 transition hover:brightness-110 active:scale-[0.98]"
            >
              Commencer la partie
            </button>
            <button
              onClick={() => setShowInfo(true)}
              className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90"
            >
              ℹ️ Comment ce jeu a été fait
            </button>

            <p className="mt-4 text-[10px] tracking-wider text-white/20">
              Créé par Hylst / Geoffroy Streit
            </p>
          </div>
        </div>
      )}

      {/* FIN DE PARTIE */}
      {screen === "gameover" && result && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-8 text-center shadow-2xl">
            <div className="text-5xl">💥</div>
            <h2 className="mt-2 bg-gradient-to-br from-red-300 to-red-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              TOUR ÉFFONDRÉE
            </h2>
            <p className="mt-3 text-white/60">
              <span className={cn("font-bold", themes[result.loser].text)}>
                {names[result.loser]}
              </span>{" "}
              a retiré le bloc qui l'a fait tomber.
            </p>
            <p className="mt-1 text-xs text-white/35">
              {result.reason === "structural"
                ? "Le poids n'avait plus rien en dessous."
                : "La tension accumulée a eu raison de la tour."}
            </p>
            <div
              className={cn(
                "mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border bg-white/5 px-5 py-3",
                themes[result.winner].border
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg bg-gradient-to-br",
                  themes[result.winner].grad
                )}
              />
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wider text-white/40">
                  Vainqueur
                </div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    themes[result.winner].text
                  )}
                >
                  {names[result.winner]}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center gap-6 text-sm text-white/50">
              <div>
                <div className={themes[0].text + " text-lg font-bold"}>
                  {scores[0]}
                </div>
                <div>{names[0]}</div>
              </div>
              <div>
                <div className={themes[1].text + " text-lg font-bold"}>
                  {scores[1]}
                </div>
                <div>{names[1]}</div>
              </div>
            </div>

            <button
              onClick={onRestart}
              className="mt-6 w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 px-6 py-3.5 text-lg font-bold text-white shadow-xl transition hover:brightness-110 active:scale-[0.98]"
            >
              Rejouer
            </button>

            <p className="mt-4 text-[10px] tracking-wider text-white/20">
              Créé par Hylst / Geoffroy Streit
            </p>
          </div>
        </div>
      )}

      {showInfo && (
        <div
          className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/95 to-zinc-950/98 p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="bg-gradient-to-br from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-2xl font-black text-transparent">
              Comment ce jeu a été fait
            </h3>
            <div className="mt-4 space-y-3.5 text-sm leading-relaxed text-white/75">
              <p><strong className="text-white">Stack :</strong> React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7, compilé en un seul fichier HTML. Rendu 3D avec Three.js via React Three Fiber et Drei.</p>
              <p><strong className="text-white">Graphismes :</strong> vraie scène 3D en WebGL, chaque bloc de la tour est un objet 3D individuel avec sa propre texture de bois.</p>
              <p><strong className="text-white">Musique &amp; sons :</strong> entièrement synthétisés en direct avec l'API Web Audio, aucun fichier audio chargé.</p>
              <p><strong className="text-white">Interactions :</strong> glisser pour orbiter la caméra, défiler pour zoomer, cliquer sur un bloc éclairé pour le sélectionner puis le retirer.</p>
              <p><strong className="text-white">Architecture :</strong> logique de jeu pure (<code>jenga.ts</code>) séparée de la scène 3D, un modèle de stabilité calcule à chaque coup l'instabilité globale de la tour.</p>
              <p><strong className="text-white">Algorithmes notables :</strong> l'instabilité dépend de la largeur et du centrage du support de chaque niveau (un support étroit ou décentré déstabilise plus), combinée à une tension qui monte progressivement à mesure que la base se vide et que la tour s'élève. Le niveau de danger passe de Stable à Ferme, Bancal puis Critique selon ce score.</p>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="mt-6 w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-xl transition hover:brightness-110 active:scale-[0.98]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
