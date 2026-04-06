import { useState, useEffect } from 'react';

/** Desktop / mobile width as % of viewport (Trip Visualizer side drawers) */
export const SIDE_PANEL_WIDTH_PCT = { desktop: 30, mobile: 80 };

export function useIsMobilePanelBreakpoint(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    fn();
    return () => mq.removeEventListener('change', fn);
  }, [breakpoint]);
  return isMobile;
}

/**
 * Left slide-in panel + dimmed backdrop (replaces centered modals in the visualizer).
 */
export default function VisualizerSidePanel({
  children,
  onClose,
  /** Above visualizer bottom bar (1000) */
  zIndex = 1100,
  panelBackground = '#ffffff',
  padding = 24,
}) {
  const isMobile = useIsMobilePanelBreakpoint();
  const widthPct = isMobile ? SIDE_PANEL_WIDTH_PCT.mobile : SIDE_PANEL_WIDTH_PCT.desktop;
  const paddingStyle = typeof padding === 'number' ? `${padding}px` : padding;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
      role="presentation"
    >
      <style>{`
        @keyframes visualizerSlideInFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .visualizer-side-panel-inner {
          animation: visualizerSlideInFromLeft 0.28s ease-out forwards;
        }
      `}</style>
      <div
        className="visualizer-side-panel-inner"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${widthPct}vw`,
          maxWidth: '100%',
          height: '100%',
          backgroundColor: panelBackground,
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          borderTopRightRadius: '12px',
          borderBottomRightRadius: '12px',
          padding: paddingStyle,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
