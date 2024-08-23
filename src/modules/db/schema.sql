CREATE EXTENSION IF NOT EXISTS vector;

-- 001_create_file_details_table.sql
CREATE TABLE IF NOT EXISTS FileDetails (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    ref TEXT NOT NULL DEFAULT 'main',
    commitHash TEXT NOT NULL,
    tokenCount INT NOT NULL DEFAULT 0,
    embeddings VECTOR(256),
    UNIQUE (owner, repo, ref, path)
);

CREATE INDEX IF NOT EXISTS idx_embeddings ON FileDetails USING ivfflat (embeddings vector_cosine_ops);

-- 002_create_branch_commits_table.sql
CREATE TABLE IF NOT EXISTS BranchCommits (
    id SERIAL PRIMARY KEY,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    commitHash TEXT NOT NULL,
    UNIQUE (owner, repo, branch)
);