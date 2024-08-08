CREATE EXTENSION IF NOT EXISTS vector;

-- 001_create_branches_table.sql
CREATE TABLE IF NOT EXISTS Branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    ref TEXT NOT NULL,
    commitHash TEXT NOT NULL,
    UNIQUE (owner, repo, ref)
);

-- 002_create_file_details_table.sql
CREATE TABLE IF NOT EXISTS FileDetails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    branchId uuid NOT NULL REFERENCES Branches(id),
    commitHash TEXT NOT NULL,
    tokenCount INT NOT NULL DEFAULT 0,
    embeddings VECTOR(256),
    UNIQUE (branchId, path)
);

CREATE INDEX IF NOT EXISTS idx_embeddings ON FileDetails USING ivfflat (embeddings vector_cosine_ops);



-- 003_create_similarity_search_function.sql
CREATE OR REPLACE FUNCTION find_similar_files(given_branch_id TEXT, query_embeddings vector, top_k INT)
RETURNS TABLE (
    id INT,
    owner TEXT,
    repo TEXT,
    ref TEXT,
    name TEXT,
    path TEXT,
    content TEXT,
    commitHash TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fd.id,
        b.owner,
        b.repo,
        b.ref,
        fd.name,
        fd.path,
        fd.content,
        fd.commitHash,
        (1 - (fd.embeddings <=> query_embeddings)) AS similarity
    FROM
        FileDetails fd
    INNER JOIN Branches b ON fd.branchId = b.id
    WHERE 
         b.id = given_branch_id AND 
         (1 - (fd.embeddings <=> query_embeddings)) > 0.01
    ORDER BY similarity desc
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql;
