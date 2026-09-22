"use client";

import { useMemo, useState } from "react";

type Category = "Todos" | "Slots" | "Ao Vivo" | "Novo" | "Popular";

type Game = {
  id: number;
  nome: string;
  imagem?: string;
  tag?: string;
  url: string;
  categoria: Exclude<Category, "Todos">;
};

const categorias: Category[] = ["Todos", "Slots", "Ao Vivo", "Novo", "Popular"];

const jogosExemplo: Game[] = [
  {
    id: 1,
    nome: "Fortune Tiger",
    imagem: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    tag: "HOT",
    url: "https://example.com/fortune-tiger",
    categoria: "Slots",
  },
  {
    id: 2,
    nome: "Jade Cascade",
    imagem: "",
    tag: "NOVO",
    url: "/games/jade-cascade",
    categoria: "Slots",
  },
  {
    id: 3,
    nome: "Lucky Spin",
    imagem: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=900&q=80",
    tag: "HOT",
    url: "https://example.com/lucky-spin",
    categoria: "Popular",
  },
  {
    id: 4,
    nome: "Olympus Ascend",
    imagem: "",
    tag: "NOVO",
    url: "/games/olympus-ascend",
    categoria: "Slots",
  },
  {
    id: 5,
    nome: "Wild Cash",
    imagem: "https://images.unsplash.com/photo-1538485399081-6451ff4f3c14?auto=format&fit=crop&w=900&q=80",
    tag: "NOVO",
    url: "https://example.com/wild-cash",
    categoria: "Popular",
  },
  {
    id: 6,
    nome: "Royal Vegas",
    imagem: "https://images.unsplash.com/photo-1601533807807-4f93d0e3d04b?auto=format&fit=crop&w=900&q=80",
    url: "https://example.com/royal-vegas",
    categoria: "Ao Vivo",
  },
];

export function GameGrid({ games = jogosExemplo }: { games?: Game[] }) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<Category>("Todos");
  const [jogoSelecionado, setJogoSelecionado] = useState<Game | null>(null);

  const jogosFiltrados = useMemo(() => {
    if (categoriaAtiva === "Todos") return games;
    return games.filter((jogo) => jogo.categoria === categoriaAtiva);
  }, [games, categoriaAtiva]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-2xl font-black text-white">Jogos Populares</h3>
        <button className="text-sm font-semibold text-[#00ff88] hover:text-[#ffd700]">Ver todos</button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            type="button"
            onClick={() => setCategoriaAtiva(categoria)}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              categoriaAtiva === categoria
                ? "border-[#00ff88] bg-[#00ff88] text-[#07140d] shadow-[0_0_18px_rgba(0,255,136,0.28)]"
                : "border-white/10 bg-white/5 text-[#a8b7b4] hover:border-[#ffd700]/40 hover:text-[#ffd700]"
            }`}
          >
            {categoria}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {jogosFiltrados.map((jogo) => (
          <button
            key={jogo.id}
            type="button"
            onClick={() => setJogoSelecionado(jogo)}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-[#111b24] text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-transform duration-200 hover:-translate-y-1 hover:border-[#00ff88]/40"
          >
            <div className="relative">
              {jogo.tag && (
                <span
                  className={`absolute left-2.5 top-2.5 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                    jogo.tag === "HOT" ? "bg-[#ffd700] text-[#211b06]" : "bg-[#00ff88] text-[#07140d]"
                  }`}
                >
                  {jogo.tag}
                </span>
              )}

              {jogo.imagem ? (
                <img
                  src={jogo.imagem}
                  alt={jogo.nome}
                  loading="lazy"
                  className="h-30 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-36 lg:h-40"
                />
              ) : (
                <div className={`flex h-30 items-center justify-center overflow-hidden text-5xl transition-transform duration-300 group-hover:scale-105 sm:h-36 lg:h-40 ${jogo.id === 2 ? "bg-[radial-gradient(circle_at_30%_25%,#f6d67a_0_6%,transparent_7%),linear-gradient(135deg,#064e3b,#0f766e_55%,#ca8a04)]" : "bg-[radial-gradient(circle_at_70%_20%,#fff5c4_0_5%,transparent_6%),linear-gradient(135deg,#172554,#4338ca_55%,#c0841a)]"}`} aria-label={`Arte original de ${jogo.nome}`}>
                  {jogo.id === 2 ? "🀄" : "⚡"}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
              <div>
                <h4 className="text-xs font-bold text-white sm:text-sm">{jogo.nome}</h4>
                <p className="text-[10px] text-[#8ea1a0]">{jogo.categoria}</p>
              </div>
              <span className="rounded-full border border-[#00ff88]/40 bg-[#00ff88]/10 px-2 py-1 text-[10px] font-bold text-[#00ff88]">
                Jogar
              </span>
            </div>
          </button>
        ))}
      </div>

      {jogoSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative h-[80vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.75)]">
            <button
              type="button"
              onClick={() => setJogoSelecionado(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#101923] text-xl text-white hover:border-[#00ff88]/40 hover:text-[#00ff88]"
              aria-label="Fechar jogo"
            >
              ×
            </button>

            <iframe
              title={jogoSelecionado.nome}
              src={jogoSelecionado.url}
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </section>
  );
}
