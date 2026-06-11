import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
     "https://worldcup-orcin.vercel.app"
  ),
  title: {
    default: "World Cup Picks",
    template: "%s | World Cup Picks",
  },
  description: "Make your World Cup picks and turn them into shareable cards.",
  icons: {
    icon: [
      {
        url: "/assets/fifa_logo.png",
        type: "image/png",
      },
    ],
    shortcut: ["/assets/fifa_logo.png"],
    apple: [
      {
        url: "/assets/fifa_logo.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "World Cup Picks",
    description: "Make your World Cup picks and turn them into shareable cards.",
    images: [
      {
        url: "/assets/og-image.png",
        width: 630,
        height: 1200,
        alt: "My World Cup Picks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "World Cup Picks",
    description: "Make your World Cup picks and turn them into shareable cards.",
    images: ["/assets/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
