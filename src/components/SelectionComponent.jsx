import React, { useMemo, useState, useCallback, useEffect, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getExtension } from '../utils/fileHelpers';
import Icon from './Icon';

const TreeItem = memo(({ item, level, isExpanded, onToggle, selectionState, onSelect }) => {
  const { colors } = useTheme();
  const isFile = item.type === 'blob';

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '2px 0', minHeight: 28, userSelect: 'none' }}>
      {Array.from({ length: level }).map((_, i) => (
        <div key={`indent-${i}`} style={{ width: 14, height: 28, borderLeft: `1px solid ${colors.border}`, marginRight: 2, flexShrink: 0 }} />
      ))}

      <button
        style={{
          width: 20, height: 20, alignItems: 'center', justifyContent: 'center', display: 'flex',
          background: 'none', border: 'none', cursor: isFile ? 'default' : 'pointer', padding: 0, flexShrink: 0
        }}
        onClick={() => !isFile && onToggle(item.path)}
      >
        {!isFile && <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={12} color={colors.textSecondary} />}
      </button>

      <button
        style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, padding: '3px 8px',
          borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0,
          transition: 'background 0.1s ease'
        }}
        onClick={() => onSelect(item)}
      >
        <div style={{
          width: 15, height: 15, borderRadius: 4,
          border: `1.5px solid ${selectionState !== 'none' ? colors.primary : colors.border}`,
          backgroundColor: selectionState !== 'none' ? colors.primary : 'transparent',
          alignItems: 'center', justifyContent: 'center', display: 'flex', marginRight: 8, flexShrink: 0
        }}>
          {selectionState === 'full' && <Icon name="check" size={10} color="#ffffff" />}
          {selectionState === 'partial' && <Icon name="minus" size={10} color="#ffffff" />}
        </div>

        <Icon name={isFile ? "file" : "folder"} size={14} color={isFile ? colors.textSecondary : colors.primary} style={{ marginRight: 8, flexShrink: 0 }} />

        <span style={{ fontSize: 13, color: colors.text, fontWeight: isFile ? '400' : '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </span>
      </button>
    </div>
  );
});

