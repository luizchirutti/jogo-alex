"use client";

import { use, useMemo, useState } from "react";

type Result = {
  title: string; rtp: number; rows: number; columns: number; grid: string[][];
  winAmount: number; betAmount: number; multiplier?: number; cascades?: unknown[]; clusters?: unknown[];
};

const games = {
  "jade-cascade": { title: "Jade Cascade", subtitle: "Azulejos orientais • cascatas", endpoint: "jade-cascade", theme: "from-emerald-950 via-teal-900 to-amber-950" },
  "olympus-ascend": { title: "Olympus Ascend", subtitle: "Cluster pays • multiplicadores", endpoint: "olympus-ascend", theme: "from-sky-950 via-indigo-950 to-amber-950" },
} as const;

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
    try {
      const token = window.localStorage.getItem("access_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/spin`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ game: game.endpoint, bet })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível concluir a rodada.");
      setResult(body.outcome);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Erro de conexão."); }
    finally { setLoading(false); }
  }

  return <main className={`min-h-screen bg-gradient-to-br ${game.theme} p-4 text-white sm:p-8`}>
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-black/30 p-5 shadow-2xl backdrop-blur sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">Original proprietary slot</p><h1 className="mt-1 text-3xl font-black">{game.title}</h1><p className="mt-1 text-sm text-white/70">{game.subtitle}</p></div><span className="rounded-full border border-white/20 px-3 py-1 text-xs">RTP 96,5%</span></div>
      <div className="mt-7 grid gap-1 rounded-2xl border border-white/20 bg-black/25 p-2" style={{ gridTemplateColumns: `repeat(${result?.columns || (game.endpoint === "jade-cascade" ? 4 : 6)}, minmax(0, 1fr))` }}>
        {(cells.length ? cells : Array.from({ length: game.endpoint === "jade-cascade" ? 16 : 30 }, () => "✦")).map((symbol, index) => <div key={index} className="flex aspect-square items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner sm:text-4xl">{symbol === "bamboo" ? "🎋" : symbol === "coin" ? "🪙" : symbol === "fan" ? "🪭" : symbol === "jade" ? "🟢" : symbol === "dragon" ? "🐉" : symbol === "laurel" ? "🌿" : symbol === "scroll" ? "📜" : symbol === "shield" ? "🛡️" : symbol === "owl" ? "🦉" : symbol === "lightning" ? "⚡" : symbol}</div>)}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-black/25 p-4"><div><p className="text-xs text-white/60">Último prêmio</p><p className="text-xl font-black text-amber-300">R$ {result?.winAmount?.toFixed(2) || "0,00"}{result?.multiplier && result.multiplier > 1 ? ` · x${result.multiplier}` : ""}</p></div><label className="text-sm">Aposta <input aria-label="Aposta" type="number" min="0.1" step="0.1" value={bet} onChange={(event) => setBet(Number(event.target.value))} className="ml-2 w-20 rounded-lg bg-white/10 p-2 text-center" /></label></div>
      {game.endpoint === "jade-cascade" && result?.cascades && <p className="mt-3 text-center text-sm text-emerald-200">{result.cascades.length} cascata(s) nesta rodada</p>}
      {game.endpoint === "olympus-ascend" && <p className="mt-3 text-center text-sm text-sky-200">Cluster ganha com 8+ símbolos conectados</p>}
      {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}
      <button type="button" disabled={loading} onClick={spin} className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black uppercase tracking-wider text-amber-950 disabled:opacity-60">{loading ? "Girando…" : "Girar"}</button>
    </section>
  </main>;
}
