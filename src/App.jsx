import React, { useState, useEffect, useRef } from 'react';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import SelectionComponent from './components/SelectionComponent';
import Icon from './components/Icon';
import { useRepoManager } from './hooks/useRepoManager';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = width < 768;
  const theme = useTheme();
  const { colors } = theme;

  const {
    loading, loadingMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging,
    ignorePatterns, setIgnorePatterns, preamble, setPreamble,
    removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
    maxContextTokens, setMaxContextTokens,
    maxFileSize, setMaxFileSize, activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    treeData, selectedFiles, setSelectedFiles,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop
  } = useRepoManager();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, color: colors.text, display: 'flex', flexDirection: 'column' }}>

      {/* Top Header */}
      <header style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.card, padding: '16px 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: '900', fontSize: 24, letterSpacing: -1, color: colors.text }}>
              repoin<span style={{ color: colors.primary }}>t</span>xt
            </span>
            <span style={{ fontSize: 10, fontWeight: '800', backgroundColor: colors.primary + '20', color: colors.primary, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
              PRO
            </span>
          </div>

          {/* GitHub Rate Limit Info */}
          {githubRateLimit && (
            <div style={{ fontSize: 11, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon name="github" size={12} color={colors.textSecondary} />
              <span>API Rate: <strong>{githubRateLimit.remaining}</strong>/<strong>{githubRateLimit.limit}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: isMobile ? '16px 12px 40px' : '28px 20px 40px', boxSizing: 'border-box' }}>

        {/* Loading Overlay / Progress */}
        {loading && (
          <div style={{ backgroundColor: colors.primary + '15', border: `1px solid ${colors.primary}`, borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="zap" size={16} color={colors.primary} />
            <span style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{loadingMessage || 'Processing codebase...'}</span>
          </div>
        )}

        {/* Input Setup Card */}
        <InputSection
          activeTab={activeTab} setActiveTab={setActiveTab}
          githubUrl={githubUrl} setGithubUrl={setGithubUrl}
          githubBranch={githubBranch} setGithubBranch={setGithubBranch}
          githubToken={githubToken} setGithubToken={setGithubToken}
          urlHistory={urlHistory} ignorePatterns={ignorePatterns} setIgnorePatterns={setIgnorePatterns}
          removeComments={removeComments} setRemoveComments={setRemoveComments}
          removeExtraWhitespace={removeExtraWhitespace} setRemoveExtraWhitespace={setRemoveExtraWhitespace}
          maxContextTokens={maxContextTokens} setMaxContextTokens={setMaxContextTokens}
          maxFileSize={maxFileSize} setMaxFileSize={setMaxFileSize}
          loading={loading} fetchGitHubRepo={fetchGitHubRepo}
          pickLocalFiles={pickLocalFiles} pickLocalDirectory={pickLocalDirectory}
          isDragging={isDragging} handleDragEnter={handleDragEnter} handleDragLeave={handleDragLeave}
          handleDragOver={handleDragOver} handleDrop={handleDrop}
          isMobile={isMobile}
        />

        {/* Selection Tree Area */}
        {sources.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <SelectionComponent
              tree={treeData?.tree}
              sources={sources}
              removeSource={removeSource}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              onGenerate={generateText}
              loading={loading}
              preamble={preamble}
              setPreamble={setPreamble}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Output Section */}
        {outputBatches.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <OutputSection
              outputBatches={outputBatches}
              activeBatchIndex={activeBatchIndex}
              setActiveBatchIndex={setActiveBatchIndex}
              isMobile={isMobile}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: '16px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: colors.textSecondary }}>
          repointxt • Corbit Technologies
        </span>
      </footer>
    </div>
  );
}