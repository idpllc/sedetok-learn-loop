import { useEffect, useRef } from 'react';

export const useGameSounds = () => {
  const loseLifeSound = useRef<HTMLAudioElement | null>(null);
  const timeWarningSound = useRef<HTMLAudioElement | null>(null);
  const clickSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio elements
    loseLifeSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Error sound
    timeWarningSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Clock ticking
    clickSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); // Click/pop sound

    // Set volumes
    if (loseLifeSound.current) loseLifeSound.current.volume = 0.5;
    if (timeWarningSound.current) timeWarningSound.current.volume = 0.4;
    if (clickSound.current) clickSound.current.volume = 0.3;

    return () => {
      // Cleanup
      loseLifeSound.current = null;
      timeWarningSound.current = null;
      clickSound.current = null;
    };
  }, []);

  const playLoseLife = () => {
    if (loseLifeSound.current) {
      loseLifeSound.current.currentTime = 0;
      loseLifeSound.current.play().catch(e => console.log('Error playing sound:', e));
    }
  };

  const playTimeWarning = () => {
    if (timeWarningSound.current) {
      timeWarningSound.current.currentTime = 0;
      timeWarningSound.current.play().catch(e => console.log('Error playing sound:', e));
    }
  };

  const playClick = () => {
    if (clickSound.current) {
      clickSound.current.currentTime = 0;
      clickSound.current.play().catch(e => console.log('Error playing sound:', e));
    }
  };

  return {
    playLoseLife,
    playTimeWarning,
    playClick,
  };
};
