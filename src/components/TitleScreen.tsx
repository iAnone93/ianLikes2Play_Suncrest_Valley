import { useEffect } from 'react';
import type { Stage1SaveData } from '../game/types';
import { formatClock } from '../game/constants';

interface TitleScreenProps {
  existingSave: Stage1SaveData | null;
  onStartNew: () => void;
  onContinue: () => void;
}

export function TitleScreen({ existingSave, onStartNew, onContinue }: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (existingSave) {
          onContinue();
        } else {
          onStartNew();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [existingSave, onContinue, onStartNew]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-6 bg-[#1d3319]/75 pointer-events-auto">
      <div className="pixel-panel max-w-md w-full px-8 py-8 text-center flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <svg
            width="56"
            height="40"
            viewBox="0 0 56 40"
            fill="none"
            aria-hidden="true"
            className="pixelated"
          >
            <rect x="24" y="4" width="8" height="8" fill="#E59A28" />
            <rect x="20" y="8" width="16" height="8" fill="#F7C95C" />
            <rect x="16" y="12" width="24" height="4" fill="#E59A28" />
            <rect x="8" y="22" width="40" height="4" fill="#5A8F49" />
            <rect x="4" y="26" width="48" height="6" fill="#4A3121" />
            <rect x="12" y="20" width="4" height="6" fill="#78BA54" />
            <rect x="26" y="18" width="4" height="8" fill="#78BA54" />
            <rect x="40" y="20" width="4" height="6" fill="#78BA54" />
          </svg>
          <h1
            className="text-4xl font-bold tracking-tight text-[#231710]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Suncrest Valley
          </h1>
          <p className="text-sm text-[#5C3D28] max-w-xs">
            Till the Spring soil, tend your crops, and earn 500G to restore the Homestead Banner.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {existingSave ? (
            <>
              <button
                type="button"
                onClick={onContinue}
                className="pixel-btn w-full py-3 px-5 bg-[#2E9E5B] hover:bg-[#27894E] text-[#FFFDF7] font-semibold text-base cursor-pointer whitespace-nowrap"
              >
                Continue Farm
              </button>
              <p className="text-xs text-[#5C3D28] font-mono tabular-nums">
                Spring · Day {existingSave.day} · {formatClock(existingSave.timeMinutes)} ·{' '}
                {existingSave.gold}G
              </p>
              <button
                type="button"
                onClick={onStartNew}
                className="pixel-btn w-full py-2.5 px-5 bg-[#E7D4B1] hover:bg-[#DEC497] text-[#231710] font-semibold text-sm cursor-pointer whitespace-nowrap"
              >
                Start New Farm
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="pixel-btn w-full py-3 px-5 bg-[#2E9E5B] hover:bg-[#27894E] text-[#FFFDF7] font-semibold text-base cursor-pointer whitespace-nowrap"
            >
              Start
            </button>
          )}
        </div>

        <p className="text-xs text-[#6E4D36] border-t border-[#D8C39E] pt-4 w-full">
          WASD / Arrows Move · Space / Click Action · 1–0 Quick Slots · Esc Pause
        </p>
      </div>
    </div>
  );
}
