import { useEffect, useRef, useState } from 'react';
import { Check, ScrollText, X } from 'lucide-react';
import {
  getLoadedSpriteSheets,
  getPortraitFrameIndex,
  subscribeAssetsReady,
} from '../game/assets';
import { ITEMS } from '../game/constants';
import type { ItemId, NpcId, QuestSummaryItem } from '../game/types';

interface QuestLogModalProps {
  quests: QuestSummaryItem[];
  onClose: () => void;
}

const PORTRAIT_BADGE_SIZE = 48;

function getProgressItemLabel(itemId: ItemId): string {
  if (itemId === 'turnip') return 'Turnips';
  return ITEMS[itemId].name;
}

function formatRewardLabel(q: QuestSummaryItem): string {
  if (q.rewardItem) {
    return `${q.rewardItem.count} ${ITEMS[q.rewardItem.itemId].name}`;
  }
  return `${q.rewardGold ?? 0}G`;
}

function PortraitBadge({
  portraitKey,
  label,
}: {
  portraitKey: NpcId | 'player';
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setAssetsTick] = useState(0);

  useEffect(() => subscribeAssetsReady(() => setAssetsTick((n) => n + 1)), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheets = getLoadedSpriteSheets();
    const img =
      portraitKey === 'player'
        ? sheets.farmerPortraits
        : sheets.npcPortraitSheets[portraitKey];
    const manifest =
      portraitKey === 'player'
        ? sheets.farmerPortraitsManifest
        : sheets.npcPortraitManifests[portraitKey];

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, PORTRAIT_BADGE_SIZE, PORTRAIT_BADGE_SIZE);
    if (!img || !manifest) return;

    const frameIdx = getPortraitFrameIndex(manifest, 'neutral');
    ctx.drawImage(
      img,
      frameIdx * manifest.frameWidth,
      0,
      manifest.frameWidth,
      manifest.frameHeight,
      0,
      0,
      PORTRAIT_BADGE_SIZE,
      PORTRAIT_BADGE_SIZE,
    );
  });

  return (
    <div className="bg-[#E7D4B1] border-2 border-[#4A3121] shrink-0">
      <canvas
        ref={canvasRef}
        aria-label={label}
        width={PORTRAIT_BADGE_SIZE}
        height={PORTRAIT_BADGE_SIZE}
        className="block pixelated"
        style={{ width: `${PORTRAIT_BADGE_SIZE}px`, height: `${PORTRAIT_BADGE_SIZE}px` }}
      />
    </div>
  );
}

export function QuestLogModal({ quests, onClose }: QuestLogModalProps) {
  return (
    <div
      data-testid="quest-log-modal"
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 pointer-events-auto"
    >
      <div className="pixel-panel w-full max-w-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-2 border-[#D8C39E] pb-3">
          <div className="flex items-center gap-3">
            <PortraitBadge portraitKey="player" label="Farmer Portrait" />
            <div>
              <h2
                className="text-lg font-bold text-[#231710] flex items-center gap-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <ScrollText className="w-4 h-4 text-[#E59A28]" />
                <span>Village Requests</span>
              </h2>
              <p className="text-xs text-[#5C3D28]">
                Talk to Suncrest villagers to accept and turn in homestead tasks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quest Log"
            className="pixel-btn p-1.5 bg-[#E7D4B1] hover:bg-[#DEC497] text-[#231710] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
          {quests.map((q) => {
            const progressLabel = getProgressItemLabel(q.requiredItemId);
            const progressCount = Math.min(q.currentCount, q.requiredCount);
            const isReady = q.status === 'ready' || (q.status === 'active' && q.currentCount >= q.requiredCount);

            let statusText: string;
            if (q.status === 'not_started') {
              statusText = `Talk to ${q.npcName}`;
            } else if (q.status === 'completed') {
              statusText = 'Completed';
            } else {
              statusText = `${progressLabel} ${progressCount}/${q.requiredCount}`;
            }

            return (
              <div
                key={q.npcId}
                data-testid={`quest-row-${q.npcId}`}
                className="border-2 border-[#4A3121] bg-[#EAD8B6] p-3 flex items-start gap-3"
              >
                <PortraitBadge portraitKey={q.npcId} label={`${q.npcName} Portrait`} />

                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#231710]">{q.npcName}</div>
                      <div className="text-[11px] font-medium text-[#5C3D28]">{q.npcRole}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 border text-[11px] font-bold whitespace-nowrap ${
                        q.status === 'completed'
                          ? 'bg-[#E6F4EA] border-[#2E9E5B] text-[#1F7A44]'
                          : isReady
                            ? 'bg-[#FEF3C7] border-[#E59A28] text-[#92400E]'
                            : q.status === 'active'
                              ? 'bg-[#FFFDF7] border-[#4A3121] text-[#231710]'
                              : 'bg-[#DFCCA6] border-[#8A6B4A] text-[#5C3D28]'
                      }`}
                    >
                      {q.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3 h-3" strokeWidth={3} />
                          Completed
                        </span>
                      ) : isReady ? (
                        'Ready'
                      ) : q.status === 'active' ? (
                        'Active'
                      ) : (
                        'Not Started'
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#3A2619]">
                    {q.status === 'not_started' ? `Talk to ${q.npcName}` : q.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#5C3D28] pt-1 border-t border-[#D8C39E]">
                    <span>{statusText}</span>
                    <span className="text-[#2E9E5B]">Reward: {formatRewardLabel(q)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn px-4 py-1.5 bg-[#2E9E5B] hover:bg-[#27894E] text-xs font-semibold text-[#FFFDF7] cursor-pointer"
          >
            Close [Q]
          </button>
        </div>
      </div>
    </div>
  );
}
