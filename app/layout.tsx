import type { Metadata, Viewport } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import Background from "@/components/Background";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Abdisalam Mohamed Muhumed — Portfolio",
  description: "Full-Stack Software Engineer & AI Enthusiast based in Borama, Somaliland.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#071012" },
    { media: "(prefers-color-scheme: light)", color: "#f3f7f7" },
  ],
};

// Apply the saved theme before paint (no flash)
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Background />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
