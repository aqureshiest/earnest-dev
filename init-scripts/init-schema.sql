-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create FileDetails table
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
  UNIQUE (owner, repo, ref, path)
);

-- Create BranchCommits table
CREATE TABLE IF NOT EXISTS BranchCommits (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  ref TEXT NOT NULL,
  commitHash TEXT NOT NULL,
  UNIQUE (owner, repo, ref)
);

-- Create extensions table
CREATE TABLE IF NOT EXISTS extensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  output_schema JSONB NOT NULL,
  ui_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON extensions
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Create FileChunks table
CREATE TABLE IF NOT EXISTS FileChunks (
  id SERIAL PRIMARY KEY,
  fileId INT NOT NULL,
  chunkIndex INT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT 'main',
  tokenCount INT NOT NULL DEFAULT 0,
  embeddings VECTOR(256),
  FOREIGN KEY (fileId) REFERENCES FileDetails(id) ON DELETE CASCADE
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_chunk_embeddings 
ON FileChunks USING ivfflat (embeddings vector_cosine_ops);

-- Create function to find similar chunks
CREATE OR REPLACE FUNCTION find_similar_chunks(
  given_owner TEXT,
  given_repo TEXT,
  given_ref TEXT,
  query_embeddings VECTOR
)
RETURNS TABLE (
  file_id INT,
  path TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.fileId as file_id,
    c.path,
    MAX(1 - (c.embeddings <=> query_embeddings)) AS similarity
  FROM 
    FileChunks c
  WHERE 
    c.owner = given_owner AND
    c.repo = given_repo AND
    c.ref = given_ref
  GROUP BY 
    c.fileId, c.path
  ORDER BY 
    similarity DESC;
END;
$$ LANGUAGE plpgsql;