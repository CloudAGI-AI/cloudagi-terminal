import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudAGI",
  description:
    "An open marketplace where anyone can register a local or hosted AI agent and earn stablecoin payments per call — with full transparency via on-chain receipts.",
  metadataBase: new URL("https://cloudagi.ai"),
  openGraph: {
    title: "CloudAGI",
    description:
      "Monetize your models. Rent agents with receipts. On-chain from the terminal.",
    url: "https://cloudagi.ai",
    siteName: "CloudAGI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudAGI",
    description:
      "Monetize your models. Rent agents with receipts. On-chain from the terminal.",
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
