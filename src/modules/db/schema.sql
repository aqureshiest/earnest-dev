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


-- 002_create_similarity_search_function.sql 
-- top_k INT
CREATE OR REPLACE FUNCTION find_similar_files(given_owner TEXT, given_repo TEXT, given_ref TEXT, query_embeddings vector)
RETURNS TABLE (
    id INT,
    name TEXT,
    path TEXT,
    content TEXT,
    owner TEXT,
    repo TEXT,
    ref TEXT,
    commitHash TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        FileDetails.id,
        FileDetails.name,
        FileDetails.path,
        FileDetails.content,
        FileDetails.owner,
        FileDetails.repo,
        FileDetails.ref,
        FileDetails.commitHash,
        (1 - (FileDetails.embeddings <=> query_embeddings)) AS similarity
    FROM
        FileDetails
    WHERE 
         filedetails.owner = given_owner AND 
         filedetails.repo = given_repo AND 
         filedetails.ref = given_ref 
        --  (1 - (FileDetails.embeddings <=> query_embeddings)) > 0.01
    ORDER BY similarity desc;
    -- LIMIT top_k;
END;
$$ LANGUAGE plpgsql;


-- 003_create_branch_commit_table.sql
CREATE TABLE IF NOT EXISTS BranchCommits (
    id SERIAL PRIMARY KEY,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    ref TEXT NOT NULL,
    commitHash TEXT NOT NULL,
    UNIQUE (owner, repo, ref)
);



-- 004_create_extension_table.sql
create table public.extensions (
    id text primary key,
    name text not null,
    description text,
    system_prompt text not null,
    output_schema jsonb not null,
    ui_config jsonb not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone
);

-- Enable RLS
alter table public.extensions enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.extensions
    for select using (true);

create policy "Enable insert for authenticated users only" on public.extensions
    for insert with check (auth.role() = 'authenticated');

-- Create updated_at trigger
create function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
    before update on public.extensions
    for each row
    execute function public.handle_updated_at();