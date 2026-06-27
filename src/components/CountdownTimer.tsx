import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Zap } from 'lucide-react';

interface CountdownTimerProps {
  dataSessao: string | null | undefined;
  /** Limiar em horas para exibir o contador. Padrão: 24h */
  thresholdHours?: number;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function calcTimeLeft(dataSessao: string): TimeLeft | null {
  const target = new Date(dataSessao).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return null; // Já passou

  return {
    totalMs: diff,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function CountdownTimer({
  dataSessao,
  thresholdHours = 24,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!dataSessao) return;

    // Cálculo inicial imediato
    const initial = calcTimeLeft(dataSessao);
    setTimeLeft(initial);

    // Só ativa o intervalo se estiver dentro do limiar
    if (!initial || initial.hours >= thresholdHours) return;

    const interval = setInterval(() => {
      const updated = calcTimeLeft(dataSessao);
      setTimeLeft(updated);

      // Para o intervalo quando expirar
      if (!updated || updated.totalMs <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dataSessao, thresholdHours]);

  // Nada para mostrar: data ausente, já passou ou falta mais de 24h
  if (!dataSessao || !timeLeft || timeLeft.hours >= thresholdHours) {
    return null;
  }

  // Urgência crescente conforme o tempo diminui
  const isUrgent = timeLeft.hours < 1;          // < 1h → vermelho pulsante
  const isWarning = timeLeft.hours < 6;         // < 6h → laranja
  // else: amarelo (< 24h)

  const colorClass = isUrgent
    ? 'text-red-400 border-red-500/40 bg-red-950/30'
    : isWarning
    ? 'text-orange-400 border-orange-500/40 bg-orange-950/25'
    : 'text-amber-400 border-amber-500/35 bg-amber-950/20';

  const dotClass = isUrgent
    ? 'bg-red-400'
    : isWarning
    ? 'bg-orange-400'
    : 'bg-amber-400';

  const Icon = isUrgent ? Zap : isWarning ? AlertTriangle : Clock;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all ${colorClass}`}
      title={`Sessão em ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
    >
      {/* Dot pulsante */}
      <span className="relative flex items-center justify-center w-2 h-2">
        <span
          className={`absolute inline-flex w-full h-full rounded-full opacity-60 ${dotClass} ${
            isUrgent ? 'animate-ping' : ''
          }`}
        />
        <span className={`relative inline-flex w-2 h-2 rounded-full ${dotClass}`} />
      </span>

      {/* Ícone */}
      <Icon
        className={`w-3.5 h-3.5 flex-shrink-0 ${isUrgent ? 'animate-pulse' : ''}`}
      />

      {/* Tempo */}
      <span>
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>

      {/* Label de contexto */}
      <span className="font-sans font-semibold text-[10px] opacity-80 uppercase tracking-widest">
        {isUrgent ? 'URGENTE' : isWarning ? 'Em breve' : 'Hoje'}
      </span>
    </div>
  );
}
