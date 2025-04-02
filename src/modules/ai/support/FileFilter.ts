export class FileFilter {
    static shouldExclude(filePath: string, debug: boolean = false): boolean {
        // Normalize path separators
        const normalizedPath = filePath.replace(/\\/g, "/");
        const pathSegments = normalizedPath.split("/");

        // Check for hidden directories (starting with .)
        for (let i = 0; i < pathSegments.length - 1; i++) {
            if (pathSegments[i].startsWith(".") && pathSegments[i] !== ".") {
                if (debug) {
                    console.log(
                        `Excluding file: ${filePath} because of hidden directory: ${pathSegments[i]}`
                    );
                }
                return true;
            }
        }

        // Check directory exclusions (more specific first)
        for (const pattern of DIRECTORY_EXCLUDE_PATTERNS) {
            // Match exact directories or subdirectories, not partial segments
            if (normalizedPath.startsWith(pattern) || normalizedPath.includes("/" + pattern)) {
                if (debug) {
                    console.log(
                        `Excluding file: ${filePath} because of directory pattern: ${pattern}`
                    );
                }
                return true;
            }
        }

        // Check file extensions
        for (const ext of FILE_EXTENSION_EXCLUDE_PATTERNS) {
            if (normalizedPath.endsWith(ext)) {
                if (debug) {
                    console.log(`Excluding file: ${filePath} because of extension: ${ext}`);
                }
                return true;
            }
        }

        // Check exact filenames
        const fileName = pathSegments[pathSegments.length - 1];
        if (EXACT_FILENAME_EXCLUDE_PATTERNS.includes(fileName)) {
            if (debug) {
                console.log(`Excluding file: ${filePath} because of exact filename: ${fileName}`);
            }
            return true;
        }

        // Check for file name patterns
        for (const pattern of FILENAME_PATTERN_EXCLUDE_PATTERNS) {
            if (fileName.includes(pattern)) {
                if (debug) {
                    console.log(
                        `Excluding file: ${filePath} because of filename pattern: ${pattern}`
                    );
                }
                return true;
            }
        }

        return false;
    }
}

/**
 * Directories to exclude (must end with trailing slash)
 */
export const DIRECTORY_EXCLUDE_PATTERNS = [
    // Build outputs and dependencies
    "node_modules/",
    "build/",
    "dist/",
    "out/", // Common output directory for Next.js
    ".next/", // Next.js build directory
    "coverage/",

    // React/TypeScript specific
    "storybook-static/", // Storybook output
    ".storybook/", // Storybook config
    ".cache/",

    // Version control
    ".git/",
    ".github/",

    // Python related
    "__pycache__/",
    "venv/",
    ".egg-info/",
    ".pytest_cache/",
    ".tox/",

    // Docker related
    "docker/data/",
    "gogo/",

    // Other common build/cache directories
    "artifacts/",
    "tmp/",
    "temp/",
    "logs/",
];

/**
 * File extensions to exclude (must include the dot)
 */
export const FILE_EXTENSION_EXCLUDE_PATTERNS = [
    // Compiled JavaScript and sourcemaps
    ".min.js",
    ".min.css",
    ".map",

    // TypeScript/React specific
    ".d.ts.map", // TypeScript declaration maps
    ".tsbuildinfo", // TypeScript build info
    ".snap", // Jest snapshots

    // Build artifacts and logs
    ".log",
    ".tmp",
    ".bak",
    ".cache",
    ".coverage",

    // Lock files
    ".lock", // Keep package-lock.json and yarn.lock as exact matches

    // Archives
    ".tar.gz",
    ".zip",
    ".7z",
    ".rar",

    // Binary files
    ".class",
    ".o",
    ".so",
    ".dll",
    ".exe",
    ".bin",
    ".dylib",
    ".pyc",
    ".pyo",
    ".pyd",

    // Database files
    ".sqlite",
    ".db",

    // Media files
    ".mp3",
    ".mp4",
    ".avi",
    ".mkv",
    ".mov",
    ".flv",
    ".wmv",

    // Image files
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
    ".psd",
    ".ai",
    ".eps",

    // Document files
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",

    // Config/environment files
    ".env",
    ".xsd",
];

/**
 * Exact filenames to exclude
 */
export const EXACT_FILENAME_EXCLUDE_PATTERNS = [
    // Git files
    ".gitignore",
    ".gitmodules",
    ".gitkeep",
    ".gitattributes",

    // Package management
    "package-lock.json", // Include only if you don't need npm scripts
    "yarn.lock", // Include only if you don't need yarn scripts
    "pnpm-lock.yaml",
    "requirements.txt",
    "Pipfile.lock",

    // Config files
    ".eslintrc.js",
    ".eslintrc.json",
    ".prettierrc",
    ".prettierrc.js",
    ".browserslistrc",
    ".editorconfig",
    ".pylintrc",
    ".pydoc",
    "tsconfig.json", // Careful with this one, might be useful for analysis
    "jest.config.js",
    "babel.config.js",

    // Metadata
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",

    // Specific files to exclude
    "go",
    "nets.yml",
];

/**
 * Filename patterns that indicate special files to exclude
 * Use with caution - these can cause false positives
 */
export const FILENAME_PATTERN_EXCLUDE_PATTERNS = [
    // Test files
    ".test.js",
    ".test.jsx",
    ".test.ts",
    ".test.tsx",
    ".spec.js",
    ".spec.jsx",
    ".spec.ts",
    ".spec.tsx",

    // Environment files
    ".env.",

    // Generated/minified code markers
    ".min.",
    ".bundle.",

    // TypeScript/React specific patterns
    ".stories.", // Storybook stories
];
