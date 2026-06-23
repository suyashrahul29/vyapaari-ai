import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vyapaari AI — Bada socho, chhoti dukaan se",
  description:
    "Voice-first AI business consultant for India's small businesses. Strategic advice in Hindi or English that remembers everything.",
  icons: { icon: "/vyapaari_app_icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Inter:wght@400;500&family=Noto+Sans+Devanagari:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
