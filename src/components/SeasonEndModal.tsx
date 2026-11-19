import { useEffect } from 'react';
import { Award, Calendar, Coins } from 'lucide-react';
import { BANNER_GOAL_GOLD } from '../game/constants';
import type { SeasonEndSummaryData } from '../game/types';

interface SeasonEndModalProps {
  summary: SeasonEndSummaryData;
  onContinue: () => void;
}

export function SeasonEndModal({ summary, onContinue }: SeasonEndModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141828]/80 px-4 pointer-events-auto">
      <div className="pixel-panel w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b-2 border-[#D8C39E] pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#4A3121]" />
            <h2
              className="text-xl font-bold text-[#231710]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {summary.seasonCompleted} Season Ended
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#2E9E5B]">Day {summary.dayCompleted}</span>
        </div>

        {summary.witheredMessage ? (
          <div className="p-3 bg-[#FEF3C7] border-2 border-[#C94A38] text-xs font-semibold text-[#7A2318]">
            {summary.witheredMessage}
          </div>
        ) : (
          <div className="p-3 bg-[#EAD8B6] border-2 border-[#C6AF88] text-xs font-semibold text-[#5C3D28]">
            Spring has come to a close. Remaining crops have stopped growing until the next season.
          </div>
        )}

        {summary.bannerJustRestored && (
          <div className="p-3 bg-[#FFF3CD] border-2 border-[#E59A28] flex items-center gap-3">
            <Award className="w-6 h-6 text-[#C97B12] shrink-0" />
            <div className="text-xs text-[#231710]">
              <span className="font-bold block">Banner restored!</span>
              You reached {BANNER_GOAL_GOLD}G total earnings. The Homestead Banner now flies over your farm!
            </div>
          </div>
        )}

        <div className="p-4 bg-[#EAD8B6] border-2 border-[#4A3121] flex flex-col gap-2 text-sm">
          {summary.earningsToday > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#5C3D28]">Final Night Shipped</span>
              <span className="font-mono font-bold text-[#2E9E5B] tabular-nums">
                +{summary.earningsToday}G
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-[#231710]">
              <Coins className="w-4 h-4 text-[#E59A28]" />
              Total Gold Earned
            </span>
            <span className="font-mono text-base font-bold text-[#231710] tabular-nums">
              {summary.totalEarned}G
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#6E4D36]">
            <span>Current Gold</span>
            <span className="font-mono font-bold tabular-nums">{summary.newGold}G</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="pixel-btn w-full py-3 bg-[#2E9E5B] hover:bg-[#27894E] text-[#FFFDF7] font-semibold text-sm cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
