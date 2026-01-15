'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeedReaderProps {
  text: string;
  title: string;
  author?: string;
  initialIndex?: number;
  initialWpm?: number;
  initialWordsPerFlash?: number;
  onProgressChange?: (index: number, wpm: number, wordsPerFlash: number) => void;
  onBack?: () => void;
}

export default function SpeedReader({
  text,
  title,
  author,
  initialIndex = 0,
  initialWpm = 300,
  initialWordsPerFlash = 1,
  onProgressChange,
  onBack,
}: SpeedReaderProps) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);
  const [wordsPerFlash, setWordsPerFlash] = useState(initialWordsPerFlash);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words.slice(currentIndex, currentIndex + wordsPerFlash).join(' ');
  const progress = ((currentIndex + 1) / words.length) * 100;
  const msPerWord = (60 / wpm) * 1000;

  // Save progress when pausing or changing settings
  useEffect(() => {
    if (!isPlaying && onProgressChange) {
      onProgressChange(currentIndex, wpm, wordsPerFlash);
    }
  }, [isPlaying, currentIndex, wpm, wordsPerFlash, onProgressChange]);

  const play = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, words.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const skip = useCallback((amount: number) => {
    setCurrentIndex(prev => {
      const next = prev + amount;
      if (next < 0) return 0;
      if (next >= words.length) return words.length - 1;
      return next;
    });
  }, [words.length]);

  const adjustSpeed = useCallback((amount: number) => {
    setWpm(prev => {
      const next = prev + amount;
      if (next < 50) return 50;
      if (next > 1500) return 1500;
      return next;
    });
  }, []);

  const seekTo = useCallback((percentage: number) => {
    const index = Math.floor((percentage / 100) * words.length);
    setCurrentIndex(Math.min(index, words.length - 1));
  }, [words.length]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= words.length - wordsPerFlash) {
            setIsPlaying(false);
            return prev;
          }
          return prev + wordsPerFlash;
        });
      }, msPerWord * wordsPerFlash);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, msPerWord, words.length, wordsPerFlash]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          skip(-10);
          break;
        case 'ArrowRight':
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustSpeed(25);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustSpeed(-25);
          break;
        case 'r':
          restart();
          break;
        case 'Escape':
          if (onBack) onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, adjustSpeed, restart, onBack]);

  const timeRemaining = Math.ceil(((words.length - currentIndex) / wpm));

  const getFocusPoint = (word: string) => {
    if (!word) return { before: '', focus: '', after: '' };
    const focusIndex = Math.max(0, Math.floor(word.length * 0.3));
    return {
      before: word.slice(0, focusIndex),
      focus: word[focusIndex] || '',
      after: word.slice(focusIndex + 1)
    };
  };

  const { before, focus, after } = wordsPerFlash === 1 ? getFocusPoint(currentWord) : { before: '', focus: '', after: '' };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Back to home (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-lg font-medium text-zinc-400">{title}</h1>
          {author && <p className="text-sm text-zinc-600">by {author}</p>}
        </div>
      </div>

      {/* Main reading area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-4xl">
          {/* Word display */}
          <div className="h-40 flex items-center justify-center relative">
            {/* Focus line indicator */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/30 transform -translate-x-1/2 z-10" />

            {wordsPerFlash === 1 ? (
              <div className="flex text-5xl md:text-7xl font-mono tracking-tight">
                <span className="text-zinc-400 text-right w-[45vw] max-w-[300px]">{before}</span>
                <span className="text-red-500">{focus}</span>
                <span className="text-white text-left w-[45vw] max-w-[300px]">{after}</span>
              </div>
            ) : (
              <div className="text-4xl md:text-5xl font-mono tracking-tight text-white text-center">
                {currentWord}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="h-2 bg-zinc-800 rounded-full mt-8 cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percentage = ((e.clientX - rect.left) / rect.width) * 100;
              seekTo(percentage);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between text-sm text-zinc-500 mt-2">
            <span>Word {currentIndex + 1} of {words.length}</span>
            <span>{timeRemaining} min remaining</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          {/* Play controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => skip(-50)}
              className="p-3 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400"
              title="Skip back 50 words"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className="p-5 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => skip(50)}
              className="p-3 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400"
              title="Skip forward 50 words"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>
          </div>

          {/* Speed control */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4">
              <span className="text-zinc-500 text-sm w-16">Speed</span>
              <button
                onClick={() => adjustSpeed(-50)}
                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-lg font-medium"
              >
                −
              </button>
              <div className="w-24 text-center">
                <span className="text-2xl font-bold">{wpm}</span>
                <span className="text-zinc-500 text-sm ml-1">wpm</span>
              </div>
              <button
                onClick={() => adjustSpeed(50)}
                className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-lg font-medium"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-zinc-500 text-sm">Words</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setWordsPerFlash(n)}
                    className={`w-10 h-10 rounded-lg transition-colors text-sm font-medium ${
                      wordsPerFlash === n
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={restart}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
            >
              Restart
            </button>
          </div>

          {/* Keyboard shortcuts */}
          <div className="mt-6 text-center text-xs text-zinc-600">
            <span className="px-2 py-1 bg-zinc-800 rounded mr-2">Space</span> Play/Pause
            <span className="px-2 py-1 bg-zinc-800 rounded mx-2">←→</span> Skip
            <span className="px-2 py-1 bg-zinc-800 rounded mx-2">↑↓</span> Speed
            <span className="px-2 py-1 bg-zinc-800 rounded mx-2">R</span> Restart
            <span className="px-2 py-1 bg-zinc-800 rounded mx-2">Esc</span> Back
          </div>
        </div>
      </div>
    </div>
  );
}
