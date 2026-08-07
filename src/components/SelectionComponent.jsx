import React, { useMemo, useState, useCallback, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getExtension, isCodeFile } from '../utils/fileHelpers';
import Icon from './Icon';

const TreeItem = memo(({ item, level, isExpanded, onToggle, isSelected, onSelect }) => {
  const { colors } = useTheme();
  const isFile = item.type === 'blob';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '3px 0', minHeight: 28 }}>
        {Array.from({ length: level }).map((_, i) => (
          <div key={`indent-${i}`} style={{ width: 14, height: '100%', borderLeft: `1px solid ${colors.border}` }} />
        ))}

        <button
          style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => !isFile && onToggle(item.path)}
        >
          {!isFile && <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={12} color={colors.textSecondary} />}
        </button>

        <button
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, padding: '3px 6px', borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => onSelect(item)}
        >
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            border: `1px solid ${isSelected ? colors.primary : colors.border}`,
            backgroundColor: isSelected ? colors.primary : 'transparent',
            alignItems: 'center', justifyContent: 'center', display: 'flex', marginRight: 8
          }}>
            {isSelected && <Icon name="check" size={10} color="#ffffff" />}
          </div>

          <Icon name={isFile ? "file" : "folder"} size={14} color={isFile ? colors.textSecondary : colors.primary} style={{ marginRight: 6 }} />

          <span style={{ fontSize: 13, color: colors.text, fontWeight: isFile ? '400' : '600' }} className="truncate">
            {item.name}
          </span>
        </button>
      </div>
    </div>
  );
});

