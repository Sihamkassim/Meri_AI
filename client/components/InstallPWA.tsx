'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('PWA install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (error) {
        console.error('Install prompt error:', error);
      }
    } else {
      // Show manual install instructions
      setShowInstructions(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-white/90 font-medium px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-xl shadow-slate-900/20 transition-all duration-300 hover:scale-105 active:scale-95 group"
        aria-label="Install App"
      >
        <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
        <span className="text-sm">Install App</span>
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">Install ASTU Route AI</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">To install this app:</p>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-emerald-600 mb-2">Chrome/Edge (Desktop):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the install icon in the address bar</li>
                  <li>Or go to Menu (⋮) → Install መሪ</li>
                </ol>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-emerald-600 mb-2">Chrome (Android):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap Menu (⋮) → Add to Home screen</li>
                </ol>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-emerald-600 mb-2">Safari (iOS):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap Share button (□↑)</li>
                  <li>Scroll and tap "Add to Home Screen"</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
