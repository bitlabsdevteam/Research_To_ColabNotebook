import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiKeyProvider } from "./context/ApiKeyContext";
import { SupabaseProvider } from "./context/SupabaseProvider";
import { ThemeProvider } from "./context/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paper2Notebook",
  description: "Convert research papers to Google Colab tutorials",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen antialiased`}
        style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}
        suppressHydrationWarning
      >
        {/* Inline script: sets data-theme before first paint, preventing flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <SupabaseProvider>
            <ApiKeyProvider>{children}</ApiKeyProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
