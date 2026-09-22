import { GameGrid } from "@/components/GameGrid";

const appLinks = [
  { name: "Termos", href: "#" },
  { name: "Privacidade", href: "#" },
  { name: "Jogo Responsável", href: "#" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#eafaf5]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d1117]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00ff88]/50 bg-[#00ff88]/10 shadow-[0_0_20px_rgba(0,255,136,0.35)]">
              <span className="text-lg font-black text-[#00ff88]">C</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#8ca3a0]">Casino</p>
              <h1 className="text-xl font-black text-white">RoyalWin</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-full border border-[#ffd700]/50 bg-[#ffd700]/10 px-2 py-1.5 text-xs shadow-[0_0_18px_rgba(255,215,0,0.2)] sm:px-3">
              <span className="text-[#9ca8a3]">Saldo</span>
              <span className="ml-2 font-bold text-[#ffd700]">R$ 12.480</span>
            </div>
            <button className="rounded-full bg-[#00ff88] px-3 py-2 text-xs font-bold text-[#07140d] shadow-[0_0_24px_rgba(0,255,136,0.4)] transition hover:scale-[1.02] sm:px-4 sm:text-sm">
              Depositar
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(0,255,136,0.18),_transparent_30%),linear-gradient(135deg,#121a22,#0d1117)] shadow-[0_18px_40px_rgba(0,0,0,0.48)]">
          <div className="grid items-center gap-8 px-5 py-8 md:grid-cols-[1.15fr_0.85fr] md:px-8 lg:px-12 lg:py-12">
            <div>
              <span className="inline-flex rounded-full border border-[#00ff88]/50 bg-[#00ff88]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#00ff88]">
                Promoção especial
              </span>
              <h2 className="mt-4 max-w-md text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                Ganhe bônus <span className="text-[#00ff88]">com o jackpot</span> do dia
              </h2>
              <p className="mt-4 max-w-lg text-sm text-[#9ea9a7] sm:text-base">
                Explore os jogos mais quentes, receba cashback e participe de torneios com prêmios exclusivos.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-full bg-[#00ff88] px-5 py-3 text-sm font-extrabold text-[#07140d] shadow-[0_0_24px_rgba(0,255,136,0.4)] hover:brightness-110">
                  Jogar agora
                </button>
                <button className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-[#ffd700]/40 hover:text-[#ffd700]">
                  Ver jogos
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-[26px] bg-gradient-to-tr from-[#00ff88]/15 via-transparent to-[#ffd700]/10 blur-2xl" />
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#101923] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
                <img
                  src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"
                  alt="Banner de cassino"
                  className="h-[260px] w-full rounded-[18px] object-cover md:h-[360px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <GameGrid />

      <footer className="mt-12 border-t border-white/10 bg-[#05080c] text-[#b4bebc]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-[1.1fr_1fr_auto] md:items-center lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00ff88]/35 bg-[#00ff88]/10 text-lg font-black text-[#00ff88]">C</div>
              <div><p className="text-[10px] uppercase tracking-[0.28em] text-[#7f8c89]">Casino</p><p className="text-xl font-black text-[#e7eeec]">RoyalWin</p></div>
            </div>
            <p className="mt-3 text-sm text-[#9ca8a5]">Jogue com responsabilidade. Proibido para menores de 18 anos.</p>
          </div>

          <nav aria-label="Links institucionais" className="flex flex-wrap gap-x-5 gap-y-3">
            {appLinks.map((link) => <a key={link.name} href={link.href} className="text-sm font-medium text-[#aeb8b6] hover:text-[#00ff88]">{link.name}</a>)}
          </nav>

          <div className="flex gap-2">
            <a href="#" aria-label="Baixar na App Store" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#e2e8e6] hover:border-white/35"><span className="text-base"></span><span><small className="block text-[8px] leading-none text-[#9ca8a5]">Baixe na</small>App Store</span></a>
            <a href="#" aria-label="Baixar no Google Play" className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#e2e8e6] hover:border-white/35"><span className="text-base">▶</span><span><small className="block text-[8px] leading-none text-[#9ca8a5]">Disponível no</small>Google Play</span></a>
          </div>
        </div>
        <div className="border-t border-white/8 px-4 py-4 text-center text-xs text-[#7f8c89] sm:px-6 lg:px-8">© {new Date().getFullYear()} RoyalWin. Todos os direitos reservados.</div>
      </footer>
    </main>
  );
}
