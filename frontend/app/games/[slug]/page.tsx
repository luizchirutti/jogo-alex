"use client";

import { use, useMemo, useState } from "react";

type Result = {
  title: string; rtp: number; rows: number; columns: number; grid: string[][];
  winAmount: number; betAmount: number; multiplier?: number; cascades?: unknown[]; clusters?: unknown[];
};

const games = {
  "jade-cascade": { title: "Jade Cascade", subtitle: "Azulejos orientais • cascatas", endpoint: "jade-cascade", theme: "from-emerald-950 via-teal-900 to-amber-950" },
  "olympus-ascend": { title: "Olympus Ascend", subtitle: "Cluster pays • multiplicadores", endpoint: "olympus-ascend", theme: "from-sky-950 via-indigo-950 to-amber-950" },
  "crimson-tiger": { title: "Crimson Tiger Festival", subtitle: "Festival escarlate • Fúria Escarlate", endpoint: "crimson-tiger", theme: "from-[#240308] via-[#72152a] to-[#d19a26]" },
  "golden-horn": { title: "Golden Horn Vault", subtitle: "Templo neon • Investida Dourada", endpoint: "golden-horn", theme: "from-[#18090b] via-[#6b1221] to-[#d2a328]" },
  "imperial-mouse": { title: "Imperial Mouse Parade", subtitle: "Cidade lunar • Fila Imperial", endpoint: "imperial-mouse", theme: "from-[#4d2607] via-[#9a1819] to-[#e2bd37]" },
  "neon-hare": { title: "Neon Hare Rush", subtitle: "Distrito lunar • Corrida Lunar", endpoint: "neon-hare", theme: "from-[#130827] via-[#442089] to-[#00a6b2]" },
  "jade-sky-dragon": { title: "Jade Sky Dragon", subtitle: "Montanhas celestes • Orbe Celeste", endpoint: "jade-sky-dragon", theme: "from-[#062c37] via-[#0c665b] to-[#d5a52b]" },
  "jade-crown": { title: "Jade Crown Mahjong", subtitle: "Mesa imperial • Portal de Jade", endpoint: "jade-crown", theme: "from-[#042f2e] via-[#087f5b] to-[#d4a72c]" },
  "ember-dragon-vault": { title: "Ember Dragon Vault", subtitle: "Câmara de gemas • Rainha da Brasa", endpoint: "ember-dragon-vault", theme: "from-[#21080a] via-[#70211d] to-[#e48725]" },
  "qilin-skyfall": { title: "Qilin Skyfall", subtitle: "Céu místico • Raio do Qilin", endpoint: "qilin-skyfall", theme: "from-[#063047] via-[#0d7778] to-[#b9dddb]" },
  "caishen-horizon": { title: "Caishen Horizon", subtitle: "Palácio suspenso • Leque da Fortuna", endpoint: "caishen-horizon", theme: "from-[#3d1005] via-[#9d2610] to-[#f0bb39]" },
  "marigold-outlaws": { title: "Marigold Outlaws", subtitle: "Cantina ao luar • Serenata Selvagem", endpoint: "marigold-outlaws", theme: "from-[#32100d] via-[#8d331d] to-[#f0a630]" },
  "cloverwood-gold": { title: "Cloverwood Gold", subtitle: "Bosque encantado • Trilha do Arco-íris", endpoint: "cloverwood-gold", theme: "from-[#102b1a] via-[#297242] to-[#d9bb30]" },
  "lotus-sanctuary": { title: "Lotus Sanctuary", subtitle: "Santuário de mármore • Halo de Lótus", endpoint: "lotus-sanctuary", theme: "from-[#2e1506] via-[#8c4c12] to-[#f2bc45]" },
  "stormwake-captain": { title: "Stormwake Captain", subtitle: "Mar revolto • Canhão da Maré", endpoint: "stormwake-captain", theme: "from-[#061b31] via-[#174b68] to-[#b58936]" },
  "coral-wave-riders": { title: "Coral Wave Riders", subtitle: "Costa coral • Maré Solar", endpoint: "coral-wave-riders", theme: "from-[#063a4a] via-[#168b9a] to-[#f0b053]" },
  "rune-fjord": { title: "Rune Fjord", subtitle: "Fiorde rúnico • Martelo do Céu", endpoint: "rune-fjord", theme: "from-[#07131f] via-[#204664] to-[#bfd8df]" },
  "gorgon-nightfall": { title: "Gorgon Nightfall", subtitle: "Ruínas de ônix • Olhar de Ônix", endpoint: "gorgon-nightfall", theme: "from-[#160c24] via-[#3a2050] to-[#5d9b68]" },
  "shaolin-strikers": { title: "Shaolin Strikers", subtitle: "Campo do templo • Chute do Dragão", endpoint: "shaolin-strikers", theme: "from-[#26320c] via-[#5c7514] to-[#e0a92d]" },
  "lemur-fruit-caravan": { title: "Lemur Fruit Caravan", subtitle: "Selva ensolarada • Caixas da Selva", endpoint: "lemur-fruit-caravan", theme: "from-[#19380f] via-[#5e8b20] to-[#f2b53f]" },
} as const;

