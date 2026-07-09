import { useEffect, useRef } from 'react';

export interface BackGestureLayer {
  /** Whether this overlay is currently open. */
  isOpen: boolean;
  /** Close just this overlay. */
  close: () => void;
}

/**
 * Makes the Android/browser back gesture (and iOS edge-swipe) close the
 * top-most open overlay instead of leaving the site. Router-less SPAs have no
 * history entry for an open sheet/modal, so back would otherwise exit — the
 * #1 mobile-feel bug on this kind of app.
 *
 * Pass overlays in priority order (top-most first). While any is open we hold a
 * single sentinel history entry; each back press closes the current top-most
 * layer and re-arms the sentinel if others remain open.
 *
 * Desktop is unaffected — callers only enable this on mobile.
 */
export function useBackGesture(enabled: boolean, layers: BackGestureLayer[]): void {
  // Keep the latest layers in a ref so the popstate listener stays stable and
  // always sees current open-state without re-subscribing every render.
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const guardArmedRef = useRef(false);

  const anyOpen = enabled && layers.some(l => l.isOpen);

  // Arm the sentinel the moment the first overlay opens.
  useEffect(() => {
    if (anyOpen && !guardArmedRef.current) {
      window.history.pushState({ mtrhOverlayGuard: true }, '');
      guardArmedRef.current = true;
    }
  }, [anyOpen]);

  useEffect(() => {
    if (!enabled) return;

    const onPopState = () => {
      const open = layersRef.current.filter(l => l.isOpen);
      if (open.length === 0) {
        guardArmedRef.current = false;
        return;
      }
      // Close the top-most (highest priority) open overlay.
      open[0].close();
      if (open.length > 1) {
        // Others remain — re-arm the sentinel so the next back press is caught.
        window.history.pushState({ mtrhOverlayGuard: true }, '');
      } else {
        guardArmedRef.current = false;
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [enabled]);
}
