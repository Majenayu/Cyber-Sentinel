import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CyberSentinel | AI Intelligence Hub",
  description: "Advanced operations assistant for penetration testing and cybersecurity operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        <div className="scanline-overlay"></div>
        <div className="flex h-screen w-full bg-background overflow-hidden dark">
          <Sidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
