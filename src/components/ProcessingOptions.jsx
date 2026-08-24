import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { LLM_CONTEXT_LIMITS } from '../utils/constants';
import Icon from './Icon';
import Checkbox from './Checkbox';
import BubbleInput from './BubbleInput';

const ProcessingOptions = ({
  removeComments, setRemoveComments,
  removeExtraWhitespace, setRemoveExtraWhitespace,
  maxContextTokens, setMaxContextTokens,
  maxFileSize, setMaxFileSize,
  ignorePatterns, setIgnorePatterns
}) => {
  const { colors, borderRadius } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{ backgroundColor: colors.surface, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
      <button
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px',
          backgroundColor: 'transparent', border: 'none', width: '100%', cursor: 'pointer', transition: 'background 0.2s ease'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, backgroundColor: colors.primary + '20' }}>
            <Icon name="settings" size={13} color={colors.primary} />
          </div>
          <span style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.2, color: colors.text }}>
            Context Window & Processing Options
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: '700', color: colors.primary, backgroundColor: colors.primary + '15', padding: '2px 8px', borderRadius: 10 }}>
            {maxContextTokens === 1000000 ? 'Gemini 1M' : maxContextTokens > 0 ? `${maxContextTokens / 1000}K` : 'Auto'}
          </span>
          <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={14} color={colors.textSecondary} />
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ height: 1, backgroundColor: colors.border, width: '100%' }} />

          {/* Target LLM Window */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                Target LLM Context Limit
              </span>
              <span style={{ fontSize: 11, color: colors.secondary, fontWeight: '700' }}>
                Gemini Default
              </span>
            </div>
            <select
              style={{
                width: '100%', backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}`,
                borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', cursor: 'pointer'
              }}
              value={maxContextTokens}
              onChange={(e) => setMaxContextTokens(Number(e.target.value))}
            >
              {LLM_CONTEXT_LIMITS.map(limit => (
                <option key={limit.value} value={limit.value}>{limit.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'block' }}>
              Splits output context automatically into downloadable parts if total tokens exceed limit.
            </span>
          </div>

          {/* Mode Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Checkbox
              label="Remove Single & Multi-line Code Comments"
              checked={removeComments}
              onChange={setRemoveComments}
            />
            <Checkbox
              label="Compress Extra Whitespace & Newlines"
              checked={removeExtraWhitespace}
              onChange={setRemoveExtraWhitespace}
            />
          </div>

          {/* Max File Size Limit */}
          <div>
            <span style={{ fontSize: 12, fontWeight: '700', color: colors.text, display: 'block', marginBottom: 4 }}>
              Max Single File Limit (KB)
            </span>
            <input
              type="number"
              style={{
                width: '100%', boxSizing: 'border-box', backgroundColor: colors.card, color: colors.text,
                border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 13, outline: 'none'
              }}
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
              placeholder="e.g. 250"
            />
          </div>

          {/* Custom Ignore Bubble Input */}
          <div>
            <span style={{ fontSize: 12, fontWeight: '700', color: colors.text, display: 'block', marginBottom: 4 }}>
              Excluded Folders & File Patterns
            </span>
            <BubbleInput
              values={ignorePatterns ? ignorePatterns.split(',').map(s => s.trim()).filter(Boolean) : []}
              setValues={(val) => setIgnorePatterns(val)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingOptions;