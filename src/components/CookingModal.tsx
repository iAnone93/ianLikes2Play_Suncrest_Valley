import { useEffect, useState } from 'react';
import { Flame, Soup, X } from 'lucide-react';
import { getItemIconUrl, subscribeAssetsReady } from '../game/assets';
import type { CookingStationSnapshot, DishItemId } from '../game/types';

interface CookingModalProps {
  station: CookingStationSnapshot;
  onCook: (dishId: DishItemId) => void;
  onClose: () => void;
}

export function CookingModal({ station, onCook, onClose }: CookingModalProps) {
  const [, setAssetsTick] = useState(0);
  useEffect(() => subscribeAssetsReady(() => setAssetsTick((n) => n + 1)), []);

  const isErrorFeedback =
    station.feedbackMessage?.toLowerCase().includes('full') ||
    station.feedbackMessage?.toLowerCase().includes('need');

  return (
    <div
      data-testid="cooking-modal"
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4 pointer-events-auto"
    >
      <div className="pixel-panel w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-2 border-[#D8C39E] pb-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-[#C94A38] shrink-0" />
            <div>
              <h2
                className="text-xl font-bold text-[#231710]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {station.modalTitle}
              </h2>
              <p className="text-xs text-[#5C3D28]">{station.modalSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cooking Menu"
            className="pixel-btn p-1.5 bg-[#E7D4B1] hover:bg-[#DEC497] text-[#231710] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {station.feedbackMessage && (
          <div
            data-testid="cooking-feedback"
            className={`px-3 py-2 border-2 text-xs font-bold ${
              isErrorFeedback
                ? 'bg-[#F7DFDA] border-[#C94A38] text-[#7A2318]'
                : 'bg-[#E6F4EA] border-[#2E9E5B] text-[#1F7A44]'
            }`}
          >
            {station.feedbackMessage}
          </div>
        )}

        <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
          {station.recipes.map((recipe) => {
            const iconUrl = getItemIconUrl(recipe.id);
            return (
              <div
                key={recipe.id}
                data-testid={`recipe-row-${recipe.id}`}
                data-craftable={recipe.canCraft ? 'true' : 'false'}
                className={`flex items-center justify-between gap-3 p-3 border-2 transition-opacity ${
                  recipe.canCraft
                    ? 'bg-[#EAD8B6] border-[#4A3121]'
                    : 'bg-[#DFCCA6] border-[#7C6348] opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 bg-[#F4EAD5] border-2 border-[#4A3121] flex items-center justify-center shrink-0">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={recipe.name}
                        className="w-8 h-8 pixelated"
                        draggable={false}
                      />
                    ) : (
                      <Soup className="w-5 h-5 text-[#5C3D28]" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-[#231710]">{recipe.name}</span>
                    <span className="text-xs text-[#5C3D28] font-mono tabular-nums">
                      +{recipe.staminaRestore} Stamina · Sells for {recipe.sellPrice}G
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {recipe.ingredients.map((ing) => (
                        <span
                          key={ing.itemId}
                          data-testid={`ingredient-${recipe.id}-${ing.itemId}`}
                          data-missing={ing.missing ? 'true' : 'false'}
                          className={`px-1.5 py-0.5 border text-[11px] font-mono font-bold tabular-nums ${
                            ing.missing
                              ? 'bg-[#FEF2F2] border-[#C94A38] text-[#C94A38]'
                              : 'bg-[#E6F4EA] border-[#2E9E5B]/60 text-[#1F7A44]'
                          }`}
                        >
                          {ing.name} {ing.have}/{ing.need}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`cook-btn-${recipe.id}`}
                  disabled={!recipe.canCraft}
                  onClick={() => onCook(recipe.id)}
                  className="pixel-btn px-3.5 py-1.5 text-xs font-bold bg-[#2E9E5B] hover:bg-[#27894E] disabled:bg-[#9D9385] disabled:text-[#EFE8DC] disabled:cursor-not-allowed text-[#FFFDF7] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cook
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn px-4 py-2 bg-[#E7D4B1] hover:bg-[#DEC497] text-xs font-bold text-[#231710] cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>
      </div>
    </div>
  );
}
