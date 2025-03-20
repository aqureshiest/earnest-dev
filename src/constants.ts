export const EXCLUDE_PATTERNS = [
    "ignore",
    ".gitignore",
    ".gitmodules",
    ".gitkeep",
    "node_modules/",
    "build/",
    "dist/",
    "out/",
    ".git/",
    ".github/",
    "__pycache__/",
    "venv/",
    ".log",
    ".tmp",
    ".bak",
    ".lock",
    ".tar.gz",
    ".zip",
    ".7z",
    ".rar",
    ".min.js",
    ".map",
    ".coverage",
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
    ".sqlite",
    ".db",
    ".mp3",
    ".mp4",
    ".avi",
    ".mkv",
    ".mov",
    ".flv",
    ".wmv",
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
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    "public/",
    "coverage/",
    ".test.js",
    ".test.jsx",
    ".spec.js",
    ".spec.jsx",
    ".snap",
    "package-lock.json",
    "yarn.lock",
    ".env",
    ".env.",
    ".egg-info/",
    ".pytest_cache/",
    ".tox/",
    ".pylintrc",
    ".pydoc",
    "requirements.txt",
    "Pipfile.lock",
    ".txt",
    ".xsd",
];

export const EMBEDDINGS_MODEL = "text-embedding-3-large";
export const TITAN_EMBEDDINGS_MODEL = "amazon.titan-embed-text-v2:0";
export const EMBEDDINGS_DIMENSIONS = 256;
export const EMBEDDINGS_MAX_TOKENS = 8191;

export const CODEFILES_PLACEHOLDER = "[[EXISTINGCODEFILES]]";
export const TASK_PLACEHOLDER = "[[TASKDESCRIPTION]]";
export const SPECS_PLACEHOLDER = "[[SPECIFICATIONS]]";
export const PLAN_PLACEHOLDER = "[[IMPLEMENTATIONPLAN]]";
export const GENERATED_CODE_PLACEHOLDER = "[[GENERATEDCODE]]";

export const CHUNK_ANALYSES_PLACEHOLDER = "[[CHUNKANALYSES]]";
export const TECHNICAL_DESIGN_DOC_PLACEHOLDER = "[[TECHNICALDESIGNDOC]]";
export const FEATURE_PLACEHOLDER = "[[FEATUREFORJIRA]]";

export const CRITICAL_PATTERNS_PLACEHOLDER = "[[CRITICALPATTERNS]]";

export const PRD_ANALYSIS_PLACEHOLDER = "[[PRODUCTDOCUMENT]]";

// archive assistants
export const REPO_ANALYSIS_PLACEHOLDER = "[[REPOANALYSIS]]";
export const GAP_ANALYSIS_PLACEHOLDER = "[[GAPANALYSIS]]";
