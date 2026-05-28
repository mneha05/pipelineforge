import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PipelineForge — Visual ETL & Data Integration Builder",
  description:
    "Design, run, observe, and validate data pipelines visually. A real execution engine — not a diagram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..900&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-display:'Fraunces',Georgia,serif;--font-body:'Public Sans',system-ui,sans-serif;--font-mono:'JetBrains Mono',ui-monospace,monospace;}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
