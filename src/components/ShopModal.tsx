import { X, Coins } from 'lucide-react';
import { CROPS, SHOP_CATALOG } from '../game/constants';
import { getSpriteAtlas } from '../game/pixelSprites';
import type { CropId } from '../game/types';

interface ShopModalProps {
  gold: number;
  onBuy: (cropId: CropId, quantity: number) => void;
  onClose: () => void;
}

export function ShopModal({ gold, onBuy, onClose }: ShopModalProps) {
  const atlas = getSpriteAtlas();

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4 pointer-events-auto">
      <div className="pixel-panel w-full max-w-lg p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b-2 border-[#D8C39E] pb-3">
          <div>
            <h2
              className="text-xl font-bold text-[#231710]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Spring Seed Stall
            </h2>
            <p className="text-xs text-[#5C3D28]">
              Water planted seeds daily so they mature on schedule.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#231710] tabular-nums">
              <Coins className="w-4 h-4 text-[#E59A28]" />
              <span>{gold}G</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Shop"
              className="pixel-btn p-1.5 bg-[#E7D4B1] hover:bg-[#DEC497] text-[#231710] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {SHOP_CATALOG.map((cropId) => {
            const crop = CROPS[cropId];
            const canBuy1 = gold >= crop.seedCost;
            const canBuy5 = gold >= crop.seedCost * 5;
            return (
              <div
                key={cropId}
                className="flex items-center justify-between gap-4 p-3 bg-[#EAD8B6] border-2 border-[#4A3121]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#F4EAD5] border-2 border-[#4A3121] flex items-center justify-center shrink-0">
                    <img
                      src={atlas.itemIcons[crop.seedId]}
                      alt={crop.seedName}
                      className="w-8 h-8 pixelated"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#231710]">
                      {crop.seedName}
                    </span>
                    <span className="text-xs text-[#5C3D28]">
                      Grows in {crop.growDays} watered days · Sells for {crop.sellPrice}G
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!canBuy1}
                    onClick={() => onBuy(cropId, 1)}
                    className="pixel-btn px-3 py-1.5 text-xs font-bold bg-[#2E9E5B] hover:bg-[#27894E] disabled:bg-[#9D9385] disabled:cursor-not-allowed text-[#FFFDF7] font-mono tabular-nums cursor-pointer whitespace-nowrap"
                  >
                    Buy 1 · {crop.seedCost}G
                  </button>
                  <button
                    type="button"
                    disabled={!canBuy5}
                    onClick={() => onBuy(cropId, 5)}
                    className="pixel-btn px-3 py-1.5 text-xs font-bold bg-[#E59A28] hover:bg-[#CE881E] disabled:bg-[#9D9385] disabled:cursor-not-allowed text-[#231710] font-mono tabular-nums cursor-pointer whitespace-nowrap"
                  >
                    Buy 5 · {crop.seedCost * 5}G
                  </button>
                </div>
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
            Done Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
