// Pattern cache to avoid recompiling regex on every call
const patternCache = new Map();

// Get compiled patterns from cache or create new
const getCompiledPatterns = (patterns) => {
    if (!patternCache.has(patterns)) {
        const compiled = patterns.split(',').map(p => {
            const trimmed = p.trim();
            if (!trimmed) return null;
            if (trimmed.includes('*')) {
                // Escape special regex chars except *, then convert * to .*
                const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(escaped.replace(/\*/g, '.*'));
            }
            return trimmed;
        }).filter(Boolean);
        patternCache.set(patterns, compiled);
    }
    return patternCache.get(patterns);
};

// Clear cache when patterns change significantly
export const clearPatternCache = () => patternCache.clear();

export const shouldIgnore = (path, patterns) => {
    const compiled = getCompiledPatterns(patterns);
    return compiled.some(pattern =>
        pattern instanceof RegExp ? pattern.test(path) : path.includes(pattern)
    );
};

export const formatStructure = (obj, level, prefix = '', optimizationLevel = 0) => {
    const parts = [];
    const entries = Object.entries(obj).sort((a, b) => {
        const aIsFile = a[1] === null;
        const bIsFile = b[1] === null;
        if (aIsFile && !bIsFile) return 1;
        if (!aIsFile && bIsFile) return -1;
        return a[0].localeCompare(b[0]);
    });

    entries.forEach(([key, value], index) => {
        if (optimizationLevel === 0) {
            // Standard with tree chars
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const nextPrefix = isLast ? '    ' : '│   ';
            parts.push(`${prefix}${connector}${key}`);
            if (value !== null) {
                parts.push(formatStructure(value, level + 1, prefix + nextPrefix, optimizationLevel));
            }
        } else if (optimizationLevel === 1) {
            // Compact with spaces
            parts.push(`${'  '.repeat(level)}${key}`);
            if (value !== null) {
                parts.push(formatStructure(value, level + 1, '', optimizationLevel));
            }
        } else {
            // Flat list - actually buildDirStructure will handle this better if we just return paths
            // but let's keep it consistent here
            parts.push(`${' '.repeat(level)}${key}`);
            if (value !== null) {
                parts.push(formatStructure(value, level + 1, '', optimizationLevel));
            }
        }
    });

    return parts.join('\n');
};

export const buildDirStructure = (tree, patterns, optimizationLevel = 0) => {
    const files = tree
        .filter(item => !shouldIgnore(item.path, patterns))
        .map(item => item.path);

    const structure = {};
    files.forEach(path => {
        const parts = path.split('/');
        let current = structure;
        parts.forEach((part, idx) => {
            if (!current[part]) {
                current[part] = idx === parts.length - 1 ? null : {};
            }
            if (idx < parts.length - 1) {
                current = current[part];
            }
        });
    });

    return formatStructure(structure, 0, '', optimizationLevel);
};

export const estimateTokens = (text) => {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
};

// Image file extensions - these will be completely skipped
const IMAGE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.psd', '.svg', '.heic', '.heif'
]);

// Binary file extensions - these cannot be read as text
const BINARY_EXTENSIONS = new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.psd', '.svg', '.heic', '.heif',
    // Audio/Video
    '.mov', '.mp4', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac',
    // Archives (except .zip which we handle specially)
    '.gz', '.tar', '.7z', '.rar', '.dmg', '.iso', '.pkg', '.bz2', '.xz',
    // Executables/Compiled
    '.exe', '.dll', '.so', '.a', '.o', '.pyc', '.class', '.jar', '.bin', '.dat', '.db', '.sqlite', '.wasm',
    // Fonts
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    // Documents (Binary formats)
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
]);

// Get extension from path (cached operation)
export const getExtension = (path) => {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1) return 'no extension';
    const lastSlash = path.lastIndexOf('/');
    if (lastDot < lastSlash) return 'no extension';
    return path.slice(lastDot).toLowerCase();
};

export const isImageFile = (path) => {
    return IMAGE_EXTENSIONS.has(getExtension(path));
};

export const isBinaryFile = (path) => {
    return BINARY_EXTENSIONS.has(getExtension(path));
};

export const isZipFile = (path) => {
    return getExtension(path) === '.zip';
};

// Legacy export for backwards compatibility
export const isProbablyText = (path) => !isBinaryFile(path);

// Smart select files
export const smartSelectFiles = (treeItems) => {
    // 1. Identify Framework based on key files
    const filePaths = treeItems.map(item => item.path);
    let projectType = 'unknown';

    if (filePaths.includes('package.json')) {
        projectType = 'node';
    } else if (filePaths.includes('Cargo.toml')) {
        projectType = 'rust';
    } else if (filePaths.includes('pubspec.yaml')) {
        projectType = 'flutter';
    } else if (filePaths.includes('requirements.txt') || filePaths.includes('pyproject.toml')) {
        projectType = 'python';
    } else if (filePaths.includes('pom.xml') || filePaths.includes('build.gradle')) {
        projectType = 'java';
    } else if (filePaths.includes('go.mod')) {
        projectType = 'go';
    }

    // 2. Define important folders to select depending on framework
    let autoSelectPrefixes = [];
    if (projectType === 'node') {
        autoSelectPrefixes = ['src/', 'lib/', 'app/', 'pages/', 'components/', 'utils/', 'hooks/'];
    } else if (projectType === 'rust') {
        autoSelectPrefixes = ['src/'];
    } else if (projectType === 'flutter') {
        autoSelectPrefixes = ['lib/'];
    } else if (projectType === 'python') {
        autoSelectPrefixes = ['src/', 'app/', 'main/']; // very variable, just guessing some common ones
    } else if (projectType === 'java') {
        autoSelectPrefixes = ['src/main/'];
    } else if (projectType === 'go') {
        autoSelectPrefixes = ['cmd/', 'pkg/', 'internal/'];
    }

    // Always keep root files (no slash) and some universal docs
    const isRootFile = (path) => !path.includes('/');

    // 3. Count files per folder to unselect huge folders
    const folderCounts = {};
    treeItems.forEach(item => {
        const parts = item.path.split('/');
        if (parts.length > 1) {
            const folderPath = parts.slice(0, -1).join('/');
            folderCounts[folderPath] = (folderCounts[folderPath] || 0) + 1;
        }
    });

    const HUGE_FOLDER_LIMIT = 150;
    const hugeFolders = Object.keys(folderCounts).filter(folder => folderCounts[folder] > HUGE_FOLDER_LIMIT);

    // 4. Apply filtering
    return treeItems.filter(item => {
        // Skip files in huge folders
        for (const hugeFolder of hugeFolders) {
            if (item.path.startsWith(hugeFolder + '/')) {
                return false;
            }
        }

        // If framework recognized, filter strictly. Otherwise keep all.
        if (projectType !== 'unknown') {
            if (isRootFile(item.path)) return true;
            for (const prefix of autoSelectPrefixes) {
                if (item.path.startsWith(prefix)) return true;
            }
            return false;
        }

        return true;
    });
};
