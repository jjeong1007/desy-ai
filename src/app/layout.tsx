import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Providers, THEME_SCRIPT } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Desy: know if your idea is worth building", template: "%s · Desy" },
  description: "Desy scores your SaaS idea against real evidence from the web and gives you a plan for your first customer conversations.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#121211" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="sr-only z-[100] rounded bg-canvas px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:shadow-pop">
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
