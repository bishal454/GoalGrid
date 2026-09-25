import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalBackground from "../components/GlobalBackground";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Offside AI",
  description: "Football match intelligence dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem("theme");
                  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add("dark");
                    document.documentElement.style.background = "#090a0f";
                  } else {
                    document.documentElement.classList.remove("dark");
                    document.documentElement.style.background = "#edf5f2";
                  }
                  const savedBgAnim = localStorage.getItem("bgAnimation");
                  if (savedBgAnim === "off") {
                    document.documentElement.classList.add("no-bg-animation");
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalBackground />
        {children}
      </body>
    </html>
  );
}
