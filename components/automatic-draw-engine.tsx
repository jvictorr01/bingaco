"use client"

import { useEffect, useState, useRef } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Draw, Card as BingoCard } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trophy, Clock } from "lucide-react"
import { creditUserPrize, calculatePrize } from "@/lib/prize-utils"
import { WinnerModal } from "@/components/WinnerModal"

interface AutomaticDrawEngineProps {
  drawId: string
  isActive: boolean
}

interface Winner {
  userId: string
  userName: string
  cardId: string
  type: "quadra" | "quina" | "cheia"
  prize: number
}

interface DrawWithWinnerDetails extends Draw {
  winnerDetails?: {
    [key in "quadra" | "quina" | "cheia"]?: Array<{
      userId: string
      userName: string
      cardId: string
      prize: number
      type: string
    }>
  }
}

export function AutomaticDrawEngine({ drawId, isActive }: AutomaticDrawEngineProps) {
  const [draw, setDraw] = useState<DrawWithWinnerDetails | null>(null)
  const [winners, setWinners] = useState<Winner[]>([])
  const [winnerQueue, setWinnerQueue] = useState<Winner[][]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [currentWinners, setCurrentWinners] = useState<Winner[]>([])
  const { toast } = useToast()
  const announcedWinnersRef = useRef(new Set<string>())
  const drawRefState = useRef<Draw | null>(null)

  // Função para logar informações de debug
  const log = (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[AutomaticDrawEngine]", ...args);
    }
  };

  // useEffect para escutar mudanças no sorteio
  useEffect(() => {
    log("Setting up draw listener para drawId:", drawId);
    
    const unsubscribe = onSnapshot(
      doc(db, "draws", drawId), 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const drawData = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
            dateTime: docSnapshot.data().dateTime.toDate(),
            createdAt: docSnapshot.data().createdAt.toDate(),
          } as DrawWithWinnerDetails;

          setDraw(drawData);
          drawRefState.current = drawData;
          log("Snapshot recebido:", drawData);

          // Processar winnerDetails vindos do backend
          if (drawData.winnerDetails) {
            const winnerDetails = drawData.winnerDetails;
            log("winnerDetails completo recebido:", winnerDetails);
            
            const fases: ("quadra" | "quina" | "cheia")[] = ["quadra", "quina", "cheia"];
            
            for (const fase of fases) {
              const faseWinners = winnerDetails[fase] || [];
              log(`Processando fase ${fase} com ${faseWinners.length} ganhadores:`, faseWinners);
              
              for (const winner of faseWinners) {
                const key = `${winner.cardId}-${winner.type || fase}`;
                log(`Verificando key: ${key}, já anunciado:`, announcedWinnersRef.current.has(key));
                
                if (!announcedWinnersRef.current.has(key)) {
                  // Garantir que o winner tenha todas as propriedades necessárias
                  const winnerFormatted: Winner = {
                    userId: winner.userId || '',
                    userName: winner.userName || 'Usuário',
                    cardId: winner.cardId || '',
                    type: (winner.type || fase) as "quadra" | "quina" | "cheia",
                    prize: Number(winner.prize) || 0
                  };
                  
                  log(`🎉 Novo ganhador encontrado para ${fase}:`, winnerFormatted);
                  
                  // Adicionar à fila imediatamente
                  setWinnerQueue((prev) => {
                    const newQueue = [...prev, [winnerFormatted]];
                    log("Queue atualizada:", newQueue);
                    return newQueue;
                  });
                  
                  // Marcar como anunciado
                  announcedWinnersRef.current.add(key);
                  
                  // Mostrar toast de confirmação
                  toast({
                    title: `🎉 ${fase.toUpperCase()} Ganha!`,
                    description: `${winnerFormatted.userName} ganhou R$ ${winnerFormatted.prize.toFixed(2)}!`,
                  });
                  
                  // Forçar abertura do modal após um pequeno delay
                  setTimeout(() => {
                    setShowWinnerModal(true);
                    log("Modal forçado a abrir para:", winnerFormatted);
                  }, 100);
                }
              }
            }
          }
        }
      },
      (error) => {
        console.error("Erro no listener do sorteio:", error);
        toast({
          title: "Erro de Conexão",
          description: "Problema ao sincronizar dados do sorteio",
          variant: "destructive"
        });
      }
    );

    return () => {
      log("Cleaning up draw listener");
      unsubscribe();
    };
  }, [drawId, toast]);

  // Função chamada ao fechar o modal (timer ou usuário)
  const handleModalClose = () => {
    log("Modal sendo fechado");
    
    // Fechar o modal atual
    setShowWinnerModal(false);
    
    // Remover o primeiro item da fila após um pequeno delay
    setTimeout(() => {
      setWinnerQueue((prev) => {
        const [first, ...rest] = prev;
        log("Modal fechado, removido:", first, "fila restante:", rest);
        
        // Se ainda há itens na fila, abrir o próximo modal
        if (rest.length > 0) {
          setTimeout(() => {
            setShowWinnerModal(true);
            log("Reabrindo modal para próximo item da fila");
          }, 300);
        }
        
        return rest;
      });
    }, 100);
  };

  // Função para exibir o nome correto do prêmio
  const getWinnerTypeBadge = (type: "quadra" | "quina" | "cheia") => {
    switch (type) {
      case "quadra":
        return <Badge className="bg-yellow-100 text-yellow-800">Quadra</Badge>;
      case "quina":
        return <Badge className="bg-blue-100 text-blue-800">Quina</Badge>;
      case "cheia":
        return <Badge className="bg-green-100 text-green-800">Cartela Cheia</Badge>;
      default:
        return <Badge>Prêmio</Badge>;
    }
  };

  if (!draw || draw.mode !== "automatic") {
    return null
  }

  return (
    <>
      {/* Indicador de Status do Sorteio */}
      {draw?.status === "active" && (
        <div className="fixed top-4 left-4 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Sorteio Automático Ativo</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ganhador */}
      <WinnerModal
        open={showWinnerModal && winnerQueue.length > 0}
        winners={winnerQueue[0] || []}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
        onTimerEnd={handleModalClose}
      />

      {/* Debug Info - Remover em produção */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 left-4 z-50 bg-black text-white p-2 rounded text-xs max-w-xs overflow-y-auto max-h-60">
          <div>Status: {draw?.status}</div>
          <div>Mode: {draw?.mode}</div>
          <div>Phase: {draw?.currentPhase}</div>
          <div>Numbers: {draw?.drawnNumbers?.length || 0}/90</div>
          <div>Winner Queue Length: {winnerQueue.length}</div>
          <div>Show Modal: {showWinnerModal ? "Yes" : "No"}</div>
          <div>Announced: {announcedWinnersRef.current.size}</div>
          
          {/* Debug winnerDetails */}
          <div className="mt-2 border-t pt-2">
            <div className="font-bold">WinnerDetails:</div>
            {draw?.winnerDetails ? (
              Object.entries(draw.winnerDetails).map(([fase, winners]) => (
                <div key={fase}>
                  <span className="text-yellow-300">{fase}:</span> {Array.isArray(winners) ? winners.length : 0} ganhadores
                  {Array.isArray(winners) && winners.map((w, i) => (
                    <div key={i} className="ml-2 text-xs">
                      - {w.userName || 'N/A'} (R$ {Number(w.prize || 0).toFixed(2)})
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="text-red-300">Nenhum winnerDetails</div>
            )}
          </div>
          
          {/* Debug queue */}
          <div className="mt-2 border-t pt-2">
            <div className="font-bold">Queue:</div>
            {winnerQueue.map((batch, i) => (
              <div key={i} className="text-xs">
                Batch {i}: {batch.map(w => `${w.type}-${w.userName}`).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}