import type { Metadata } from "next";
import { Poppins, Saira_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Zelfde display-font als thebridgeavgroup.com — condensed + extra bold voor koppen,
// om de "stoere" merkidentiteit door te trekken in de tool zonder de leesbaarheid van
// lopende tekst/tabellen (die Poppins houden) aan te tasten.
const sairaCondensed = Saira_Condensed({
  variable: "--font-heading-override",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "The Bridge — Productie",
  description: "Productieplatform voor technische producties",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${poppins.variable} ${sairaCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
