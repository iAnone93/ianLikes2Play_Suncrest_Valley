/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { DaySummaryModal } from './components/DaySummaryModal';
import { GameHud } from './components/GameHud';
import { PauseModal } from './components/PauseModal';
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
    <main className="relative w-screen h-screen overflow-hidden bg-[#1D3319]">
      {/* Isolated Canvas Layer */}
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block w-full h-full pixelated cursor-crosshair" />
      </div>

      {/* Game Shell Overlays */}
      {hud.phase === 'TITLE' && (
        <TitleScreen
          existingSave={existingSave}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
        />
      )}

      {hud.phase !== 'TITLE' && (
        <GameHud
          hud={hud}
          onSelectSlot={(idx) => engineRef.current?.selectQuickSlot(idx)}
          onPause={() => engineRef.current?.togglePause()}
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
