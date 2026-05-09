import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import ConditionalFooter from "@/components/layout/ConditionalFooter";

import { ToastProvider } from "@/components/ui/ToastProvider";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bora Stop | Jogue Stop online com seus amigos",
  description: "A melhor e mais divertida forma de jogar Stop/Adedonha online com seus amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${nunito.variable} antialiased min-h-screen flex flex-col relative`}>
        <ToastProvider>
          <div className="bg-decorations">
            <div className="bg-circle circle-1"></div>
            <div className="bg-circle circle-2"></div>
          </div>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <ConditionalFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
