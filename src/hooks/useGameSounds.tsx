import { useEffect, useRef } from 'react';

export const useGameSounds = () => {
  const loseLifeSound = useRef<HTMLAudioElement | null>(null);
  const timeWarningSound = useRef<HTMLAudioElement | null>(null);
  const clickSound = useRef<HTMLAudioElement | null>(null);
  const victorySound = useRef<HTMLAudioElement | null>(null);
  const correctSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio elements with working URLs
    loseLifeSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizcIGWi77eefTRAMUKfi8LZjHAU4kdLyy30sBSh+zPDajj8JE1ux6OykUBMMTKXh8rlnHwU1jtDyxHkrBSN6yu/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJElax5+qnUhMLSKPg8rZjHQU3kdDywHkqBSJ6yO/bkUAJ');
    timeWarningSound.current = new Audio('data:audio/wav;base64,UklGRpQJAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXAJAACAgoSGiImKi4qJiIaEgoB+fHp4dXNxb21ramhnZWRiYV9eXVxbWlpZWVlYWBlZWVpbXF1eX2BiY2VmaWhqbG5wcnR2eHp8fn+BhIWHiYqLjI2Oj5CRkpOUlJWWl5iYmZqam5ydnZ6foKGio6Slpqanqaqrrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+//8A');
    clickSound.current = new Audio('data:audio/wav;base64,UklGRpYEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIEAACBhYmMj5KVl5mbn52foqSmp6mqq62ur7Cys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v//AQIDBAUGBwgJCgsM');
    victorySound.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    correctSound.current = new Audio('data:audio/wav;base64,UklGRpYEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIEAACBhYmMj5KVl5mbn52foqSmp6mqq62ur7Cys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v//AQIDBAUGBwgJCgsM');

    // Set volumes
    if (loseLifeSound.current) loseLifeSound.current.volume = 0.3;
    if (timeWarningSound.current) timeWarningSound.current.volume = 0.3;
    if (clickSound.current) clickSound.current.volume = 0.2;
    if (victorySound.current) victorySound.current.volume = 0.4;
    if (correctSound.current) correctSound.current.volume = 0.4;

    return () => {
      // Cleanup
      loseLifeSound.current = null;
      timeWarningSound.current = null;
      clickSound.current = null;
      victorySound.current = null;
      correctSound.current = null;
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

  const playVictory = () => {
    if (victorySound.current) {
      victorySound.current.currentTime = 0;
      victorySound.current.play().catch(e => console.log('Error playing sound:', e));
    }
  };

  const playCorrect = () => {
    if (correctSound.current) {
      correctSound.current.currentTime = 0;
      correctSound.current.play().catch(e => console.log('Error playing sound:', e));
    }
  };

  return {
    playLoseLife,
    playTimeWarning,
    playClick,
    playVictory,
    playCorrect,
  };
};
