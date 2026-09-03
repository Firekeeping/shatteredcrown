import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./bubbles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tactics of the Shattered Crown",
  description: "Lead a disposable company through tactical battles, cursed loot, and the deeply questionable first floor of Undermountain.",
  metadataBase: new URL("https://shattered-crown-tactics.firekeeping.chatgpt.site"),
  openGraph: {
    title: "Tactics of the Shattered Crown",
    description: "A darkly comic grid-based tactical RPG campaign.",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Tactics of the Shattered Crown" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tactics of the Shattered Crown",
    description: "A darkly comic grid-based tactical RPG campaign.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
