/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { CookingModal } from './components/CookingModal';
import { DaySummaryModal } from './components/DaySummaryModal';
import { DialogueBox } from './components/DialogueBox';
import {
  BannerCelebrationOverlay,
  GameBottomBar,
  GameTopBar,
} from './components/GameHud';
import { PauseModal } from './components/PauseModal';
import { QuestLogModal } from './components/QuestLogModal';
import { SeasonEndModal } from './components/SeasonEndModal';
import { ShopModal } from './components/ShopModal';
import { SleepConfirmModal } from './components/SleepConfirmModal';
import { TitleScreen } from './components/TitleScreen';
import { SuncrestEngine } from './game/engine';
import { loadAutoSave } from './game/save';
import type { CropId, HudSnapshot, Stage1SaveData } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SuncrestEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new SuncrestEngine();
  }

  const [hud, setHud] = useState<HudSnapshot>(() => engineRef.current!.getHudSnapshot());
  const [existingSave, setExistingSave] = useState<Stage1SaveData | null>(() => loadAutoSave());

  useEffect(() => {
    const engine = engineRef.current!;
    const unsubscribe = engine.subscribe((snapshot) => {
      setHud(snapshot);
    });

    const canvas = canvasRef.current;
    if (canvas) {
      engine.attachCanvas(canvas);
    }

    const handleResize = () => engine.resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
      engine.detachCanvas();
    };
  }, []);

  useEffect(() => {
    if (hud.phase === 'TITLE') {
      setExistingSave(loadAutoSave());
    }
  }, [hud.phase]);

  useEffect(() => {
    engineRef.current?.resizeCanvas();
  }, [hud.phase]);

  const handleStartNew = () => {
    engineRef.current?.startNewGame();
  };

  const handleContinue = () => {
    const loaded = engineRef.current?.continueSavedGame();
    if (!loaded) {
      engineRef.current?.startNewGame();
    }
  };

  const handleBuySeed = (cropId: CropId, quantity: number) => {
    engineRef.current?.buySeed(cropId, quantity);
  };

  return (
    <main className="relative flex flex-col w-screen h-screen overflow-hidden bg-[#1D3319]">
      {hud.phase !== 'TITLE' && (
        <GameTopBar
          hud={hud}
          onPause={() => engineRef.current?.togglePause()}
          onToggleQuests={() => engineRef.current?.toggleQuestLog()}
        />
      )}

      {/* Isolated Canvas Layer */}
      <div className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="block w-full h-full pixelated cursor-crosshair" />
      </div>

      {hud.phase !== 'TITLE' && (
        <GameBottomBar
          hud={hud}
          onSelectSlot={(idx) => engineRef.current?.selectQuickSlot(idx)}
        />
      )}

      {/* Game Shell Overlays */}
      {hud.phase === 'TITLE' && (
        <TitleScreen
          existingSave={existingSave}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
        />
      )}

      {hud.phase !== 'TITLE' && (
        <BannerCelebrationOverlay
          hud={hud}
          onDismissCelebration={() => engineRef.current?.dismissBannerCelebration()}
        />
      )}

      {hud.phase === 'SHOP' && (
        <ShopModal
          gold={hud.gold}
          onBuy={handleBuySeed}
          onClose={() => engineRef.current?.closeModal()}
        />
      )}

      {hud.phase === 'COOKING' && hud.cookingStation && (
        <CookingModal
          station={hud.cookingStation}
          onCook={(dishId) => engineRef.current?.cookRecipe(dishId)}
          onClose={() => engineRef.current?.closeModal()}
        />
      )}

      {hud.phase === 'SLEEP_CONFIRM' && (
        <SleepConfirmModal
          onConfirm={() => engineRef.current?.confirmSleep()}
          onCancel={() => engineRef.current?.closeModal()}
        />
      )}

      {hud.phase === 'DAY_SUMMARY' && hud.daySummary && (
        <DaySummaryModal
          summary={hud.daySummary}
          onNextDay={() => engineRef.current?.advanceFromDaySummary()}
        />
      )}

      {hud.phase === 'SEASON_END' && hud.seasonSummary && (
        <SeasonEndModal
          summary={hud.seasonSummary}
          onContinue={() => engineRef.current?.advanceFromSeasonEnd()}
        />
      )}

      {hud.phase === 'DIALOGUE' && hud.dialogue && (
        <DialogueBox
          dialogue={hud.dialogue}
          onAdvance={() => engineRef.current?.advanceDialogue()}
          onClose={() => engineRef.current?.closeDialogue()}
        />
      )}

      {hud.phase === 'QUEST_LOG' && (
        <QuestLogModal
          quests={hud.quests}
          onClose={() => engineRef.current?.closeModal()}
        />
      )}

      {hud.phase === 'PAUSED' && (
        <PauseModal
          onResume={() => engineRef.current?.closeModal()}
          onReturnTitle={() => engineRef.current?.returnToTitle()}
          onResetFarm={() => engineRef.current?.startNewGame()}
        />
      )}
    </main>
  );
}
