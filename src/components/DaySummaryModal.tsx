import { useEffect } from 'react';
import { Award, Moon } from 'lucide-react';
import { BANNER_GOAL_GOLD } from '../game/constants';
import { getSpriteAtlas } from '../game/pixelSprites';
import type { DaySummaryData } from '../game/types';

interface DaySummaryModalProps {
  summary: DaySummaryData;
  onNextDay: () => void;
}

export function DaySummaryModal({ summary, onNextDay }: DaySummaryModalProps) {
  const atlas = getSpriteAtlas();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onNextDay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNextDay]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#141828]/80 px-4 pointer-events-auto">
      <div className="pixel-panel w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b-2 border-[#D8C39E] pb-3">
          <div className="flex items-center gap-2.5">
            <Moon className="w-5 h-5 text-[#4A3121]" />
            <h2
              className="text-xl font-bold text-[#231710]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Day {summary.dayCompleted} Ledger
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#2E9E5B]">Auto-saved</span>
        </div>

        {summary.passedOut && (
          <div className="p-3 bg-[#F7DFDA] border-2 border-[#C94A38] text-xs font-semibold text-[#7A2318]">
            You stayed out past midnight and passed out! You wake up at 06:00 AM with 50% stamina.
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

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-[#5C3D28]">Shipped Produce</h3>
          {summary.shippedItems.length === 0 ? (
            <div className="p-3 bg-[#EAD8B6] border border-[#C6AF88] text-xs text-[#6E4D36]">
              No crops were placed in the Shipping Bin today.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {summary.shippedItems.map((item) => (
                <div
                  key={item.cropId}
                  className="flex items-center justify-between p-2 bg-[#EAD8B6] border border-[#4A3121]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={atlas.itemIcons[item.cropId]}
                      alt={item.name}
                      className="w-6 h-6 pixelated"
                    />
                    <span className="text-sm font-semibold text-[#231710]">
                      {item.name} ×{item.count}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#231710] tabular-nums">
                    +{item.subtotal}G
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#D8C39E] pt-3 flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#5C3D28]">Earned Tonight</span>
            <span className="font-mono font-bold text-[#2E9E5B] tabular-nums">
              +{summary.earningsToday}G
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#5C3D28]">Current Gold</span>
            <span className="font-mono font-bold text-[#231710] tabular-nums">
              {summary.newGold}G
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#6E4D36]">
            <span>Cumulative Earned (Goal: {BANNER_GOAL_GOLD}G)</span>
            <span className="font-mono font-bold tabular-nums">{summary.totalEarned}G</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNextDay}
          className="pixel-btn w-full py-3 bg-[#2E9E5B] hover:bg-[#27894E] text-[#FFFDF7] font-semibold text-sm cursor-pointer"
        >
          Wake Up on Day {summary.dayCompleted + 1}
        </button>
      </div>
    </div>
  );
}
