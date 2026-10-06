import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSetting, mascotSettings } from "@/lib/settings";
import { THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nelcota · Compartilhamento de tela",
    template: "%s · Nelcota",
  },
  description: "Compartilhamento de tela para times pequenos, direto do navegador.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // O script do tema troca pela cor do tema escolhido.
  themeColor: THEME_COLOR.dark,
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A configuração vem do banco a cada requisição (com cache em memória), não do
  // build: lá não há banco nem variáveis de ambiente.
  await connection();
  const mascot = await getSetting(mascotSettings);
  const style = {
    "--mascot-saturation-dark": mascot.saturationDark,
    "--mascot-saturation-light": mascot.saturationLight,
  } as CSSProperties;

  return (
    // O script abaixo põe data-theme no <html> antes da hidratação (sem JS: escuro).
    <html lang="pt-BR" className={manrope.variable} style={style} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
