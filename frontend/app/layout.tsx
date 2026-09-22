import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoyalWin Casino",
  description: "Landing page inspirada em cassinos modernos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full bg-[#0d1117] text-[#eafaf5]">{children}</body>
    </html>
  );
}
