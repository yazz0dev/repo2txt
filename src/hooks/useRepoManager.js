import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  shouldIgnore,
  estimateTokens,
  smartSelectFiles,
  chunkFilesByTokenLimit,
  isCodeFile
} from '../utils/fileHelpers';
import { optimizeContent } from '../utils/contentOptimization';
import { DEFAULT_IGNORE_PATTERNS } from '../utils/constants';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';

export const useRepoManager = () => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
  const [preamble, setPreamble] = useState('');
  const [removeComments, setRemoveComments] = useState(true);
  const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
  const [maxContextTokens, setMaxContextTokens] = useState(1000000); // Default 1M (Gemini Context)
  const [maxFileSize, setMaxFileSize] = useState('250'); // 250KB limit per file
  const [activeTab, setActiveTab] = useState('github');

  const [sources, setSources] = useState([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubRateLimit, setGithubRateLimit] = useState(null);
  const [urlHistory, setUrlHistory] = useState([]);
  const [outputBatches, setOutputBatches] = useState([]); // Supports multi-part context splitting
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const blobUrlsRef = useRef([]);

  const createTrackedBlobUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    const savedToken = loadGitHubToken();
    const savedHistory = loadUrlHistory();
    const settings = loadAppSettings();
    if (savedToken) setGithubToken(savedToken);
    if (savedHistory.length > 0) setUrlHistory(savedHistory);
    if (settings) {
      if (settings.ignorePatterns) setIgnorePatterns(settings.ignorePatterns);
      if (settings.removeComments !== undefined) setRemoveComments(settings.removeComments);
      if (settings.removeExtraWhitespace !== undefined) setRemoveExtraWhitespace(settings.removeExtraWhitespace);
      if (settings.maxContextTokens !== undefined) setMaxContextTokens(settings.maxContextTokens);
      if (settings.maxFileSize) setMaxFileSize(settings.maxFileSize);
    }
  }, []);

  useEffect(() => {
    saveAppSettings({
      ignorePatterns,
      removeComments,
      removeExtraWhitespace,
      maxContextTokens,
      maxFileSize
    });
    saveGitHubToken(githubToken);
  }, [ignorePatterns, removeComments, removeExtraWhitespace, maxContextTokens, maxFileSize, githubToken]);

  const treeData = useMemo(() => {
    const allItems = [];
    sources.forEach(source => {
      source.tree.forEach(item => {
        allItems.push({
          ...item,
          path: sources.length > 1 ? `${source.name}/${item.path}` : item.path,
          originalPath: item.path,
          sourceId: source.id
        });
      });
    });
    return allItems.length > 0 ? { tree: allItems } : null;
  }, [sources]);

  const selectedFiles = useMemo(() => {
    const allSelected = [];
    sources.forEach(source => {
      source.selectedFiles.forEach(file => {
        allSelected.push({
          ...file,
          path: sources.length > 1 ? `${source.name}/${file.path}` : file.path,
          originalPath: file.path,
          sourceId: source.id
        });
      });
    });
    return allSelected;
  }, [sources]);

  const setSelectedFiles = useCallback((updater) => {
    setSources(prev => {
      const currentFlat = [];
      prev.forEach(s => s.selectedFiles.forEach(f => currentFlat.push({
        ...f,
        path: prev.length > 1 ? `${s.name}/${f.path}` : f.path,
        originalPath: f.path,
        sourceId: s.id
      })));
      const nextFlat = typeof updater === 'function' ? updater(currentFlat) : updater;
      const grouped = {};
      nextFlat.forEach(f => {
        if (!grouped[f.sourceId]) grouped[f.sourceId] = [];
        grouped[f.sourceId].push({ ...f, path: f.originalPath });
      });
      return prev.map(s => ({ ...s, selectedFiles: grouped[s.id] || [] }));
    });
  }, []);

  const updateRateLimit = (response) => {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    if (remaining !== null && limit !== null) {
      setGithubRateLimit({ remaining: Number(remaining), limit: Number(limit) });
    }
  };

  const fetchGitHubRepo = useCallback(async (isAdding = false) => {
    if (!githubUrl.trim()) return window.alert('Enter a valid GitHub Repository URL');
    setLoading(true);
    setLoadingMessage('Fetching GitHub tree...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const cleanUrl = githubUrl.trim().replace(/\/$/, '');
      const urlMatch = cleanUrl.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/i) || cleanUrl.match(/^([^\/]+)\/([^\/]+)$/i);
      if (!urlMatch) throw new Error('Invalid GitHub URL format');
      const [, owner, repo] = urlMatch;
      const cleanRepo = repo.replace(/\.git$/, '');

      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

      // Fetch repo detail
      const repoResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
      updateRateLimit(repoResp);
      if (!repoResp.ok) throw new Error(repoResp.status === 403 ? 'Rate limit exceeded or private repo. Add GitHub Token.' : 'Repository not found');

      const repoData = await repoResp.json();
      const targetBranch = githubBranch.trim() || repoData.default_branch;

      // Fetch tree recursively
      const treeResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${targetBranch}?recursive=1`, { headers });
      updateRateLimit(treeResp);
      if (!treeResp.ok) throw new Error('Failed to fetch tree structure');

      const treeDataResult = await treeResp.json();

      const validTreeItems = treeDataResult.tree.filter(i => {
        if (i.type !== 'blob') return false;
        if (shouldIgnore(i.path, ignorePatterns)) return false;
        return true;
      });

      const newSource = {
        id: `gh-${Date.now()}`,
        type: 'github',
        name: cleanRepo,
        owner, repo: cleanRepo, branch: targetBranch,
        tree: validTreeItems,
        selectedFiles: smartSelectFiles(validTreeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      setGithubUrl('');
      saveUrlToHistory(githubUrl);
      setUrlHistory(loadUrlHistory());
    } catch (e) {
      window.alert(e.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [githubUrl, githubBranch, githubToken, ignorePatterns]);

  const pickLocalDirectory = useCallback(async (isAdding = false) => {
    if (!window.showDirectoryPicker) {
      return window.alert("Directory picker is not supported in this browser. Please use 'Select Files' or Drag & Drop.");
    }
    setLoading(true);
    setLoadingMessage('Scanning directory...');
    if (!isAdding) { setSources([]); setOutputBatches([]); }

    try {
      const handle = await window.showDirectoryPicker();
      const files = [];

      const read = async (dirHandle, path = '') => {
        for await (const entry of dirHandle.values()) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          if (entry.kind === 'directory') {
            if (!shouldIgnore(entryPath, ignorePatterns)) {
              await read(entry, entryPath);
            }
          } else if (entry.kind === 'file') {
            if (!shouldIgnore(entryPath, ignorePatterns)) {
              const fileObj = await entry.getFile();
              if (fileObj.size <= Number(maxFileSize) * 1024) {
                files.push({ path: entryPath, size: fileObj.size, url: createTrackedBlobUrl(fileObj), file: fileObj });
              }
            }
          }
        }
      };

      await read(handle);

      const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `loc-${Date.now()}-${i}` }));
      const newSource = {
        id: `loc-${Date.now()}`,
        type: 'local',
        name: handle.name,
        tree: treeItems,
        selectedFiles: smartSelectFiles(treeItems)
      };

      setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [ignorePatterns, maxFileSize, createTrackedBlobUrl]);

  const pickLocalFiles = useCallback(async (isAdding = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e) => {
      setLoading(true);
      setLoadingMessage('Loading files...');
      if (!isAdding) { setSources([]); setOutputBatches([]); }

      try {
        const selected = Array.from(e.target.files);
        const files = selected
          .filter(f => !shouldIgnore(f.name, ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            type: 'blob',
            size: f.size,
            url: createTrackedBlobUrl(f),
            file: f,
            sha: `file-${Date.now()}-${i}`
          }));

        const newSource = {
          id: `files-${Date.now()}`,
          type: 'local',
          name: 'Files Batch',
          tree: files,
          selectedFiles: smartSelectFiles(files)
        };

        setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };
    input.click();
  }, [ignorePatterns, createTrackedBlobUrl]);

  const generateText = useCallback(async () => {
    if (sources.length === 0 || selectedFiles.length === 0) return;
    setLoading(true);
    setLoadingMessage('Optimizing context bundles...');

    try {
      const allFiles = [];
      for (const s of sources) {
        if (s.selectedFiles.length === 0) continue;
        allFiles.push(...s.selectedFiles.map(f => ({
          ...f,
          sourceName: s.name,
          sourceType: s.type
        })));
      }

      // Chunk into batches based on LLM Context Target
      const fileBatches = chunkFilesByTokenLimit(allFiles, maxContextTokens);
      const generatedBatches = [];

      for (let bIndex = 0; bIndex < fileBatches.length; bIndex++) {
        const batchFiles = fileBatches[bIndex];
        const parts = [];

        if (preamble.trim()) {
          parts.push(`SYSTEM INSTRUCTIONS:\n${preamble}\n${'='.repeat(30)}`);
        }

        const batchLabel = fileBatches.length > 1 ? ` (Part ${bIndex + 1} of ${fileBatches.length})` : '';
        parts.push(`# AI Context Bundle${batchLabel} - ${new Date().toLocaleDateString()}\n`);

        const BATCH_SIZE = 15;
        for (let i = 0; i < batchFiles.length; i += BATCH_SIZE) {
          const slice = batchFiles.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(slice.map(async (f) => {
            try {
              let content = '';
              if (f.sourceType === 'github') {
                const headers = { 'Accept': 'application/vnd.github.v3.raw' };
                if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;
                const resp = await fetch(`https://api.github.com/repos/${f.sourceOwner || sources[0].owner}/${f.sourceRepo || sources[0].repo}/contents/${f.originalPath}?ref=${f.branch || sources[0].branch || 'main'}`, { headers });
                if (!resp.ok) throw new Error('Fetch failed');
                content = await resp.text();
              } else {
                content = f.file ? await f.file.text() : await (await fetch(f.url)).text();
              }

              const opt = optimizeContent(content, f.path, { removeComments, removeExtraWhitespace });
              return `\n---\nFILE: ${f.sourceName}/${f.path}\n\`\`\`\n${opt}\n\`\`\``;
            } catch (err) {
              return `\n---\nFILE: ${f.sourceName}/${f.path}\n[Error loading content: ${err.message}]`;
            }
          }));

          parts.push(...batchResults);
          await new Promise(r => setTimeout(r, 0)); // Yield UI thread
        }

        const batchText = parts.join('\n');
        generatedBatches.push({
          part: bIndex + 1,
          totalParts: fileBatches.length,
          text: batchText,
          tokenCount: estimateTokens(batchText),
          charCount: batchText.length
        });
      }

      setOutputBatches(generatedBatches);
      setActiveBatchIndex(0);

      if (generatedBatches.length > 0) {
        navigator.clipboard.writeText(generatedBatches[0].text).catch(() => {});
      }
    } catch (e) {
      window.alert('Failed to generate context bundles');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [sources, selectedFiles, preamble, removeComments, removeExtraWhitespace, maxContextTokens, githubToken]);

  const removeSource = useCallback((id) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    loading, loadingMessage, sources, githubUrl, setGithubUrl, githubBranch, setGithubBranch,
    githubToken, setGithubToken, githubRateLimit, urlHistory,
    outputBatches, activeBatchIndex, setActiveBatchIndex, isDragging,
    ignorePatterns, setIgnorePatterns, preamble, setPreamble,
    removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
    maxContextTokens, setMaxContextTokens,
    maxFileSize, setMaxFileSize, activeTab, setActiveTab,
    fetchGitHubRepo, pickLocalDirectory, pickLocalFiles, generateText, removeSource,
    treeData, selectedFiles, setSelectedFiles,
    combinedOutput: outputBatches[activeBatchIndex]?.text || '',
    tokenCount: outputBatches[activeBatchIndex]?.tokenCount || 0,
    handleDragEnter: (e) => { e.preventDefault(); setIsDragging(true); },
    handleDragLeave: () => setIsDragging(false),
    handleDragOver: (e) => e.preventDefault(),
    handleDrop: async (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (!e.dataTransfer || !e.dataTransfer.files) return;
      setLoading(true);
      setLoadingMessage('Processing dropped files...');
      try {
        const droppedFiles = Array.from(e.dataTransfer.files);
        const valid = droppedFiles
          .filter(f => !shouldIgnore(f.name, ignorePatterns))
          .map((f, i) => ({
            path: f.name,
            type: 'blob',
            size: f.size,
            url: createTrackedBlobUrl(f),
            file: f,
            sha: `drop-${Date.now()}-${i}`
          }));

        if (valid.length > 0) {
          const newSource = {
            id: `drop-${Date.now()}`,
            type: 'local',
            name: 'Dropped Items',
            tree: valid,
            selectedFiles: smartSelectFiles(valid)
          };
          setSources(prev => [...prev, newSource]);
        }
      } catch (err) {
        console.error('Drop processing error', err);
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    }
  };
};