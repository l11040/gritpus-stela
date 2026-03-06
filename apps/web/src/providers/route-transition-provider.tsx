'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const START_PROGRESS = 12;
const MAX_PROGRESS = 88;
const TRICKLE_INTERVAL_MS = 180;
const COMPLETE_HIDE_DELAY_MS = 180;
const ENTER_ANIMATION_MS = 220;
const FAILSAFE_DONE_MS = 8000;

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isEntering, setIsEntering] = useState(false);

  const hasMountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const trickleTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);

  const clearProgressTimers = useCallback(() => {
    if (trickleTimerRef.current !== null) {
      window.clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (completeTimerRef.current !== null) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    if (failsafeTimerRef.current !== null) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    clearProgressTimers();
    setIsVisible(true);
    setProgress(START_PROGRESS);

    trickleTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= MAX_PROGRESS) return prev;
        const step = Math.max(1, (MAX_PROGRESS - prev) * 0.15);
        return Math.min(MAX_PROGRESS, prev + step);
      });
    }, TRICKLE_INTERVAL_MS);

    failsafeTimerRef.current = window.setTimeout(() => {
      inFlightRef.current = false;
      clearProgressTimers();
      setProgress(100);
      completeTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, COMPLETE_HIDE_DELAY_MS);
    }, FAILSAFE_DONE_MS);
  }, [clearProgressTimers]);

  const finishProgress = useCallback(() => {
    if (!inFlightRef.current) return;
    inFlightRef.current = false;

    clearProgressTimers();
    setProgress(100);

    completeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, COMPLETE_HIDE_DELAY_MS);
  }, [clearProgressTimers]);

  useEffect(() => {
    const mutableRouter = router as typeof router & {
      forward?: () => void;
    };

    const originalPush = mutableRouter.push.bind(mutableRouter);
    const originalReplace = mutableRouter.replace.bind(mutableRouter);
    const originalBack = mutableRouter.back.bind(mutableRouter);
    const originalForward = mutableRouter.forward?.bind(mutableRouter);
    const originalRefresh = mutableRouter.refresh.bind(mutableRouter);
    try {
      mutableRouter.push = ((href, options) => {
        startProgress();
        return originalPush(href, options);
      }) as typeof router.push;

      mutableRouter.replace = ((href, options) => {
        startProgress();
        return originalReplace(href, options);
      }) as typeof router.replace;

      mutableRouter.back = (() => {
        startProgress();
        return originalBack();
      }) as typeof router.back;

      mutableRouter.forward = () => {
        startProgress();
        return originalForward?.();
      };

      mutableRouter.refresh = originalRefresh;
    } catch {
      return;
    }

    return () => {
      try {
        mutableRouter.push = originalPush;
        mutableRouter.replace = originalReplace;
        mutableRouter.back = originalBack;
        mutableRouter.forward = originalForward;
        mutableRouter.refresh = originalRefresh;
      } catch {
        // no-op: some router instances can be readonly
      }
    };
  }, [router, startProgress]);

  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${nextUrl.pathname}${nextUrl.search}`;
      if (current === next) return;

      startProgress();
    };

    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [startProgress]);

  useEffect(() => {
    const handlePopstate = () => {
      startProgress();
    };

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [startProgress]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    finishProgress();
    setIsEntering(true);

    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
    }
    enterTimerRef.current = window.setTimeout(() => {
      setIsEntering(false);
      enterTimerRef.current = null;
    }, ENTER_ANIMATION_MS);
  }, [pathname, search, finishProgress]);

  useEffect(() => {
    return () => {
      clearProgressTimers();
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, [clearProgressTimers]);

  return (
    <>
      <div className="route-progress" data-visible={isVisible}>
        <div
          className="route-progress__bar"
          style={{ transform: `scaleX(${Math.max(0, Math.min(progress, 100)) / 100})` }}
        />
      </div>
      <div className="route-transition-shell" data-entering={isEntering}>
        {children}
      </div>
    </>
  );
}
