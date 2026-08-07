import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { LLM_CONTEXT_LIMITS } from '../utils/constants';
import Icon from './Icon';
import Checkbox from './Checkbox';
import BubbleInput from './BubbleInput';

const ProcessingOptions = ({
  removeComments, setRemoveComments,
  removeExtraWhitespace, setRemoveExtraWhitespace,
  codingMode, setCodingMode,
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
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
          backgroundColor: 'transparent', border: 'none', width: '100%', cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="settings" size={14} color={colors.primary} />
          <span style={{ fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: colors.text }}>
            LLM Context Window & Optimization Settings
          </span>
        </div>
        <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={14} color={colors.textSecondary} />
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Target LLM Window */}
          <div>
            <span style={{ fontSize: 12, fontWeight: '700', color: colors.text, display: 'block', marginBottom: 6 }}>
              Target LLM Context Window (Auto-Splitting)
            </span>
            <select
              style={{
                width: '100%', backgroundColor: colors.card, color: colors.text, border: `1px solid ${colors.border}`,
                borderRadius: 6, padding: '8px 10px', fontSize: 13, outline: 'none'
              }}
              value={maxContextTokens}
              onChange={(e) => setMaxContextTokens(Number(e.target.value))}
            >
              {LLM_CONTEXT_LIMITS.map(limit => (
                <option key={limit.value} value={limit.value}>{limit.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'block' }}>
              If output exceeds target tokens, it will split automatically into downloadable parts.
            </span>
          </div>

          {/* Mode Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Checkbox
              label="Coding Mode (Exclude Markdown, Lockfiles, Docs, CSS)"
              checked={codingMode}
              onChange={setCodingMode}
            />
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