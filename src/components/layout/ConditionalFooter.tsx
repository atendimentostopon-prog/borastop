'use client';
import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  // Não mostrar footer em telas de jogo
  const hideFooter = pathname.startsWith('/game/');
  if (hideFooter) return null;
  return <Footer />;
}