const glyphs: Record<string, string> = { tequila: "🍹", maraca: "🪇", guitar: "🎸", cactus: "🌵", outlaw: "💀", clover: "☘️", horseshoe: "🧲", pipe: "🚬", pot: "🍯", sprite: "🧝", spice: "🫙", flower: "🌸", lamp: "🪔", idol: "🗿", lotus: "🪷", map: "🗺️", rum: "🍾", compass: "🧭", chest: "🧰", captain: "🏴‍☠️", shell: "🐚", coconut: "🥥", starfish: "⭐", board: "🏄", wave: "🌊", axe: "🪓", helmet: "⛑️", horn: "📯", rune: "ᚱ", longship: "⛵", mirror: "🪞", dagger: "🗡️", statue: "🗿", gorgon: "🐍", whistle: "📣", boot: "👟", goal: "🥅", ball: "⚽", monk: "🥋", melon: "🍉", pineapple: "🍍", banana: "🍌", starfruit: "🍈", lemur: "🐒", bamboo: "🎋", circle: "⭕", character: "㊙️", goldtile: "🀄", jadephoenix: "🦚", ruby: "🔴", sapphire: "🔵", egg: "🥚", koi: "🐟", frog: "🐸", boat: "⛵", qilin: "🦄", tree: "🌳", drum: "🥁", envelope: "✉️", fortune: "🧧", coin: "🪙", fan: "🪭", jade: "🟢", dragon: "🐲", laurel: "🌿", scroll: "📜", shield: "🛡️", owl: "🦉", lightning: "⚡", citrus: "🍊", ribbon: "🎀", firework: "🧨", ingot: "🛶", tiger: "🐯", crate: "📦", rocket: "🚀", fengcoin: "🪙", bull: "🐂", peanut: "🥜", bag: "💰", mouse: "🐭", carrot: "🥕", digitalenvelope: "✉️", knot: "🪢", chip: "💳", hare: "🐰", lantern: "🏮" };

const playTone = (win = false) => {
  const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return;
  const context = new Audio(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = win ? "triangle" : "square"; oscillator.frequency.setValueAtTime(win ? 660 : 130, context.currentTime); if (win) oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.05, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (win ? 0.35 : 0.12)); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (win ? 0.35 : 0.12));
};

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const game = games[slug as keyof typeof games] || games["jade-cascade"];
  const [bet, setBet] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cells = useMemo(() => result?.grid.flat() || [], [result]);

  async function spin() {
    setLoading(true); setError("");
    playTone();
    try {
      const token = window.localStorage.getItem("access_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/spin`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ game: game.endpoint, bet })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível concluir a rodada.");
      setResult(body.outcome); if (body.outcome.winAmount > 0) playTone(true);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Erro de conexão."); }
    finally { setLoading(false); }
  }

  return <main className={`min-h-screen bg-gradient-to-br ${game.theme} p-4 text-white sm:p-8`}>
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-black/30 p-5 shadow-2xl backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">Original proprietary slot</p><h1 className="mt-1 text-3xl font-black">{game.title}</h1><p className="mt-1 text-sm text-white/70">{game.subtitle}</p></div><span className="rounded-full border border-white/20 px-3 py-1 text-xs">RTP 96,5%</span></div>
      <div className="mt-7 grid gap-1 rounded-2xl border border-white/20 bg-black/25 p-2" style={{ gridTemplateColumns: `repeat(${result?.columns || (game.endpoint === "jade-cascade" ? 4 : 6)}, minmax(0, 1fr))` }}>
        {(cells.length ? cells : Array.from({ length: game.endpoint === "jade-cascade" ? 16 : game.endpoint === "olympus-ascend" ? 30 : ["qilin-skyfall", "caishen-horizon"].includes(game.endpoint) ? 36 : game.endpoint === "ember-dragon-vault" ? 25 : game.endpoint === "jade-crown" ? 20 : game.endpoint === "golden-horn" || game.endpoint === "neon-hare" ? 12 : 9 }, () => "✦")).map((symbol, index) => <div key={index} className="flex aspect-square items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner sm:text-4xl">{glyphs[symbol] || symbol}</div>)}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-black/25 p-4"><div><p className="text-xs text-white/60">Último prêmio</p><p className="text-xl font-black text-amber-300">R$ {result?.winAmount?.toFixed(2) || "0,00"}{result?.multiplier && result.multiplier > 1 ? ` · x${result.multiplier}` : ""}</p></div><label className="text-sm">Aposta <input aria-label="Aposta" type="number" min="0.1" step="0.1" value={bet} onChange={(event) => setBet(Number(event.target.value))} className="ml-2 w-20 rounded-lg bg-white/10 p-2 text-center" /></label></div>
      {game.endpoint === "jade-cascade" && result?.cascades && <p className="mt-3 text-center text-sm text-emerald-200">{result.cascades.length} cascata(s) nesta rodada</p>}
      {game.endpoint === "olympus-ascend" && <p className="mt-3 text-center text-sm text-sky-200">Cluster ganha com 8+ símbolos conectados</p>}
      {["crimson-tiger", "golden-horn", "imperial-mouse", "neon-hare", "jade-sky-dragon"].includes(game.endpoint) && <p className="mt-3 text-center text-sm text-amber-100">Personagem, partículas e sinais sonoros originais ativam nas vitórias e recursos especiais.</p>}
      {["jade-crown", "ember-dragon-vault", "qilin-skyfall", "caishen-horizon"].includes(game.endpoint) && <p className="mt-3 text-center text-sm text-amber-100">Avalanches destroem grupos vencedores; os multiplicadores crescem a cada cascata.</p>}
      {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
      <button type="button" disabled={loading} onClick={spin} className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black uppercase tracking-wider text-amber-950 disabled:opacity-60">{loading ? "Girando…" : "Girar"}</button>
    </section>
  </main>;
}
