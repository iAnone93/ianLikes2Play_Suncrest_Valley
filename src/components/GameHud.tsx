import { Pause, Sun, Coins, Zap, Award } from 'lucide-react';
import { ITEMS, WATERING_CAN_MAX, formatClock } from '../game/constants';
import { getSpriteAtlas } from '../game/pixelSprites';
import type { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectSlot: (index: number) => void;
  onPause: () => void;
  onDismissCelebration: () => void;
}

export function GameHud({
  hud,
  onSelectSlot,
  onPause,
  onDismissCelebration,
}: GameHudProps) {
  const atlas = getSpriteAtlas();
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const goalPct = Math.max(0, Math.min(100, (hud.totalEarned / hud.bannerGoal) * 100));
  const activeSlot = hud.quickBar[hud.selectedSlot];
  const activeItem = activeSlot ? ITEMS[activeSlot.itemId] : null;

  const staminaColor =
    staminaPct > 50 ? 'bg-[#2E9E5B]' : staminaPct > 20 ? 'bg-[#E59A28]' : 'bg-[#C94A38]';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Perimeter */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Almanac & Goal */}
        <div className="pixel-panel px-4 py-2.5 flex flex-col gap-1.5 min-w-[210px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#231710]">
              <Sun className="w-4 h-4 text-[#E59A28] shrink-0" />
              <span className="whitespace-nowrap">Spring · Day {hud.day}</span>
            </div>
            <span className="font-mono text-xs font-bold text-[#5C3D28] tabular-nums whitespace-nowrap">
              {formatClock(hud.timeMinutes)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-[#5C3D28]">
              <span className="font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#E59A28]" />
                {hud.bannerRestored ? 'Banner Restored' : 'Homestead Banner'}
              </span>
              <span className="font-mono font-bold tabular-nums">
                {Math.min(hud.totalEarned, hud.bannerGoal)}/{hud.bannerGoal}G
              </span>
            </div>
            <div className="w-full h-2 bg-[#D8C39E] border border-[#4A3121]">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.bannerRestored ? 'bg-[#E59A28]' : 'bg-[#2E9E5B]'
                }`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Gold, Stamina & Pause */}
        <div className="flex items-start gap-3">
          <div className="pixel-panel px-4 py-2.5 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#E59A28] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-[#6E4D36] leading-none">
                  Gold
                </span>
                <span className="font-mono text-sm font-bold text-[#231710] tabular-nums">
                  {hud.gold}G
                </span>
              </div>
            </div>

            {hud.shippingCount > 0 && (
              <div className="border-l border-[#D8C39E] pl-4 flex flex-col">
                <span className="text-[11px] font-semibold text-[#6E4D36] leading-none">
                  Bin Tonight
                </span>
                <span className="font-mono text-sm font-bold text-[#2E9E5B] tabular-nums">
                  +{hud.shippingValue}G ({hud.shippingCount})
                </span>
              </div>
            )}

            <div className="border-l border-[#D8C39E] pl-4 flex flex-col gap-1 min-w-[124px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5C3D28] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#E59A28]" />
                  Stamina
                </span>
                <span className="font-mono font-bold text-[#231710] tabular-nums">
                  {hud.stamina}/{hud.maxStamina}
                </span>
              </div>
              <div className="w-full h-2 bg-[#D8C39E] border border-[#4A3121]">
                <div
                  className={`h-full transition-all duration-150 ${staminaColor}`}
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto pixel-btn pixel-panel px-3 py-2.5 flex items-center gap-1.5 text-xs font-bold text-[#231710] hover:bg-[#EAD8B6] cursor-pointer whitespace-nowrap"
          >
            <Pause className="w-4 h-4" />
            <span>Pause</span>
          </button>
        </div>
      </div>

      {/* Banner Restored Celebration Overlay */}
      {hud.bannerCelebrationVisible && (
        <div className="self-center pointer-events-auto pixel-panel px-6 py-4 flex items-center gap-5 max-w-lg">
          <Award className="w-8 h-8 text-[#E59A28] shrink-0" />
          <div className="flex flex-col">
            <h2
              className="text-lg font-bold text-[#231710]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Banner restored!
            </h2>
            <p className="text-xs text-[#5C3D28]">
              You earned {hud.totalEarned}G total and raised the Suncrest Homestead Banner. Free play continues!
            </p>
          </div>
          <button
            type="button"
            onClick={onDismissCelebration}
            className="pixel-btn px-4 py-2 bg-[#2E9E5B] hover:bg-[#27894E] text-[#FFFDF7] text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            Continue
          </button>
        </div>
      )}

      {/* Bottom Perimeter: Contextual Prompt, Toast & 10-Slot Quick Bar */}
      <div className="flex flex-col items-center gap-2">
        {hud.toastMessage && (
          <div className="pixel-panel-dark px-4 py-1.5 text-xs font-semibold text-[#FFFDF7]">
            {hud.toastMessage}
          </div>
        )}

        {hud.targetPrompt && (
          <div className="pixel-panel px-4 py-1 text-xs font-semibold text-[#231710]">
            {hud.targetPrompt}
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          {activeItem && (
            <div className="pixel-panel-dark px-3 py-0.5 text-[11px] font-medium text-[#F4EAD5]">
              {activeItem.name}
              {activeSlot?.itemId === 'watering_can'
                ? ` · Water ${activeSlot.waterLevel ?? 0}/${WATERING_CAN_MAX}`
                : ` · ${activeItem.description}`}
            </div>
          )}

          <div className="pointer-events-auto pixel-panel p-1.5 flex items-center gap-1.5">
            {hud.quickBar.map((slot, idx) => {
              const isSelected = idx === hud.selectedSlot;
              const keyLabel = idx === 9 ? '0' : String(idx + 1);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSlot(idx)}
                  title={slot ? ITEMS[slot.itemId].name : `Empty Slot (${keyLabel})`}
                  className={`relative w-12 h-12 flex items-center justify-center border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#FFF5D6] border-[#C94A38] ring-2 ring-[#E59A28]'
                      : 'bg-[#E7D4B1] border-[#4A3121] hover:bg-[#EFE0C3]'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 font-mono text-[10px] font-bold text-[#5C3D28] leading-none">
                    {keyLabel}
                  </span>

                  {slot && (
                    <>
                      <img
                        src={atlas.itemIcons[slot.itemId]}
                        alt={ITEMS[slot.itemId].name}
                        className="w-8 h-8 pixelated"
                        draggable={false}
                      />

                      {slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 font-mono text-[11px] font-bold text-[#231710] bg-[#F4EAD5]/90 px-1 leading-tight tabular-nums">
                          {slot.count}
                        </span>
                      )}

                      {slot.itemId === 'watering_can' && (
                        <div className="absolute bottom-1 left-1 right-1 h-1 bg-[#4A3121]">
                          <div
                            className="h-full bg-[#3C87BC]"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((slot.waterLevel ?? 0) / WATERING_CAN_MAX) * 100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