const SelectionComponent = ({
  tree, sources, selectedFiles, setSelectedFiles,
  onGenerate, loading, removeSource, preamble, setPreamble, isMobile
}) => {
  const { colors, borderRadius, shadows } = useTheme();
  const [expandedDirs, setExpandedDirs] = useState(new Set(['']));
  const [selectedExtensions, setSelectedExtensions] = useState(new Set());

  const toggleDir = useCallback((path) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((item) => {
    if (item.type === 'blob') {
      setSelectedFiles(prev => {
        const exists = prev.some(f => f.path === item.path && f.sourceId === item.sourceId);
        return exists ? prev.filter(f => !(f.path === item.path && f.sourceId === item.sourceId)) : [...prev, item];
      });
    } else {
      const prefix = item.path + '/';
      const children = tree.filter(f => f.type === 'blob' && f.path.startsWith(prefix) && f.sourceId === item.sourceId);

      setSelectedFiles(prev => {
        const selectedKeys = new Set(prev.map(f => `${f.sourceId}:${f.path}`));
        const allSelected = children.every(c => selectedKeys.has(`${c.sourceId}:${c.path}`));

        if (allSelected) {
          const childKeys = new Set(children.map(c => `${c.sourceId}:${c.path}`));
          return prev.filter(f => !childKeys.has(`${f.sourceId}:${f.path}`));
        } else {
          const toAdd = children.filter(c => !selectedKeys.has(`${c.sourceId}:${c.path}`));
          return [...prev, ...toAdd];
        }
      });
    }
  }, [tree, setSelectedFiles]);

  // Apply Quick Presets
  const applyPreset = (type) => {
    if (!tree) return;
    const blobs = tree.filter(f => f.type === 'blob');

    if (type === 'all') {
      setSelectedFiles(blobs);
    } else if (type === 'none') {
      setSelectedFiles([]);
    } else if (type === 'code') {
      setSelectedFiles(blobs.filter(f => isCodeFile(f.path)));
    } else if (type === 'core') {
      // Core logic directories like src/, lib/, app/, pkg/
      setSelectedFiles(blobs.filter(f => {
        const lower = f.path.toLowerCase();
        return (lower.startsWith('src/') || lower.startsWith('app/') || lower.startsWith('lib/') || lower.startsWith('pkg/')) && isCodeFile(f.path);
      }));
    }
  };

  const fileExtensions = useMemo(() => {
    if (!tree) return [];
    const exts = new Set();
    tree.forEach(item => {
      if (item.type === 'blob') {
        const ext = getExtension(item.name || item.path);
        if (ext) exts.add(ext.toLowerCase());
      }
    });
    return Array.from(exts).sort();
  }, [tree]);

  const hierarchy = useMemo(() => {
    if (!tree) return [];
    let blobs = tree.filter(f => f.type === 'blob');

    if (selectedExtensions.size > 0) {
      blobs = blobs.filter(f => selectedExtensions.has(getExtension(f.name || f.path).toLowerCase()));
    }

    const itemsMap = new Map();
    blobs.forEach(file => {
      itemsMap.set(`${file.sourceId}:${file.path}`, {
        ...file, type: 'blob', name: file.path.split('/').pop(), level: file.path.split('/').length - 1
      });

      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const folderPath = parts.slice(0, i).join('/');
        const folderKey = `${file.sourceId}:${folderPath}`;
        if (!itemsMap.has(folderKey)) {
          itemsMap.set(folderKey, {
            sourceId: file.sourceId, path: folderPath, name: parts[i - 1], type: 'tree', level: i - 1
          });
        }
      }
    });

    return Array.from(itemsMap.values()).sort((a, b) => {
      const typeA = a.type === 'tree' ? 0 : 1;
      const typeB = b.type === 'tree' ? 0 : 1;
      if (typeA !== typeB) return typeA - typeB;
      return a.path.localeCompare(b.path);
    });
  }, [tree, selectedExtensions]);

  const visibleTree = useMemo(() => {
    return hierarchy.filter(item => {
      const parts = item.path.split('/');
      if (parts.length === 1) return true;
      const parentPath = parts.slice(0, -1).join('/');
      return expandedDirs.has(`${item.sourceId}:${parentPath}`);
    });
  }, [hierarchy, expandedDirs]);

  const selectedCount = selectedFiles?.length || 0;
  const totalCount = tree?.filter(i => i.type === 'blob').length || 0;

  if (!tree) return null;

  return (
    <div style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: isMobile ? 14 : 20, border: `1px solid ${colors.border}`, ...shadows.md }}>

      {/* Header & Source Tags */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Codebase Selection</span>
          <span style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginTop: 2 }}>
            Selected <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> files
          </span>
        </div>

        {/* Preset Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => applyPreset('core')} style={{ padding: '5px 10px', fontSize: 11, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.primary, cursor: 'pointer' }}>
            🎯 Core Logic
          </button>
          <button onClick={() => applyPreset('code')} style={{ padding: '5px 10px', fontSize: 11, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, cursor: 'pointer' }}>
            ⚡ Code Only
          </button>
          <button onClick={() => applyPreset('all')} style={{ padding: '5px 10px', fontSize: 11, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, cursor: 'pointer' }}>
            All
          </button>
          <button onClick={() => applyPreset('none')} style={{ padding: '5px 10px', fontSize: 11, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.textSecondary, cursor: 'pointer' }}>
            None
          </button>
        </div>
      </div>

      {/* Sources Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {sources.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: colors.surface, padding: '4px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, fontSize: 12 }}>
            <Icon name={s.type === 'github' ? 'github' : 'folder'} size={12} color={colors.primary} />
            <span style={{ fontWeight: '700', color: colors.text }}>{s.name}</span>
            <button onClick={() => removeSource(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Icon name="x" size={12} color={colors.error} />
            </button>
          </div>
        ))}
      </div>

      {/* Tree Container */}
      <div style={{ backgroundColor: colors.background, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
          {visibleTree.map((item, idx) => (
            <TreeItem
              key={`${item.sourceId}-${item.path}-${idx}`}
              item={item}
              level={item.level}
              isExpanded={expandedDirs.has(`${item.sourceId}:${item.path}`)}
              onToggle={(p) => toggleDir(`${item.sourceId}:${p}`)}
              isSelected={item.type === 'blob' ? selectedFiles.some(f => f.path === item.path && f.sourceId === item.sourceId) : false}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      </div>

      {/* Optional System Prompt */}
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6, display: 'block' }}>
          System Instructions / Preamble (Optional)
        </span>
        <textarea
          style={{
            width: '100%', boxSizing: 'border-box', backgroundColor: colors.surface, borderColor: colors.border,
            borderWidth: 1, borderStyle: 'solid', borderRadius: 6, padding: 10, color: colors.text, fontSize: 13,
            minHeight: 64, outline: 'none', resize: 'vertical'
          }}
          placeholder="e.g., 'Refactor this module to TypeScript and resolve circular dependencies...'"
          value={preamble}
          onChange={(e) => setPreamble(e.target.value)}
        />
      </div>

      {/* Generate Button */}
      <button
        style={{
          width: '100%', backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: 14, marginTop: 16,
          border: 'none', color: '#ffffff', fontSize: 15, fontWeight: '800', cursor: loading || selectedCount === 0 ? 'default' : 'pointer',
          opacity: loading || selectedCount === 0 ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
        onClick={onGenerate}
        disabled={loading || selectedCount === 0}
      >
        <Icon name="zap" size={16} color="#ffffff" />
        <span>{loading ? 'Processing Context...' : `Generate Prompt Context Bundle (${selectedCount} files)`}</span>
      </button>
    </div>
  );
};

export default memo(SelectionComponent);