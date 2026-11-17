import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'inline' | 'banner' }> = ({ variant = 'inline' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'banner'
            ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#143325] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="h-3.5 w-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C0] bg-white px-3 py-2 text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" />
          Install App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E6DFD1]">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#1C241E]">
                  Install LORAKU DRY FRUITS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#5A655D] hover:bg-[#F3EFE6] cursor-pointer"
                  aria-label="Close instructions"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#424C45]">
                <li>1. Tap the <strong>Share</strong> button in your Safari toolbar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to install on your phone.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#1B4332] py-2.5 text-sm font-medium text-white hover:bg-[#143325] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
