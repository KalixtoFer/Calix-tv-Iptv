import { useEffect, useCallback } from 'react';

export type RemoteKey =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'OK'
  | 'BACK'
  | 'PLAY_PAUSE'
  | 'CH_UP'
  | 'CH_DOWN'
  | 'VOL_UP'
  | 'VOL_DOWN'
  | 'MUTE'
  | 'FULLSCREEN'
  | 'INFO'
  | 'RED'
  | 'GREEN'
  | 'YELLOW'
  | 'BLUE'
  | 'HOME';

interface RemoteHandlerOptions {
  onKey?: (key: RemoteKey, e?: KeyboardEvent) => boolean | void; // return true to prevent default spatial navigation
  enableSpatialNav?: boolean;
}

export function useRemoteControl(options: RemoteHandlerOptions = {}) {
  const { onKey, enableSpatialNav = true } = options;

  const handleSpatialNavigation = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), .tv-focusable'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
    });

    if (focusable.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    if (!current || !focusable.includes(current)) {
      focusable[0].focus();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestElement: HTMLElement | null = null;
    let minDistance = Infinity;

    focusable.forEach((el) => {
      if (el === current) return;
      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      // Filter by direction
      let isValidDirection = false;
      if (direction === 'UP' && dy < -5) isValidDirection = true;
      if (direction === 'DOWN' && dy > 5) isValidDirection = true;
      if (direction === 'LEFT' && dx < -5) isValidDirection = true;
      if (direction === 'RIGHT' && dx > 5) isValidDirection = true;

      if (isValidDirection) {
        // Distance with directional bias
        const primaryDist = direction === 'UP' || direction === 'DOWN' ? Math.abs(dy) : Math.abs(dx);
        const secondaryDist = direction === 'UP' || direction === 'DOWN' ? Math.abs(dx) : Math.abs(dy);
        const score = primaryDist + secondaryDist * 1.8;

        if (score < minDistance) {
          minDistance = score;
          bestElement = el;
        }
      }
    });

    if (bestElement) {
      (bestElement as HTMLElement).focus();
      (bestElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, []);

  const triggerRemoteKey = useCallback(
    (key: RemoteKey) => {
      if (onKey) {
        const handled = onKey(key);
        if (handled === true) return;
      }

      if (enableSpatialNav) {
        if (key === 'UP' || key === 'DOWN' || key === 'LEFT' || key === 'RIGHT') {
          handleSpatialNavigation(key);
        } else if (key === 'OK') {
          const active = document.activeElement as HTMLElement | null;
          if (active && typeof active.click === 'function') {
            active.click();
          }
        }
      }
    },
    [onKey, enableSpatialNav, handleSpatialNavigation]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in text inputs unless it's Escape or Enter
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      let mappedKey: RemoteKey | null = null;

      switch (e.key) {
        case 'ArrowUp':
          if (!isInput) mappedKey = 'UP';
          break;
        case 'ArrowDown':
          if (!isInput) mappedKey = 'DOWN';
          break;
        case 'ArrowLeft':
          if (!isInput) mappedKey = 'LEFT';
          break;
        case 'ArrowRight':
          if (!isInput) mappedKey = 'RIGHT';
          break;
        case 'Enter':
        case 'Select':
          mappedKey = 'OK';
          break;
        case 'Escape':
        case 'Backspace':
          if (!isInput) mappedKey = 'BACK';
          break;
        case ' ':
          if (!isInput) {
            mappedKey = 'PLAY_PAUSE';
            e.preventDefault();
          }
          break;
        case 'PageUp':
        case 'ChannelUp':
          mappedKey = 'CH_UP';
          break;
        case 'PageDown':
        case 'ChannelDown':
          mappedKey = 'CH_DOWN';
          break;
        case 'f':
        case 'F':
          if (!isInput) mappedKey = 'FULLSCREEN';
          break;
        case 'i':
        case 'I':
          if (!isInput) mappedKey = 'INFO';
          break;
        case 'm':
        case 'M':
          if (!isInput) mappedKey = 'MUTE';
          break;
        case 'F1':
          mappedKey = 'RED';
          e.preventDefault();
          break;
        case 'F2':
          mappedKey = 'GREEN';
          e.preventDefault();
          break;
        case 'F3':
          mappedKey = 'YELLOW';
          e.preventDefault();
          break;
        case 'F4':
          mappedKey = 'BLUE';
          e.preventDefault();
          break;
      }

      if (mappedKey) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInput) {
          e.preventDefault();
        }
        triggerRemoteKey(mappedKey);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerRemoteKey]);

  return { triggerRemoteKey };
}
