'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPWAProps {
  showOnlyOnHome?: boolean;
  currentRoute?: string;
}

export default function InstallPWA({ showOnlyOnHome = true, currentRoute = 'home' }: InstallPWAProps) {
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

  // Hide if installed or if showOnlyOnHome is true and not on home route
  if (isInstalled || (showOnlyOnHome && currentRoute !== '/')) return null;

  return (
    <>
      {/* Floating Install Button - Icon Only with Emerald Theme */}
      <button
        onClick={handleInstallClick}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full backdrop-blur-md shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group flex items-center justify-center animate-bounce-slow"
        aria-label="Install App"
        title="Install ASTU Route AI"
      >
        <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        
        {/* Pulse Ring */}
        <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-50" />
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">Install <span className="text-emerald-600">ASTU Route AI</span></h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">To install this app:</p>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="font-semibold text-emerald-700 mb-2">Chrome/Edge (Desktop):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the install icon in the address bar</li>
                  <li>Or go to Menu (⋮) → Install Meri AI</li>
                </ol>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="font-semibold text-emerald-700 mb-2">Chrome (Android):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap Menu (⋮) → Add to Home screen</li>
                </ol>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <p className="font-semibold text-emerald-700 mb-2">Safari (iOS):</p>
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
