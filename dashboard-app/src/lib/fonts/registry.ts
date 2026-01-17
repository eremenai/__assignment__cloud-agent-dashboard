import { Geist_Mono, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const fontRegistry = {
  inter: {
    label: "Inter",
    font: inter,
  },
  geistMono: {
    label: "Geist Mono",
    font: geistMono,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

// Single font - Inter (mono for code)
export const DEFAULT_FONT: FontKey = "inter";

export const fontVars = `${inter.variable} ${geistMono.variable}`;
