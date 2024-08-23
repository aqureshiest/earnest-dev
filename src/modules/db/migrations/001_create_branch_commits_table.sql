CREATE TABLE IF NOT EXISTS BranchCommits (
    id SERIAL PRIMARY KEY,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    commitHash TEXT NOT NULL,
    UNIQUE (owner, repo, branch)
);
