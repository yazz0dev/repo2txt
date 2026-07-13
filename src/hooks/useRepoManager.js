import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { shouldIgnore, buildDirStructure, estimateTokens, isImageFile, getExtension, smartSelectFiles } from '../utils/fileHelpers';
import { optimizeContent } from '../utils/contentOptimization';
import { DEFAULT_IGNORE_PATTERNS, DEFAULT_UNSELECT_PATTERNS } from '../utils/constants';
import { extractTextFromPdf } from '../utils/pdfProcessor';
import { saveGitHubToken, loadGitHubToken, saveUrlToHistory, loadUrlHistory, saveAppSettings, loadAppSettings } from '../utils/storage';
import { parseGitignore } from '../utils/gitignoreParser';
import { getLanguageFromExtension } from '../utils/languageMap';

const BATCH_SIZE = 25;
const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000;

export const useRepoManager = () => {
    const [loading, setLoading] = useState(false);
    const [ignorePatterns, setIgnorePatterns] = useState(DEFAULT_IGNORE_PATTERNS.join(', '));
    const [preamble, setPreamble] = useState('');
    const [removeComments, setRemoveComments] = useState(true);
    const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState(true);
    const [includeOnlyCode, setIncludeOnlyCode] = useState(false);
    const [maxFileSize, setMaxFileSize] = useState('100');
    const [activeTab, setActiveTab] = useState('github');
    const [tokenOptimizationLevel, setTokenOptimizationLevel] = useState(0);
    const [respectGitignore, setRespectGitignore] = useState(true);

    const [sources, setSources] = useState([]); 
    const [githubUrl, setGithubUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [urlHistory, setUrlHistory] = useState([]);
    const [combinedOutput, setCombinedOutput] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const blobUrlsRef = useRef([]);
    const githubApiCacheRef = useRef(new Map());
    const githubFileCacheRef = useRef(new Map());

    const createTrackedBlobUrl = useCallback((file) => {
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);
        return url;
    }, []);

    const cleanupBlobUrls = useCallback(() => {
        blobUrlsRef.current.forEach(url => { try { URL.revokeObjectURL(url); } catch (e) { } });
        blobUrlsRef.current = [];
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
            if (settings.maxFileSize) setMaxFileSize(settings.maxFileSize);
            if (settings.tokenOptimizationLevel !== undefined) setTokenOptimizationLevel(settings.tokenOptimizationLevel);
        }
        return cleanupBlobUrls;
    }, []);

    useEffect(() => {
        saveAppSettings({ ignorePatterns, removeComments, removeExtraWhitespace, maxFileSize, tokenOptimizationLevel });
        saveGitHubToken(githubToken);
    }, [ignorePatterns, removeComments, removeExtraWhitespace, maxFileSize, tokenOptimizationLevel, githubToken]);

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
            prev.forEach(s => s.selectedFiles.forEach(f => currentFlat.push({ ...f, path: prev.length > 1 ? `${s.name}/${f.path}` : f.path, originalPath: f.path, sourceId: s.id })));
            const nextFlat = typeof updater === 'function' ? updater(currentFlat) : updater;
            const grouped = {};
            nextFlat.forEach(f => { if (!grouped[f.sourceId]) grouped[f.sourceId] = []; grouped[f.sourceId].push({ ...f, path: f.originalPath }); });
            return prev.map(s => ({ ...s, selectedFiles: grouped[s.id] || [] }));
        });
    }, []);

    const fetchGitHubRepo = useCallback(async (isAdding = false) => {
        if (!githubUrl.trim()) return window.alert('Enter a GitHub URL');
        setLoading(true);
        if (!isAdding) { setSources([]); setCombinedOutput(''); }

        try {
            const cleanUrl = githubUrl.trim().replace(/\/$/, '');
            const urlMatch = cleanUrl.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)$/i) || cleanUrl.match(/^([^\/]+)\/([^\/]+)$/i);
            if (!urlMatch) throw new Error('Invalid GitHub URL');
            const [, owner, repo] = urlMatch;
            const cleanRepo = repo.replace(/\.git$/, '');
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

            const repoResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
            if (!repoResp.ok) throw new Error('Repo not found');
            const repoData = await repoResp.json();
            const branch = repoData.default_branch;

            const treeResp = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${branch}?recursive=1`, { headers });
            if (!treeResp.ok) throw new Error('Failed to fetch tree');
            const treeDataResult = await treeResp.json();

            const validTreeItems = treeDataResult.tree.filter(i => {
                if (i.type !== 'blob' || shouldIgnore(i.path, ignorePatterns)) return false;
                for (const unselectPattern of DEFAULT_UNSELECT_PATTERNS) {
                    if (i.path.endsWith(unselectPattern)) return false;
                }
                return true;
            });

            const newSource = {
                id: `gh-${Date.now()}`,
                type: 'github',
                name: cleanRepo,
                owner, repo: cleanRepo, branch,
                tree: treeDataResult.tree.filter(i => i.type === 'blob'),
                selectedFiles: smartSelectFiles(validTreeItems)
            };

            setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            setGithubUrl('');
            saveUrlToHistory(githubUrl); setUrlHistory(loadUrlHistory());
        } catch (e) { window.alert(e.message); }
        finally { setLoading(false); }
    }, [githubUrl, githubToken, ignorePatterns]);

    const pickLocalDirectory = useCallback(async (isAdding = false) => {
        setLoading(true);
        if (!isAdding) { setSources([]); setCombinedOutput(''); }
        try {
            if (window.showDirectoryPicker) {
                const handle = await window.showDirectoryPicker();
                const files = [];
                const read = async (h, p = '') => {
                    for await (const e of h.values()) {
                        const ep = p ? `${p}/${e.name}` : e.name;
                        if (e.kind === 'directory') { if (!shouldIgnore(ep, ignorePatterns)) await read(e, ep); }
                        else if (e.kind === 'file' && !shouldIgnore(ep, ignorePatterns) && !isImageFile(ep)) {
                            const f = await e.getFile();
                            files.push({ path: ep, size: f.size, url: createTrackedBlobUrl(f), file: f });
                        }
                    }
                };
                await read(handle);
                const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `loc-${Date.now()}-${i}` }));
                const validTreeItems = treeItems.filter(i => {
                    for (const unselectPattern of DEFAULT_UNSELECT_PATTERNS) {
                        if (i.path.endsWith(unselectPattern)) return false;
                    }
                    return true;
                });
                const newSource = { id: `loc-${Date.now()}`, type: 'local', name: handle.name, tree: treeItems, selectedFiles: smartSelectFiles(validTreeItems) };
                setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            } else {
                window.alert("Directory picking is not supported in your browser.");
            }
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }, [ignorePatterns, createTrackedBlobUrl]);

    const pickLocalFiles = useCallback(async (isAdding = false) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e) => {
            setLoading(true);
            if (!isAdding) { setSources([]); setCombinedOutput(''); }
            try {
                const selected = Array.from(e.target.files);
                const treeItems = selected.filter(f => !shouldIgnore(f.name, ignorePatterns) && !isImageFile(f.name)).map((f, i) => {
                    return { path: f.name, type: 'blob', size: f.size, url: createTrackedBlobUrl(f), file: f, sha: `loc-file-${Date.now()}-${i}` };
                });
                const validTreeItems = treeItems.filter(i => {
                    for (const unselectPattern of DEFAULT_UNSELECT_PATTERNS) {
                        if (i.path.endsWith(unselectPattern)) return false;
                    }
                    return true;
                });
                const newSource = { id: `loc-files-${Date.now()}`, type: 'local', name: 'Local Files', tree: treeItems, selectedFiles: smartSelectFiles(validTreeItems) };
                setSources(prev => isAdding ? [...prev, newSource] : [newSource]);
            } catch (err) { console.log(err); }
            finally { setLoading(false); }
        };
        input.click();
    }, [ignorePatterns, createTrackedBlobUrl]);

    const generateText = useCallback(async () => {
        if (sources.length === 0 || selectedFiles.length === 0) return;
        setLoading(true);
        try {
            const parts = [];
            if (preamble.trim()) parts.push(`INSTRUCTIONS:\n${preamble}\n${'='.repeat(20)}`);
            parts.push(`# AI Context Bundle - ${new Date().toLocaleDateString()}\n`);
            
            const filesToProcess = [];
            for (const s of sources) {
                if (s.selectedFiles.length === 0) continue;
                filesToProcess.push(...s.selectedFiles.map(f => ({ 
                    ...f, 
                    sourceName: s.name, 
                    sourceType: s.type, 
                    sourceOwner: s.owner, 
                    sourceRepo: s.repo 
                })));
            }

            const BATCH_SIZE = 15;
            for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
                const batch = filesToProcess.slice(i, i + BATCH_SIZE);
                
                const batchResults = await Promise.all(batch.map(async (f) => {
                    try {
                        let content = '';
                        if (f.sourceType === 'github') {
                            const headers = { 'Accept': 'application/vnd.github.v3.raw' };
                            if (githubToken.trim()) headers['Authorization'] = `Bearer ${githubToken.trim()}`;
                            const resp = await fetch(`https://api.github.com/repos/${f.sourceOwner}/${f.sourceRepo}/contents/${f.path}`, { headers });
                            if (!resp.ok) throw new Error(`Failed to fetch file content`);
                            content = await resp.text();
                        } else {
                            if (f.file) {
                                content = await f.file.text();
                            } else {
                                const resp = await fetch(f.url);
                                if (!resp.ok) throw new Error(`Failed to read file`);
                                content = await resp.text();
                            }
                        }
                        const opt = optimizeContent(content, f.path, { removeComments, removeExtraWhitespace });
                        return `\n---\nFILE: ${f.sourceName}/${f.path}\n\`\`\`\n${opt}\n\`\`\``;
                    } catch (err) {
                        return `\n---\nFILE: ${f.sourceName}/${f.path}\n[Error reading file: ${err.message}]`;
                    }
                }));

                parts.push(...batchResults);
                
                // Yield to the browser main thread to keep UI completely responsive and allow GC
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const outputText = parts.join('\n');
            setCombinedOutput(outputText);
            navigator.clipboard.writeText(outputText).catch(e => console.log('Auto-copy failed', e));
        } catch (e) { 
            window.alert('Generation failed'); 
        } finally { 
            setLoading(false); 
        }
    }, [sources, preamble, removeComments, removeExtraWhitespace, githubToken]);

    const removeSource = useCallback((id) => {
        setSources(prev => prev.filter(s => s.id !== id));
    }, []);

    return {
        loading, sources, githubUrl, setGithubUrl, githubToken, setGithubToken, urlHistory,
        combinedOutput, isDragging, ignorePatterns, setIgnorePatterns, preamble, setPreamble,
        removeComments, setRemoveComments, removeExtraWhitespace, setRemoveExtraWhitespace,
        includeOnlyCode, setIncludeOnlyCode, maxFileSize, setMaxFileSize, activeTab, setActiveTab,
        tokenOptimizationLevel, setTokenOptimizationLevel, respectGitignore, setRespectGitignore,
        fetchGitHubRepo, pickLocalDirectory, generateText, removeSource,
        treeData, selectedFiles, setSelectedFiles, githubOutput: combinedOutput, localOutput: combinedOutput,
        githubTokenCount: estimateTokens(combinedOutput), localTokenCount: estimateTokens(combinedOutput),
        showGithubSelection: sources.length > 0, showLocalSelection: sources.length > 0,
        pickLocalFiles,
        handleDragEnter: (e) => { e.preventDefault(); setIsDragging(true); },
        handleDragLeave: () => setIsDragging(false),
        handleDragOver: (e) => e.preventDefault(),
        handleDrop: async (e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!e.dataTransfer || !e.dataTransfer.items) return;
            setLoading(true);
            try {
                const files = [];
                const processEntry = async (entry, path = '') => {
                    if (entry.isFile) {
                        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
                        const filePath = path ? `${path}/${file.name}` : file.name;
                        if (!shouldIgnore(filePath, ignorePatterns) && !isImageFile(filePath)) {
                            files.push({ path: filePath, size: file.size, url: createTrackedBlobUrl(file), file: file });
                        }
                    } else if (entry.isDirectory) {
                        const dirPath = path ? `${path}/${entry.name}` : entry.name;
                        if (!shouldIgnore(dirPath, ignorePatterns)) {
                            const reader = entry.createReader();
                            const readEntries = async () => {
                                const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
                                if (entries.length > 0) {
                                    for (const child of entries) {
                                        await processEntry(child, dirPath);
                                    }
                                    await readEntries();
                                }
                            };
                            await readEntries();
                        }
                    }
                };

                for (let i = 0; i < e.dataTransfer.items.length; i++) {
                    const item = e.dataTransfer.items[i];
                    if (item.webkitGetAsEntry) {
                        const entry = item.webkitGetAsEntry();
                        if (entry) await processEntry(entry);
                    }
                }

                if (files.length > 0) {
                    const treeItems = files.map((f, i) => ({ ...f, type: 'blob', sha: `drop-${Date.now()}-${i}` }));
                    const validTreeItems = treeItems.filter(i => {
                        for (const unselectPattern of DEFAULT_UNSELECT_PATTERNS) {
                            if (i.path.endsWith(unselectPattern)) return false;
                        }
                        return true;
                    });
                    const newSource = { id: `drop-${Date.now()}`, type: 'local', name: 'Dropped Files', tree: treeItems, selectedFiles: smartSelectFiles(validTreeItems) };
                    setSources(prev => [...prev, newSource]);
                }
            } catch (err) {
                console.log('Drop error', err);
            } finally {
                setLoading(false);
            }
        }
    };
};
