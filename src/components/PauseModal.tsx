interface PauseModalProps {
  onResume: () => void;
  onReturnTitle: () => void;
  onResetFarm: () => void;
}

export function PauseModal({ onResume, onReturnTitle, onResetFarm }: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 pointer-events-auto">
      <div className="pixel-panel w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="text-center border-b-2 border-[#D8C39E] pb-3">
          <h2
            className="text-xl font-bold text-[#231710]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Game Paused
          </h2>
        </div>

        <div className="text-xs text-[#5C3D28] bg-[#EAD8B6] border border-[#C6AF88] p-3 flex flex-col gap-1">
          <div className="font-bold text-[#231710]">Controls</div>
          <div>WASD / Arrows · Move Farmer</div>
          <div>Space / E / Click · Use Tool, Talk, or Interact</div>
          <div>1–0 / Mouse Wheel · Select Quick Slot</div>
          <div>Q · Village Quests</div>
          <div>Esc · Pause / Close Window</div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="pixel-btn w-full py-2.5 bg-[#2E9E5B] hover:bg-[#27894E] text-sm font-semibold text-[#FFFDF7] cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="pixel-btn w-full py-2.5 bg-[#E7D4B1] hover:bg-[#DEC497] text-sm font-semibold text-[#231710] cursor-pointer"
          >
            Save & Title Screen
          </button>
          <button
            type="button"
            onClick={onResetFarm}
            className="pixel-btn w-full py-2 bg-[#F7DFDA] hover:bg-[#F0C7BE] text-xs font-bold text-[#7A2318] cursor-pointer"
          >
            Reset Farm (New Day 1)
          </button>
        </div>
      </div>
    </div>
  );
}
