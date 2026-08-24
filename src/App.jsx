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
      <header style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.card, padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: colors.primaryGradient }}>
              <Icon name="zap" size={18} color="#ffffff" />
            </div>
            <span style={{ fontWeight: '900', fontSize: 22, letterSpacing: -0.5, color: colors.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              repoin<span style={{ color: colors.primary }}>t</span>xt
            </span>
            <span style={{ fontSize: 10, fontWeight: '800', backgroundColor: colors.primary + '20', color: colors.primary, padding: '3px 8px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              GEMINI 2.0 & GPT-4o READY
            </span>
          </div>

          {/* GitHub Rate Limit Info */}
          {githubRateLimit && (
            <div style={{ fontSize: 11, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: colors.surface, padding: '4px 10px', borderRadius: 20, border: `1px solid ${colors.border}` }}>
              <Icon name="github" size={13} color={colors.textSecondary} />
              <span>API Rate: <strong>{githubRateLimit.remaining}</strong> / {githubRateLimit.limit}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: 1020, width: '100%', margin: '0 auto', padding: isMobile ? '16px 12px 40px' : '32px 24px 48px', boxSizing: 'border-box' }}>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: '800', margin: '0 0 6px 0', color: colors.text, letterSpacing: '-0.5px' }}>
            Pack Repository Context for LLMs
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            Convert GitHub repositories or local code into token-split context bundles for Gemini 2.0, Claude 3.5, and ChatGPT.
          </p>
        </div>

        {/* Loading Overlay / Progress */}
        {loading && (
          <div style={{ backgroundColor: colors.primary + '18', border: `1px solid ${colors.primary}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(0,85,255,0.15)' }}>
            <Icon name="zap" size={18} color={colors.primary} />
            <span style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{loadingMessage || 'Processing codebase...'}</span>
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