'use client';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isGamePage = pathname.includes('/game/');
  
  if (isGamePage) return null;
  
  return <Footer />;
}
