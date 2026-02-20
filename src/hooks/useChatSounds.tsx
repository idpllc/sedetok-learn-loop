import { useCallback, useRef } from "react";

export const useChatSounds = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  /** Sonido de mensaje recibido: "pop" suave tipo WhatsApp */
  const playMessageReceived = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Oscilador principal - tono suave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);

      // Segunda nota para dar sensación de "pop"
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1100, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain2.gain.setValueAtTime(0, now + 0.05);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc2.start(now + 0.05);
      osc2.stop(now + 0.22);
    } catch (e) {
      // Silently fail if audio not available
    }
  }, [getAudioContext]);

  /** Sonido de mensaje enviado: "tick" corto */
  const playMessageSent = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Silently fail
    }
  }, [getAudioContext]);

  return { playMessageReceived, playMessageSent };
};
