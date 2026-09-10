import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ShortlistProvider } from "@/components/shortlist";
import { ThemeScript } from "@/components/theme-script";
import { BRAND_FULL_NAME, BRAND_NAME } from "@/lib/brand";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: BRAND_FULL_NAME,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Luxury property for sale and rent across the United Kingdom, the United Arab Emirates and Pakistan.",
  openGraph: { type: "website", siteName: BRAND_FULL_NAME },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${hanken.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <ShortlistProvider>{children}</ShortlistProvider>
      </body>
    </html>
  );
}
