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
    <div style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: isMobile ? 16 : 24, border: `1px solid ${colors.border}`, ...shadows.md }}>

      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary + '20' }}>
              <Icon name="content-copy" size={15} color={colors.primary} />
            </div>
            <span style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              Generated Prompt Bundle {currentBatch.totalParts > 1 ? `(Part ${currentBatch.part} of ${currentBatch.totalParts})` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, alignItems: 'center' }}>
            <span style={{ color: colors.textSecondary }}>Characters: <strong style={{ color: colors.text }}>{currentBatch.charCount.toLocaleString()}</strong></span>
            <span style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
              Est. Tokens: <strong style={{ color: colors.secondary, backgroundColor: colors.secondary + '15', padding: '1px 6px', borderRadius: 4 }}>~{currentBatch.tokenCount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ backgroundColor: colors.primary, color: '#ffffff', padding: '10px 16px', borderRadius: 8, border: 'none', fontWeight: '800', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s ease' }}
            onClick={copyCurrentBatch}
          >
            <Icon name="content-copy" size={14} color="#ffffff" />
            <span>Copy Part {currentBatch.part}</span>
          </button>
          <button
            style={{ backgroundColor: colors.surface, color: colors.text, padding: '10px 14px', borderRadius: 8, border: `1px solid ${colors.border}`, fontWeight: '700', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}
            onClick={downloadCurrentBatch}
          >
            <Icon name="download" size={14} color={colors.text} />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Batch Tabs if output is multi-part */}
      {outputBatches.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {outputBatches.map((b, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBatchIndex(idx)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: '700', cursor: 'pointer',
                backgroundColor: activeBatchIndex === idx ? colors.primary : colors.surface,
                color: activeBatchIndex === idx ? '#ffffff' : colors.text,
                border: `1px solid ${activeBatchIndex === idx ? colors.primary : colors.border}`,
                transition: 'all 0.15s ease'
              }}
            >
              Part {b.part} ({Math.round(b.tokenCount / 1000)}k tokens)
            </button>
          ))}
        </div>
      )}

      {/* Code Text Output Container */}
      <div style={{ backgroundColor: colors.background, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: 16, maxHeight: 440, overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: 12.5, fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', lineHeight: 1.6, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {currentBatch.text}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputSection);