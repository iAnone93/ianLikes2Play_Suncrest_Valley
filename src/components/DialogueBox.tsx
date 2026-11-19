import { useEffect, useRef, useState } from 'react';
import {
  getLoadedSpriteSheets,
  getPortraitFrameIndex,
  subscribeAssetsReady,
} from '../game/assets';
import type { ActiveDialogueSnapshot } from '../game/types';

interface DialogueBoxProps {
  dialogue: ActiveDialogueSnapshot;
  onAdvance: () => void;
  onClose: () => void;
  viewportWidth?: number;
}

const CHARS_PER_SEC = 48;
const NARROW_VIEWPORT_BREAKPOINT = 720;

export function DialogueBox({
  dialogue,
  onAdvance,
  onClose,
  viewportWidth,
}: DialogueBoxProps) {
  const line = dialogue.lines[dialogue.lineIndex];
  const [visibleChars, setVisibleChars] = useState(0);
  const [, setAssetsTick] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => subscribeAssetsReady(() => setAssetsTick((n) => n + 1)), []);

  useEffect(() => {
    if (viewportWidth !== undefined || typeof window === 'undefined') return;
    const handleResize = () => setMeasuredWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewportWidth]);

  useEffect(() => {
    setVisibleChars(0);
    if (!line) return;
    const total = line.text.length;
    const stepMs = Math.max(12, Math.floor(1000 / CHARS_PER_SEC));
    const timer = setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= total) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [dialogue.npcId, dialogue.lineIndex, line?.text]);

  const isFullyRevealed = !line || visibleChars >= line.text.length;

  const handleInteract = () => {
    if (!line) return;
    if (!isFullyRevealed) {
      setVisibleChars(line.text.length);
      return;
    }
    onAdvance();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!line) return;
        if (visibleChars < line.text.length) {
          setVisibleChars(line.text.length);
        } else {
          onAdvance();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [line, visibleChars, onAdvance, onClose]);

  const effectiveWidth = viewportWidth ?? measuredWidth;
  const isNarrow = effectiveWidth < NARROW_VIEWPORT_BREAKPOINT;
  const hasPortrait = Boolean(line?.portraitSheet && line?.portraitKey);
  const basePortraitSize = Math.max(1, Math.round(line?.portraitSize ?? 96));
  const portraitScale = isNarrow ? 1 : 2;
  const portraitDisplaySize = basePortraitSize * portraitScale;
  const tabFontSizePx = isNarrow ? 16 : 18;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !line || !hasPortrait || !line.portraitKey) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheets = getLoadedSpriteSheets();
    const img =
      line.portraitKey === 'player'
        ? sheets.farmerPortraits
        : sheets.npcPortraitSheets[line.portraitKey];
    const manifest =
      line.portraitKey === 'player'
        ? sheets.farmerPortraitsManifest
        : sheets.npcPortraitManifests[line.portraitKey];

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, portraitDisplaySize, portraitDisplaySize);

    if (!img || !manifest) return;

    const frameIdx = getPortraitFrameIndex(manifest, line.expression);
    const frameW = Math.round(manifest.frameWidth);
    const frameH = Math.round(manifest.frameHeight);
    ctx.drawImage(
      img,
      frameIdx * frameW,
      0,
      frameW,
      frameH,
      0,
      0,
      portraitDisplaySize,
      portraitDisplaySize,
    );
  });

  if (!line) return null;

  const displayedText = line.text.slice(0, visibleChars);
  const portraitLeftPx = 16;
  const textAreaPaddingLeftPx = hasPortrait ? portraitDisplaySize + 16 : 0;
  const tabLeftPx = hasPortrait ? portraitLeftPx + portraitDisplaySize + 16 : -3;

  return (
    <div
      data-testid="dialogue-overlay"
      className="fixed inset-x-0 bottom-[60px] z-30 flex justify-center px-4 pointer-events-none"
    >
      <div
        data-testid="dialogue-box"
        data-has-portrait={hasPortrait ? 'true' : 'false'}
        data-portrait-scale={hasPortrait ? String(portraitScale) : '0'}
        onClick={handleInteract}
        className="relative w-full max-w-5xl pixel-panel p-4 min-h-[120px] flex flex-col justify-between pointer-events-auto cursor-pointer"
      >
        <div
          data-testid="dialogue-name-tab"
          className="absolute bottom-[calc(100%-2px)] z-10 inline-flex items-center justify-center min-w-[96px] py-[6px] px-[20px] bg-[#f4ead5] border-[3px] border-b-0 border-[#4a3121] font-bold text-[#4a3121] text-center leading-tight whitespace-nowrap"
          style={{
            left: `${tabLeftPx}px`,
            fontSize: `${tabFontSizePx}px`,
            letterSpacing: '0.02em',
            boxShadow: 'inset 2px 2px 0 #d8c39e, inset -2px 0 0 #d8c39e',
          }}
        >
          {line.speakerName}
        </div>

        {hasPortrait && (
          <canvas
            ref={canvasRef}
            data-testid="dialogue-portrait-canvas"
            width={portraitDisplaySize}
            height={portraitDisplaySize}
            className="absolute bottom-0 left-4 z-20 block pixelated pointer-events-none"
            style={{
              width: `${portraitDisplaySize}px`,
              height: `${portraitDisplaySize}px`,
              filter: 'drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35))',
            }}
          />
        )}

        <div
          data-testid="dialogue-text-area"
          className="flex-1 flex flex-col justify-between gap-3 min-h-[88px]"
          style={{ paddingLeft: `${textAreaPaddingLeftPx}px` }}
        >
          <div className="grid">
            <p
              data-testid="dialogue-text-reserve"
              aria-hidden="true"
              className="col-start-1 row-start-1 invisible text-sm sm:text-base leading-relaxed font-medium break-words select-none pointer-events-none"
            >
              {line.text}
            </p>
            <p
              data-testid="dialogue-visible-text"
              className="col-start-1 row-start-1 text-sm sm:text-base leading-relaxed font-medium text-[#231710] break-words"
            >
              {displayedText}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] text-[#5C3D28]">
            <span className="font-mono tabular-nums">
              {dialogue.lineIndex + 1}/{dialogue.lines.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInteract();
              }}
              className="pixel-btn px-3 py-1 bg-[#E7D4B1] hover:bg-[#DEC497] text-xs font-bold text-[#231710] cursor-pointer shrink-0"
            >
              {isFullyRevealed ? 'Continue [E]' : 'Skip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
