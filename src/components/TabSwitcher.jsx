import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
  const { colors, borderRadius, shadows } = useTheme();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: 5,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'solid'
    }}>
      <button
        style={{
          flex: 1,
          padding: '11px 0',
          borderRadius: borderRadius.md,
          backgroundColor: activeTab === 'github' ? colors.card : 'transparent',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: activeTab === 'github' ? `1px solid ${colors.border}` : '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...(activeTab === 'github' ? shadows.sm : {}),
        }}
        onClick={() => setActiveTab('github')}
      >
        <Icon name="github" size={16} color={activeTab === 'github' ? colors.primary : colors.textSecondary} />
        <span style={{
          fontSize: 13,
          fontWeight: activeTab === 'github' ? '800' : '600',
          color: activeTab === 'github' ? colors.text : colors.textSecondary,
        }}>
          GitHub Repo
        </span>
      </button>

      <button
        style={{
          flex: 1,
          padding: '11px 0',
          borderRadius: borderRadius.md,
          backgroundColor: activeTab === 'local' ? colors.card : 'transparent',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: activeTab === 'local' ? `1px solid ${colors.border}` : '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...(activeTab === 'local' ? shadows.sm : {}),
        }}
        onClick={() => setActiveTab('local')}
      >
        <Icon name="folder" size={16} color={activeTab === 'local' ? colors.primary : colors.textSecondary} />
        <span style={{
          fontSize: 13,
          fontWeight: activeTab === 'local' ? '800' : '600',
          color: activeTab === 'local' ? colors.text : colors.textSecondary,
        }}>
          Local Files / Directory
        </span>
      </button>
    </div>
  );
};

export default TabSwitcher;
