'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameLogo from "@/components/game/GameLogo";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/layout/PageContainer";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import AnimatedCard from "@/components/animations/AnimatedCard";
import PulseGlow from "@/components/animations/PulseGlow";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("bora_stop_nickname");
    if (saved) setNickname(saved);
  }, []);

  const handleAction = (path: string) => {
    if (!nickname.trim()) {
      setError("Por favor, digite um apelido antes de jogar.");
      return;
    }
    localStorage.setItem("bora_stop_nickname", nickname.trim());
    router.push(path);
  };

  return (
    <PageContainer className="flex flex-col items-center justify-center min-h-[80vh] gap-12">
      <div className="text-center flex flex-col items-center gap-4">
        <GameLogo size="lg" />
        <p className="text-xl md:text-2xl font-bold text-white/80 max-w-lg mt-4">
          Jogue Stop online com seus amigos
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">
        <AnimatedCard hoverScale>
          <Card className="flex flex-col gap-6">
            <Input 
              placeholder="Digite seu apelido..." 
              className="text-center text-xl font-bold"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError("");
              }}
              error={error}
            />
            
            <div className="flex flex-col gap-4">
              <PulseGlow color="brand-yellow">
                <Button size="lg" fullWidth onClick={() => handleAction("/rooms")}>
                  Jogar Agora
                </Button>
              </PulseGlow>
              
              <div className="grid grid-cols-2 gap-4">
                <Button variant="secondary" fullWidth onClick={() => handleAction("/create-room")}>
                  Criar Sala
                </Button>
                <Button variant="secondary" fullWidth onClick={() => handleAction("/rooms")}>
                  Entrar em Sala
                </Button>
              </div>
            </div>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <Card className="bg-brand-purple/20 border-brand-purple/50">
            <h3 className="font-bold text-lg mb-2 text-brand-yellow">Como Jogar</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
              <li>Escolha um apelido e crie ou entre em uma sala.</li>
              <li>Uma letra será sorteada no início de cada rodada.</li>
              <li>Preencha as categorias com palavras que comecem com a letra.</li>
              <li>O primeiro a terminar clica em STOP!</li>
              <li>Todos validam as respostas e ganham pontos.</li>
            </ol>
          </Card>
        </AnimatedCard>

        <AdPlaceholder />
      </div>
    </PageContainer>
  );
}
