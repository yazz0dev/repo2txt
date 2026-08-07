import React, { useRef, useEffect, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import TabSwitcher from './TabSwitcher';
import ProcessingOptions from './ProcessingOptions';
import GitHubTab from './GitHubTab';
import LocalTab from './LocalTab';

const InputSection = (props) => {
  const { activeTab, colors, borderRadius, spacing, shadows } = { ...props, ...useTheme() };
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    const handleDragEnter = (e) => {
      if (activeTab === 'local' && props.handleDragEnter) {
        props.handleDragEnter(e);
      }
    };

    const handleDragOver = (e) => {
      if (activeTab === 'local' && props.handleDragOver) {
        props.handleDragOver(e);
      }
    };

    const handleDragLeave = (e) => {
      if (activeTab === 'local' && props.handleDragLeave) {
        props.handleDragLeave(e);
      }
    };

    const handleDrop = (e) => {
      if (activeTab === 'local' && props.handleDrop) {
        props.handleDrop(e);
      }
    };

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [activeTab, props.handleDragEnter, props.handleDragOver, props.handleDragLeave, props.handleDrop]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        backgroundColor: props.isDragging ? colors.surface : colors.card,
        borderRadius: borderRadius.xl,
        padding: props.isMobile ? 12 : 24,
        borderColor: props.isDragging ? colors.primary : 'transparent',
        borderWidth: props.isDragging ? 1 : 0,
        borderStyle: 'solid',
        boxSizing: 'border-box',
        ...shadows.md
      }}
    >
      <TabSwitcher activeTab={activeTab} setActiveTab={props.setActiveTab} />

      <div style={{ marginBottom: 24 }}>
        {activeTab === 'github' ? (
          <GitHubTab {...props} />
        ) : (
          <LocalTab {...props} />
        )}
      </div>

      <div style={{ height: 1, margin: '16px 0', width: '100%', backgroundColor: colors.border }} />

      <ProcessingOptions {...props} />
    </div>
  );
};

export default memo(InputSection);
