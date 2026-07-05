import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SessionProvider } from "@/context/SessionContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Rancho Alba — Sistema de Restaurante",
  description: "Gestión integral de restaurante: pedidos, cocina, pagos y analítica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden">
        <SessionProvider>
          <TooltipProvider>
            <AppSidebar />
            <main className="flex-1 overflow-auto min-w-0 pb-16 md:pb-0">
              {children}
            </main>
            <MobileBottomNav />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
