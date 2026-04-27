import React, { useState, useEffect, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Share, PlusSquare, MoreVertical, Compass, Download } from 'lucide-react';

interface PWAGatekeeperProps {
  children: ReactNode;
}

export function PWAGatekeeper({ children }: PWAGatekeeperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default to true to prevent flash
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if user previously skipped the gatekeeper
    const hasSkipped = localStorage.getItem('figment-pwa-skipped') === 'true';
    if (hasSkipped) {
      setIsStandalone(true);
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        console.log('SW Ready:', reg.scope);
      }).catch(err => {
        console.log('SW Error:', err.message);
      });
    }

    // Detect mobile
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsMobile(isIOSDevice || isAndroidDevice);
    setIsIOS(isIOSDevice);

    // Detect standalone
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // If we're already running in standalone, no need to do anything else here
    if (isStandaloneMode) return;

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    // Listen for beforeinstallprompt on Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleCustomPrompt = (e: any) => {
      setDeferredPrompt(e.detail);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handleCustomPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handleCustomPrompt);
    };
  }, []);

  const handleSkip = () => {
    localStorage.setItem('figment-pwa-skipped', 'true');
    setIsStandalone(true);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      handleSkip();
    }
  };

  // Don't render anything until we've checked the environment
  if (!isMounted) return null;

  // If already installed, show the app
  if (isStandalone) {
    return <>{children}</>;
  }

  // Otherwise, show the gatekeeper
  return (
    <div className="fixed inset-0 z-[9999] bg-system-background flex flex-col items-center justify-center p-6 text-label">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-sm flex flex-col items-center text-center relative"
      >
        <div className="absolute top-4 right-4 z-10 w-full flex justify-end mb-4 pr-1">
          <button 
             onClick={handleSkip}
             className="text-secondary-label bg-secondary-system-background px-3 py-1.5 rounded-full text-sm font-medium border border-separator/20 hover:opacity-80"
          >
            Skip for now
          </button>
        </div>
        <img src="/icon-pwa-192.png" alt="Figment" className="w-24 h-24 rounded-[1.25rem] shadow-md border border-separator/10 mt-8 mb-5" />
        <h1 className="text-3xl font-serif font-bold mb-3 tracking-tight">Install Figment</h1>
        <p className="text-secondary-label mb-8 leading-relaxed">
          For the best experience, please install Figment to your home screen.
        </p>

        {isIOS ? (
          <div className="w-full text-left bg-secondary-system-background/50 p-6 rounded-2xl border border-separator/50 shadow-sm">
            <ol className="space-y-6 text-label font-medium">
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-label text-system-background text-sm font-bold shrink-0 mt-0.5">1</span>
                <span className="leading-snug">Open this page in Safari. <br/><span className="text-sm font-normal text-secondary-label">If you are using Chrome or another browser, you must open it in Safari first.</span> <Compass className="inline-block w-5 h-5 mx-1 text-ios-blue" /></span>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-label text-system-background text-sm font-bold shrink-0 mt-0.5">2</span>
                <span className="leading-snug">Tap the Share icon at the bottom. <Share className="inline-block w-5 h-5 mx-1 text-ios-blue" /></span>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-label text-system-background text-sm font-bold shrink-0 mt-0.5">3</span>
                <span className="leading-snug">Scroll down and tap <br/><span className="flex items-center gap-2 mt-2 text-ios-blue bg-blue-500/10 px-3 py-1.5 rounded-lg w-fit"><PlusSquare className="w-5 h-5" /> Add to Home Screen</span></span>
              </li>
            </ol>
            <button
              onClick={handleSkip}
              className="w-full mt-6 py-4 px-6 bg-secondary-system-background text-label rounded-full font-bold text-lg hover:opacity-90 transition-opacity border border-separator/20"
            >
              Continue in Browser
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-4 px-6 bg-label text-system-background rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Install Figment
              </button>
            ) : (
              <div className="w-full text-left bg-secondary-system-background/50 p-6 rounded-2xl border border-separator/50 shadow-sm">
                <ol className="space-y-6 text-label font-medium mb-4">
                  <li className="flex items-start gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-label text-system-background text-sm font-bold shrink-0 mt-0.5">1</span>
                    <span className="leading-snug">Tap the <MoreVertical className="inline-block w-5 h-5 mx-0.5" /> <strong>Menu</strong> icon in your browser (usually top right).</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-label text-system-background text-sm font-bold shrink-0 mt-0.5">2</span>
                    <span className="leading-snug">Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                  </li>
                </ol>
                <div className="text-xs text-secondary-label mt-2 px-2 border-l-2 border-orange-500/50">
                  Note: If you have already installed Figment, or are accessing via an embedded browser, automatic installation may be blocked.
                </div>
              </div>
            )}
            
            <button
              onClick={handleSkip}
              className="w-full py-4 px-6 bg-secondary-system-background text-label rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Continue in Browser
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

