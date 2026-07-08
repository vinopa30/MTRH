import React from 'react';

type PageId = 'map' | 'timeline' | 'codex';

interface MobileTabBarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  theme: {
    bg: string;
    bgTransparent: string;
    text: string;
    textDim: string;
    border: string;
  };
}

const TABS: { id: PageId; label: string }[] = [
  { id: 'map', label: 'MAP' },
  { id: 'timeline', label: 'TIMELINE' },
  { id: 'codex', label: 'CODEX' },
];

// Bottom tab bar for the mobile shell — replaces the desktop header's center
// navigation pill. Fixed 56px + safe-area, thumb-reachable, dossier file-tab styling.
const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentPage, setCurrentPage, theme }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'flex',
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
        zIndex: 500,
        fontFamily: '"Space Mono", monospace',
      }}
    >
      {TABS.map(tab => {
        const isActive = currentPage === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentPage(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderTop: isActive ? `2px solid ${theme.text}` : '2px solid transparent',
              marginTop: '-1px',
              color: isActive ? theme.text : theme.textDim,
              fontFamily: 'inherit',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            [ {tab.label} ]
          </button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
