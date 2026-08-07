import { DEFAULT_IGNORE_PATTERNS, NON_CODE_EXTENSIONS } from './constants';

const patternCache = new Map();

const getCompiledPatterns = (patternsStr) => {
  if (!patternCache.has(patternsStr)) {
    const compiled = patternsStr
      .split(',')
      .map(p => {
        const trimmed = p.trim();
        if (!trimmed) return null;
        if (trimmed.includes('*')) {
          const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(escaped.replace(/\*/g, '.*'));
        }
        return trimmed;
      })
      .filter(Boolean);
    patternCache.set(patternsStr, compiled);
  }
  return patternCache.get(patternsStr);
};

export const shouldIgnore = (path, patternsStr = DEFAULT_IGNORE_PATTERNS.join(', ')) => {
  if (!path) return true;

  // Hard safety check for critical freeze vectors
  const lower = path.toLowerCase();
  if (
    lower.includes('node_modules/') || lower.startsWith('node_modules') ||
    lower.includes('/.git/') || lower.startsWith('.git') ||
    lower.includes('/target/') || lower.includes('/vendor/') ||
    lower.includes('/dist/') || lower.includes('/build/')
  ) {
    return true;
  }

  const compiled = getCompiledPatterns(patternsStr);
  return compiled.some(pattern =>
    pattern instanceof RegExp ? pattern.test(path) : path.includes(pattern)
  );
};

export const getExtension = (path) => {
  if (!path) return '';
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  const lastSlash = path.lastIndexOf('/');
  if (lastDot < lastSlash) return '';
  return path.slice(lastDot).toLowerCase();
};

export const isCodeFile = (path) => {
  const ext = getExtension(path);
  if (!ext) return true;
  return !NON_CODE_EXTENSIONS.has(ext);
};

export const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
};

export const smartSelectFiles = (treeItems, codingMode = false) => {
  const filePaths = treeItems.map(item => item.path);

  return treeItems.filter(item => {
    if (shouldIgnore(item.path)) return false;

    // In Coding Mode, exclude non-source files
    if (codingMode && !isCodeFile(item.path)) {
      return false;
    }

    // Skip root-level huge files or generated assets
    if (item.size && item.size > 250 * 1024) return false;

    return true;
  });
};

export const chunkFilesByTokenLimit = (files, maxTokens = 128000) => {
  if (!maxTokens || maxTokens <= 0) return [files];

  const batches = [];
  let currentBatch = [];
  let currentTokens = 0;

  for (const file of files) {
    // Rough estimate: file size in bytes / 3.8
    const fileEstTokens = Math.ceil((file.size || 4000) / 3.8) + 200;

    if (currentTokens + fileEstTokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [file];
      currentTokens = fileEstTokens;
    } else {
      currentBatch.push(file);
      currentTokens += fileEstTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches.length > 0 ? batches : [files];
};