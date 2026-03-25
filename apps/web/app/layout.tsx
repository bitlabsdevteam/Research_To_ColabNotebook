import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
