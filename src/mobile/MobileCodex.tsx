import React, { useMemo } from 'react';
import type { TermNode } from '../termTreeData';

interface Column {
  level: number;
  title: string;
  nodes: TermNode[];
}

interface MobileCodexProps {
  theme: {
    bg: string;
    bgTransparent: string;
    text: string;
    textDim: string;
    border: string;
    borderLight: string;
    invert: string;
  };
  nodes: TermNode[];
  columns: Column[];
  selectedPath: string[];
  onNodeTap: (node: TermNode, level: number) => void;
  onCrumbTap: (index: number) => void;
  onReset: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

/**
 * Mobile Codex: replaces the 4000×3000 pannable canvas with a case-file
 * drill-down. The active list is the deepest derived column; a breadcrumb
 * trail records the descent and makes the "how deep am I" depth visible.
 * Navigation drives the same selectedPath the desktop board uses, so the
 * shared dossier sheet shows the tapped term.
 */
const MobileCodex: React.FC<MobileCodexProps> = ({
  theme, nodes, columns, selectedPath, onNodeTap, onCrumbTap, onReset, searchQuery, setSearchQuery,
}) => {
  const childCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nodes) {
      if (n.parentId) counts[n.parentId] = (counts[n.parentId] || 0) + 1;
      n.secondaryParentIds?.forEach(pid => { counts[pid] = (counts[pid] || 0) + 1; });
    }
    return counts;
  }, [nodes]);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const n of nodes) m[n.id] = n.name;
    return m;
  }, [nodes]);

  const activeColumn = columns[columns.length - 1];
  const activeLevel = activeColumn ? activeColumn.level : 0;

  const q = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return null;
    return nodes
      .filter(n => n.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [q, nodes]);

  const listNodes = searchResults ?? activeColumn?.nodes ?? [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: theme.bg, color: theme.text, fontFamily: '"Space Mono", monospace' }}>
      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <input
          type="text"
          placeholder="SEARCH THE RECORD…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '11px',
            fontFamily: '"Space Mono", monospace',
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            color: theme.text,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Breadcrumb trail (hidden while searching) */}
      {!searchResults && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, overflowX: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <button
            onClick={onReset}
            style={{ background: 'none', border: 'none', color: selectedPath.length ? theme.textDim : theme.text, fontFamily: 'inherit', fontSize: '9px', letterSpacing: '0.12em', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            ROOT
          </button>
          {selectedPath.map((id, i) => (
            <React.Fragment key={id}>
              <span style={{ color: theme.textDim, fontSize: '9px', flexShrink: 0 }}>▸</span>
              <button
                onClick={() => onCrumbTap(i)}
                style={{ background: 'none', border: 'none', color: i === selectedPath.length - 1 ? theme.text : theme.textDim, fontFamily: 'inherit', fontSize: '9px', letterSpacing: '0.08em', cursor: 'pointer', padding: 0, flexShrink: 0, textTransform: 'uppercase' }}
              >
                {(nameById[id] || id).slice(0, 24)}
              </button>
            </React.Fragment>
          ))}
          {selectedPath.length > 0 && (
            <span style={{ marginLeft: 'auto', border: `1px solid ${theme.border}`, color: theme.text, fontSize: '8px', letterSpacing: '0.1em', padding: '2px 6px', flexShrink: 0 }}>
              DEPTH: {selectedPath.length}
            </span>
          )}
        </div>
      )}

      {/* Active list */}
      <div className="custom-sidebar-scrollbar" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {searchResults && (
          <div style={{ padding: '8px 12px', fontSize: '9px', letterSpacing: '0.14em', color: theme.textDim }}>
            {searchResults.length} MATCH{searchResults.length === 1 ? '' : 'ES'}
          </div>
        )}
        {listNodes.map((node) => {
          const kids = childCountById[node.id] || 0;
          const isActive = selectedPath[selectedPath.length - 1] === node.id;
          return (
            <button
              key={node.id}
              onClick={() => onNodeTap(node, searchResults ? selectedPath.length : activeLevel)}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 14px',
                minHeight: '48px',
                background: isActive ? theme.text : 'transparent',
                color: isActive ? theme.bg : theme.text,
                border: 'none',
                borderBottom: `1px solid ${theme.borderLight}`,
                cursor: 'pointer',
                fontFamily: '"Space Mono", monospace',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {node.name}
                </span>
                {node.subLabel && (
                  <span style={{ display: 'block', fontSize: '9px', color: isActive ? theme.bg : theme.textDim, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.subLabel}
                  </span>
                )}
              </span>
              {kids > 0 && (
                <span style={{ fontSize: '9px', letterSpacing: '0.08em', color: isActive ? theme.bg : theme.textDim, flexShrink: 0 }}>
                  {kids} ▸
                </span>
              )}
            </button>
          );
        })}
        {listNodes.length === 0 && (
          <div style={{ padding: '24px 14px', fontSize: '10px', color: theme.textDim, letterSpacing: '0.08em' }}>
            NO FILES AT THIS LEVEL.
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileCodex;
