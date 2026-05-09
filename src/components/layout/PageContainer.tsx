import { ReactNode } from "react";
import PageTransition from "@/components/animations/PageTransition";
import FloatingLetters from "@/components/animations/FloatingLetters";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <>
      <FloatingLetters />
      <PageTransition className={`w-full max-w-7xl mx-auto px-4 py-8 md:py-12 ${className}`}>
        {children}
      </PageTransition>
    </>
  );
}
