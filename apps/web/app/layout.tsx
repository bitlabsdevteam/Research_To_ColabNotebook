import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiKeyProvider } from "./context/ApiKeyContext";

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
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-screen antialiased`}
        style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}
      >
        <ApiKeyProvider>{children}</ApiKeyProvider>
      </body>
    </html>
  );
}
