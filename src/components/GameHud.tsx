import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Sun, Coins, Zap, Award, Check, ScrollText } from 'lucide-react';
import { getItemIconUrl, subscribeAssetsReady } from '../game/assets';
import { ITEMS, WATERING_CAN_MAX, formatClock } from '../game/constants';
import type { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectSlot: (index: number) => void;
  onPause: () => void;
  onToggleQuests: () => void;
  onDismissCelebration: () => void;
}

export function GameTopBar({
  hud,
  onPause,
  onToggleQuests,
}: Pick<GameHudProps, 'hud' | 'onPause' | 'onToggleQuests'>) {
  const staminaPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));
  const goalPct = Math.max(0, Math.min(100, (hud.totalEarned / hud.bannerGoal) * 100));
  const goalReached = hud.totalEarned >= hud.bannerGoal;
  const staminaColor =
    staminaPct > 50 ? 'bg-[#2E9E5B]' : staminaPct > 20 ? 'bg-[#E59A28]' : 'bg-[#C94A38]';

  const statusText = hud.toastMessage ?? hud.targetPrompt;

  return (
    <header className="relative z-10 shrink-0 h-11 bg-[#231710] border-b-2 border-[#4A3121] px-3 flex items-center justify-between gap-3">
      {/* Top-Left Almanac & Goal */}
      <div className="pixel-panel px-2.5 py-1 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#231710]">
          <Sun className="w-3.5 h-3.5 text-[#E59A28] shrink-0" />
          <span className="whitespace-nowrap">
            {hud.season} Day {hud.day}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-[#5C3D28] tabular-nums whitespace-nowrap">
          {formatClock(hud.timeMinutes)}
        </span>
        <div className="border-l border-[#D8C39E] pl-2.5 flex items-center gap-2">
          {goalReached ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#E6F4EA] border border-[#2E9E5B] text-[11px] font-bold text-[#1F7A44] whitespace-nowrap">
              <Check className="w-3 h-3 text-[#2E9E5B] shrink-0" strokeWidth={3} />
              <span>Goal reached</span>
            </span>
          ) : (
            <>
              <Award className="w-3.5 h-3.5 text-[#E59A28] shrink-0" />
              <span className="font-mono text-[11px] font-bold text-[#5C3D28] tabular-nums whitespace-nowrap">
                {Math.min(hud.totalEarned, hud.bannerGoal)}/{hud.bannerGoal}G
              </span>
              <div className="w-16 h-2 bg-[#D8C39E] border border-[#4A3121]">
                <div
                  className="h-full transition-all duration-150 bg-[#2E9E5B]"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center Contextual Prompt / Toast (kept inside top strip so it never covers canvas) */}
      <div className="flex-1 min-w-0 flex justify-center">
        {statusText && (
          <div
            className={`px-3 py-1 text-xs font-semibold truncate max-w-full ${
              hud.toastMessage
                ? 'pixel-panel-dark text-[#FFFDF7]'
                : 'pixel-panel text-[#231710]'
            }`}
          >
            {statusText}
          </div>
        )}
      </div>

      {/* Top-Right Gold, Stamina & Pause */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="pixel-panel px-2.5 py-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#E59A28] shrink-0" />
            <span className="font-mono text-xs font-bold text-[#231710] tabular-nums whitespace-nowrap">
              {hud.gold}G
            </span>
          </div>

          {hud.shippingCount > 0 && (
            <span className="border-l border-[#D8C39E] pl-2.5 font-mono text-xs font-bold text-[#2E9E5B] tabular-nums whitespace-nowrap">
              Bin +{hud.shippingValue}G ({hud.shippingCount})
            </span>
          )}

          <div className="border-l border-[#D8C39E] pl-2.5 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#E59A28] shrink-0" />
            <div className="w-20 h-2 bg-[#D8C39E] border border-[#4A3121]">
              <div
                className={`h-full transition-all duration-150 ${staminaColor}`}
                style={{ width: `${staminaPct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-bold text-[#231710] tabular-nums whitespace-nowrap">
              {hud.stamina}/{hud.maxStamina}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleQuests}
          aria-label="Quest Log"
          className="pixel-btn pixel-panel px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold text-[#231710] hover:bg-[#EAD8B6] cursor-pointer whitespace-nowrap"
        >
          <ScrollText className="w-3.5 h-3.5 text-[#5C3D28]" />
          <span>Quests</span>
        </button>

        <button
          type="button"
          onClick={onPause}
          aria-label="Pause Game"
          className="pixel-btn pixel-panel px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold text-[#231710] hover:bg-[#EAD8B6] cursor-pointer whitespace-nowrap"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
        </button>
      </div>
    </header>
  );
}

export function GameBottomBar({
  hud,
  onSelectSlot,
}: Pick<GameHudProps, 'hud' | 'onSelectSlot'>) {
  const [, setAssetsTick] = useState(0);
  useEffect(() => subscribeAssetsReady(() => setAssetsTick((n) => n + 1)), []);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [selectionPanelVisible, setSelectionPanelVisible] = useState(false);
  const [lastPanelText, setLastPanelText] = useState<string>('');
  const prevSelectedSlotRef = useRef<number>(hud.selectedSlot);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSelectionPanel = useCallback(() => {
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
    }
    setSelectionPanelVisible(true);
    selectionTimerRef.current = setTimeout(() => {
      setSelectionPanelVisible(false);
      selectionTimerRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    if (prevSelectedSlotRef.current !== hud.selectedSlot) {
      prevSelectedSlotRef.current = hud.selectedSlot;
      triggerSelectionPanel();
    }
  }, [hud.selectedSlot, triggerSelectionPanel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hud.phase !== 'PLAYING') return;
      if ((e.code >= 'Digit1' && e.code <= 'Digit9') || e.code === 'Digit0') {
        triggerSelectionPanel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, triggerSelectionPanel]);

  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
    };
  }, []);

  const displayedSlot =
    hoveredSlot !== null
      ? hud.quickBar[hoveredSlot]
      : selectionPanelVisible
        ? hud.quickBar[hud.selectedSlot]
        : null;
  const displayedItem = displayedSlot ? ITEMS[displayedSlot.itemId] : null;
  const panelVisible = Boolean(displayedSlot && displayedItem);
  const currentPanelText =
    displayedSlot && displayedItem
      ? `${displayedItem.name}${
          displayedSlot.itemId === 'watering_can'
            ? ` · Water ${displayedSlot.waterLevel ?? 0}/${WATERING_CAN_MAX}`
            : ` · ${displayedItem.description}`
        }`
      : '';

  useEffect(() => {
    if (currentPanelText) {
      setLastPanelText(currentPanelText);
    }
  }, [currentPanelText]);

  const activeWarningBottom =
    panelVisible && hud.pickupMessage
      ? 'bottom-[calc(100%+74px)]'
      : panelVisible || hud.pickupMessage
        ? 'bottom-[calc(100%+42px)]'
        : 'bottom-[calc(100%+8px)]';

  const activePickupBottom = panelVisible
    ? 'bottom-[calc(100%+42px)]'
    : 'bottom-[calc(100%+8px)]';

  return (
    <footer className="relative z-10 shrink-0 h-[52px] w-full bg-[#231710] border-t-2 border-[#4A3121]">
      <div
        data-testid="hotbar-container"
        onMouseLeave={() => setHoveredSlot(null)}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max"
      >
        {hud.warningMessage && (
          <div
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FEF3C7] border-2 border-[#C94A38] text-xs font-bold text-[#7A2318] shadow-md whitespace-nowrap ${activeWarningBottom}`}
          >
            {hud.warningMessage}
          </div>
        )}

        {hud.pickupMessage && (
          <div
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 pixel-panel-dark px-2.5 py-0.5 text-xs font-bold text-[#F7D259] whitespace-nowrap ${activePickupBottom}`}
          >
            {hud.pickupMessage}
          </div>
        )}

        <div
          data-testid="hotbar-description-panel"
          aria-hidden={!panelVisible}
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] pixel-panel-dark px-2.5 py-1 text-[11px] font-medium text-[#F4EAD5] whitespace-nowrap max-w-[calc(100vw-16px)] truncate transition-opacity duration-[120ms] ease-out ${
            panelVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {currentPanelText || lastPanelText}
        </div>

        <div data-testid="hotbar-slots" className="pixel-panel p-0.5 flex items-center gap-1">
          {hud.quickBar.map((slot, idx) => {
            const isSelected = idx === hud.selectedSlot;
            const keyLabel = idx === 9 ? '0' : String(idx + 1);
            const iconUrl = slot ? getItemIconUrl(slot.itemId) : null;
            return (
              <button
                key={idx}
                type="button"
                aria-label={slot ? ITEMS[slot.itemId].name : `Empty Slot ${keyLabel}`}
                onClick={() => {
                  triggerSelectionPanel();
                  onSelectSlot(idx);
                }}
                onMouseEnter={() => setHoveredSlot(idx)}
                onMouseLeave={() => setHoveredSlot((prev) => (prev === idx ? null : prev))}
                className={`relative w-10 h-10 flex items-center justify-center border-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#FFF5D6] border-[#C94A38] ring-1 ring-[#E59A28]'
                    : 'bg-[#E7D4B1] border-[#4A3121] hover:bg-[#EFE0C3]'
                }`}
              >
                <span className="absolute top-0 left-0.5 font-mono text-[9px] font-bold text-[#5C3D28] leading-none">
                  {keyLabel}
                </span>

                {slot && (
                  <>
                    {iconUrl && (
                      <img
                        src={iconUrl}
                        alt={ITEMS[slot.itemId].name}
                        className="w-8 h-8 pixelated"
                        draggable={false}
                      />
                    )}

                    {slot.count > 1 && (
                      <span className="absolute bottom-0 right-0.5 font-mono text-[10px] font-bold text-[#231710] bg-[#F4EAD5]/90 px-0.5 leading-tight tabular-nums">
                        {slot.count}
                      </span>
                    )}

                    {slot.itemId === 'watering_can' && (
                      <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-[#4A3121]">
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
    </footer>
  );
}

export function BannerCelebrationOverlay({
  hud,
  onDismissCelebration,
}: Pick<GameHudProps, 'hud' | 'onDismissCelebration'>) {
  if (!hud.bannerCelebrationVisible) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center p-4">
      <div className="pointer-events-auto pixel-panel px-6 py-4 flex items-center gap-5 max-w-lg">
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
    </div>
  );
}
