import React from 'react';
import { cn } from '@/lib/utils';
import Header from './Header';
import Footer from './Footer';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  withHeader?: boolean;
  withFooter?: boolean;
}

export default function PageContainer({ 
  children, 
  className,
  withHeader = true,
  withFooter = true
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-brand-bg text-white flex flex-col">
      {withHeader && <Header />}
      <main className={cn("flex-grow p-6 md:p-10", className)}>
        {children}
      </main>
      {withFooter && <Footer />}
    </div>
  );
}
