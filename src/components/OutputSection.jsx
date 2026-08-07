import React, { memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const OutputSection = ({ outputBatches, activeBatchIndex, setActiveBatchIndex, isMobile }) => {
  const { colors, borderRadius, shadows } = useTheme();

  if (!outputBatches || outputBatches.length === 0) return null;

  const currentBatch = outputBatches[activeBatchIndex];
  if (!currentBatch) return null;

  const copyCurrentBatch = async () => {
    try {
      await navigator.clipboard.writeText(currentBatch.text);
      window.alert(`Part ${currentBatch.part} copied to clipboard!`);
    } catch {
      window.alert('Failed to copy');
    }
  };

  const downloadCurrentBatch = () => {
    const blob = new Blob([currentBatch.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repointxt_part_${currentBatch.part}_of_${currentBatch.totalParts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: isMobile ? 12 : 20, border: `1px solid ${colors.border}`, ...shadows.md }}>

      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="content-copy" size={18} color={colors.primary} />
            <span style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
              Generated Prompt Bundle {currentBatch.totalParts > 1 ? `(Part ${currentBatch.part} of ${currentBatch.totalParts})` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12 }}>
            <span style={{ color: colors.textSecondary }}>Chars: <strong style={{ color: colors.text }}>{currentBatch.charCount.toLocaleString()}</strong></span>
            <span style={{ color: colors.textSecondary }}>Est. Tokens: <strong style={{ color: colors.primary }}>~{currentBatch.tokenCount.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ backgroundColor: colors.primary, color: '#ffffff', padding: '8px 14px', borderRadius: 6, border: 'none', fontWeight: '700', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={copyCurrentBatch}
          >
            <Icon name="content-copy" size={14} color="#ffffff" />
            <span>Copy Part {currentBatch.part}</span>
          </button>
          <button
            style={{ backgroundColor: colors.surface, color: colors.text, padding: '8px 12px', borderRadius: 6, border: `1px solid ${colors.border}`, fontWeight: '700', fontSize: 13, cursor: 'pointer' }}
            onClick={downloadCurrentBatch}
          >
            <Icon name="download" size={14} color={colors.text} />
          </button>
        </div>
      </div>

      {/* Batch Tabs if output is multi-part */}
      {outputBatches.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {outputBatches.map((b, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBatchIndex(idx)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: '700', cursor: 'pointer',
                backgroundColor: activeBatchIndex === idx ? colors.primary : colors.surface,
                color: activeBatchIndex === idx ? '#ffffff' : colors.text,
                border: `1px solid ${activeBatchIndex === idx ? colors.primary : colors.border}`
              }}
            >
              Part {b.part} ({Math.round(b.tokenCount / 1000)}k tokens)
            </button>
          ))}
        </div>
      )}

      {/* Code Text Output Container */}
      <div style={{ backgroundColor: colors.background, borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: 14, maxHeight: 420, overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.5, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {currentBatch.text}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputSection);