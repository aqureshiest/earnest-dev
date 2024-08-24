# Project Documentation

## Indexing Process Optimization

### Overview
The indexing process has been optimized to store the branch commit hash in the database. This allows for skipping the indexing process if the commit hash has not changed.

### Changes Made
- Added a new column `branchCommitHash` to the `FileDetails` table in the database schema.
- Updated the `getRepositoryFiles` method in `RepositoryService` to retrieve the current commit hash after indexing.
- Implemented a check at the start of the indexing process to compare the current commit hash with the stored commit hash.
- If the commit hashes match, the indexing process is skipped, and similar files are looked up based on the parameters.
- After indexing, the stored commit hash is updated if it has changed.

### Testing
Ensure that all changes are well-tested to maintain the integrity of the existing workflow.
Add test cases to verify the new functionality and ensure existing functionality is not broken.
