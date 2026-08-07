import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const LocalTab = (props) => {
  const { colors, borderRadius, shadows, isDark } = useTheme();

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        <button
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: props.isMobile ? '12px 16px' : '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => props.pickLocalFiles(false)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="file" size={18} color={colors.text} />
            <span style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Select Files</span>
          </div>
        </button>

        <button
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: props.isMobile ? '12px 16px' : '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => props.pickLocalDirectory(false)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="folder" size={18} color={colors.text} />
            <span style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Select Folder</span>
          </div>
        </button>
      </div>

      <button
        style={{
          width: '100%',
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
          padding: props.isMobile ? '12px 16px' : '16px',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: props.loading ? 'default' : 'pointer',
          opacity: props.loading ? 0.7 : 1,
          transition: 'all 0.2s ease-in-out',
          ...shadows.sm
        }}
        onClick={() => props.pickLocalDirectory(true)}
        disabled={props.loading}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="folder" size={18} color={isDark ? '#000' : '#fff'} />
          <span style={{ color: isDark ? '#000' : '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>Add Folder to Context</span>
        </div>
      </button>

      <div
        style={{
          width: '100%',
          marginTop: 8,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: props.isDragging ? colors.primary : colors.border,
          borderRadius: borderRadius.md,
          backgroundColor: props.isDragging ? (isDark ? 'rgba(0,112,243,0.1)' : 'rgba(0,112,243,0.05)') : colors.surface,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        <Icon name="upload" size={24} color={props.isDragging ? colors.text : colors.textPlaceholder} />
        <span style={{
          color: props.isDragging ? colors.text : colors.textPlaceholder,
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {props.isDragging ? 'Drop files here to add' : 'Drag and drop files or folders here'}
        </span>
      </div>
    </div>
  );
};

export default LocalTab;
