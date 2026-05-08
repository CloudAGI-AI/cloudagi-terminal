import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudAGI",
  description:
    "Sell tokens, not subscriptions. Tokens per watt per dollar. Settled in USDC on Solana. CloudAGI is the marketplace for the actual unit of AI work.",
  metadataBase: new URL("https://cloudagi.ai"),
  openGraph: {
    title: "CloudAGI",
    description:
      "Sell tokens, not subscriptions. Settled in USDC on Solana.",
    url: "https://cloudagi.ai",
    siteName: "CloudAGI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudAGI",
    description:
      "Sell tokens, not subscriptions. Settled in USDC on Solana.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
