import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
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
  title: "Rancho Tara — Sistema de Restaurante",
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
      className={`${plusJakartaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden">
        <TooltipProvider>
          <AppSidebar />
          <main className="flex-1 overflow-auto min-w-0">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
