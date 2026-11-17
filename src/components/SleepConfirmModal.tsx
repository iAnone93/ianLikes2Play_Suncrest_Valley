interface SleepConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function SleepConfirmModal({ onConfirm, onCancel }: SleepConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4 pointer-events-auto">
      <div className="pixel-panel w-full max-w-sm p-6 flex flex-col gap-4 text-center">
        <h2
          className="text-xl font-bold text-[#231710]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Sleep Until Morning?
        </h2>
        <p className="text-xs text-[#5C3D28]">
          Your stamina will be restored to 100%, watered crops will grow, and any shipped produce will be tallied.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="pixel-btn flex-1 py-2.5 bg-[#E7D4B1] hover:bg-[#DEC497] text-xs font-bold text-[#231710] cursor-pointer"
          >
            Keep Farming
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="pixel-btn flex-1 py-2.5 bg-[#2E9E5B] hover:bg-[#27894E] text-xs font-bold text-[#FFFDF7] cursor-pointer"
          >
            Sleep
          </button>
        </div>
      </div>
    </div>
  );
}