const SelectionComponent = ({
  tree, sources, selectedFiles, setSelectedFiles,
  onGenerate, loading, removeSource, preamble, setPreamble, isMobile
}) => {
  const { colors, borderRadius, shadows } = useTheme();
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [selectedExtensions, setSelectedExtensions] = useState(new Set());

  // Map of selected files for O(1) lookup
  const selectedKeySet = useMemo(() => {
    const set = new Set();
    if (selectedFiles) {
      selectedFiles.forEach(f => set.add(`${f.sourceId}:${f.path}`));
    }
    return set;
  }, [selectedFiles]);

  // Group blobs and folders hierarchically
  const { hierarchyFlat, sourceFolderMap } = useMemo(() => {
    if (!tree) return { hierarchyFlat: [], sourceFolderMap: new Map() };

    let blobs = tree.filter(f => f.type === 'blob');

    if (selectedExtensions.size > 0) {
      blobs = blobs.filter(f => selectedExtensions.has(getExtension(f.name || f.path).toLowerCase()));
    }

    // parentKey -> { folders: Map(path -> folderObj), files: array }
    const childrenMap = new Map();
    // folderKey -> array of descendant blob files
    const folderDescendants = new Map();

    blobs.forEach(file => {
      const parts = file.path.split('/');
      const fileName = parts.pop();
      const level = parts.length;
      const fileParentPath = parts.join('/');
      const parentKey = `${file.sourceId}:${fileParentPath}`;

      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, { folders: new Map(), files: [] });
      }
      childrenMap.get(parentKey).files.push({
        ...file, type: 'blob', name: fileName, level
      });

      // Register parent folders
      for (let i = 0; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        const folderParentPath = parts.slice(0, i).join('/');
        const folderKey = `${file.sourceId}:${folderPath}`;
        const folderParentKey = `${file.sourceId}:${folderParentPath}`;

        if (!childrenMap.has(folderParentKey)) {
          childrenMap.set(folderParentKey, { folders: new Map(), files: [] });
        }

        if (!childrenMap.get(folderParentKey).folders.has(folderPath)) {
          childrenMap.get(folderParentKey).folders.set(folderPath, {
            sourceId: file.sourceId,
            path: folderPath,
            name: parts[i],
            type: 'tree',
            level: i
          });
        }

        if (!folderDescendants.has(folderKey)) {
          folderDescendants.set(folderKey, []);
        }
        folderDescendants.get(folderKey).push(file);
      }
    });

    // Build hierarchical flat list
    const result = [];

    const processParent = (parentKey) => {
      const group = childrenMap.get(parentKey);
      if (!group) return;

      // Sort subfolders alphabetically
      const sortedFolders = Array.from(group.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
      // Sort files alphabetically
      const sortedFiles = group.files.sort((a, b) => a.name.localeCompare(b.name));

      for (const folder of sortedFolders) {
        result.push(folder);
        processParent(`${folder.sourceId}:${folder.path}`);
      }

      for (const file of sortedFiles) {
        result.push(file);
      }
    };

    // Get all source root keys
    const sourceIds = new Set(blobs.map(b => b.sourceId));
    sourceIds.forEach(sId => processParent(`${sId}:`));

    return { hierarchyFlat: result, sourceFolderMap: folderDescendants };
  }, [tree, selectedExtensions]);

  // Auto-expand top-level directories when hierarchy changes
  useEffect(() => {
    if (hierarchyFlat.length > 0) {
      setExpandedDirs(prev => {
        const next = new Set(prev);
        hierarchyFlat.forEach(item => {
          if (item.type === 'tree' && item.level <= 1) {
            next.add(`${item.sourceId}:${item.path}`);
          }
        });
        return next;
      });
    }
  }, [hierarchyFlat]);

  const toggleDir = useCallback((pathKey) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
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
      const folderKey = `${item.sourceId}:${item.path}`;
      const children = sourceFolderMap.get(folderKey) || [];
      if (children.length === 0) return;

      setSelectedFiles(prev => {
        const currentKeys = new Set(prev.map(f => `${f.sourceId}:${f.path}`));
        const allSelected = children.every(c => currentKeys.has(`${c.sourceId}:${c.path}`));

        if (allSelected) {
          const childKeySet = new Set(children.map(c => `${c.sourceId}:${c.path}`));
          return prev.filter(f => !childKeySet.has(`${f.sourceId}:${f.path}`));
        } else {
          const toAdd = children.filter(c => !currentKeys.has(`${c.sourceId}:${c.path}`));
          return [...prev, ...toAdd];
        }
      });
    }
  }, [sourceFolderMap, setSelectedFiles]);

  const visibleTree = useMemo(() => {
    return hierarchyFlat.filter(item => {
      const parts = item.path.split('/');
      if (parts.length === 1) return true;

      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        if (!expandedDirs.has(`${item.sourceId}:${currentPath}`)) {
          return false;
        }
      }
      return true;
    });
  }, [hierarchyFlat, expandedDirs]);

  const getItemSelectionState = useCallback((item) => {
    if (item.type === 'blob') {
      return selectedKeySet.has(`${item.sourceId}:${item.path}`) ? 'full' : 'none';
    } else {
      const folderKey = `${item.sourceId}:${item.path}`;
      const descendants = sourceFolderMap.get(folderKey) || [];
      if (descendants.length === 0) return 'none';

      let selectedCount = 0;
      for (const d of descendants) {
        if (selectedKeySet.has(`${d.sourceId}:${d.path}`)) {
          selectedCount++;
        }
      }

      if (selectedCount === descendants.length) return 'full';
      if (selectedCount > 0) return 'partial';
      return 'none';
    }
  }, [selectedKeySet, sourceFolderMap]);

  // Apply Quick Presets
  const applyPreset = (type) => {
    if (!tree) return;
    const blobs = tree.filter(f => f.type === 'blob');

    if (type === 'all') {
      setSelectedFiles(blobs);
    } else if (type === 'none') {
      setSelectedFiles([]);
    } else if (type === 'core') {
      // Core logic directories like src/, lib/, app/, pkg/
      setSelectedFiles(blobs.filter(f => {
        const lower = f.path.toLowerCase();
        return lower.startsWith('src/') || lower.startsWith('app/') || lower.startsWith('lib/') || lower.startsWith('pkg/');
      }));
    }
  };

  const selectedCount = selectedFiles?.length || 0;
  const totalCount = tree?.filter(i => i.type === 'blob').length || 0;

  if (!tree) return null;

  return (
    <div style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: isMobile ? 16 : 24, border: `1px solid ${colors.border}`, ...shadows.md }}>

      {/* Header & Source Tags */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Codebase Selection</span>
            <span style={{ fontSize: 11, fontWeight: '800', backgroundColor: colors.primary + '18', color: colors.primary, padding: '2px 8px', borderRadius: 10 }}>
              {selectedCount} / {totalCount} files
            </span>
          </div>
          <span style={{ fontSize: 12, color: colors.textSecondary, display: 'block', marginTop: 3 }}>
            Toggle individual files or use quick preset filters below
          </span>
        </div>

        {/* Preset Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => applyPreset('core')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.primary + '40'}`, backgroundColor: colors.primary + '10', color: colors.primary, cursor: 'pointer', transition: 'all 0.15s ease' }}>
            🎯 Core Logic
          </button>
          <button onClick={() => applyPreset('all')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, cursor: 'pointer', transition: 'all 0.15s ease' }}>
            All
          </button>
          <button onClick={() => applyPreset('none')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: '700', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.textSecondary, cursor: 'pointer', transition: 'all 0.15s ease' }}>
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
              selectionState={getItemSelectionState(item)}
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