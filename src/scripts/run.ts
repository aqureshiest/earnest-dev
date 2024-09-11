import { CodeAnalyzer } from "@/modules/ai/assistants/CodeAnalyzer";
import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { GitHubService } from "@/modules/github/GitHubService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import { formatFiles } from "@/modules/utils/formatFiles";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { loadEnvConfig } from "@next/env";
import { encode } from "gpt-tokenizer";

loadEnvConfig("");

async function main() {
    // const dbService = new DatabaseService();

    const text = `const Book = require("../models/Book");

const getAllBooks = (req, res) => {
  Book.all((err, books) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(books);
  });
};

const getBook = (req, res) => {
  const { id } = req.params;
  Book.find(id, (err, book) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    res.json(book);
  });
};

const createBook = (req, res) => {
  const { title, author, isbn } = req.body;
  const book = { title, author, isbn };
  Book.create(book, (err, id) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id });
  });
};

const updateBook = (req, res) => {
  const { id } = req.params;
  const { title, author, isbn } = req.body;
  const book = { title, author, isbn };
  Book.update(id, book, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Book updated successfully" });
  });
};

const deleteBook = (req, res) => {
  const { id } = req.params;
  Book.delete(id, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Book deleted successfully" });
  });
};

module.exports = {
  getAllBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
};
`;

    // const embeddingService = new EmbeddingService();
    // const embedding1 = await embeddingService.generateEmbeddings(text);

    // // // save file details
    // const fileDetails = {
    //     name: "file1",
    //     owner: "owner1",
    //     repo: "repo1",
    //     ref: "ref1",
    //     path: "path1",
    //     content: "content1",
    //     commitHash: "commitHash1",
    //     tokenCount: 1,
    //     embeddings: embedding1,
    // };
    // const result = await dbService.saveFileDetails(fileDetails);
    // console.log(result);

    // const embedding2 = await embeddingService.generateEmbeddings(text);
    // console.log(embedding1 == embedding2);

    const repositoryService = new RepositoryService();

    const repos = ["bookstore"]; // , "earnest-dev", "sds", "lc"
    for (const r in repos) {
        const repo = repos[r];
        console.log(">>>> processing repo", repo);

        let files: any[] = [];
        let fetchedFiles: any[] = [];

        // get files
        await runWithTime("get files", async () => {
            files = await repositoryService.getRepositoryFiles("aqureshiest", repo);
        });

        // fetch files
        await runWithTime("fetch files", async () => {
            fetchedFiles = await repositoryService.fetchFiles(files);
        });

        let tokenizedFiles: any[] = [];
        // tokenize the files
        await runWithTime("tokenize files", async () => {
            const tokenLimiter = new TokenLimiter();
            tokenizedFiles = tokenLimiter.tokenizeFiles(fetchedFiles);
        });
        // print file name and tokens
        tokenizedFiles.forEach((file) => {
            console.log(" > ", file.path, file.tokenCount);
        });
        // add up all the tokens
        const totalTokens = tokenizedFiles.reduce((acc, file) => acc + file.tokenCount, 0);
        console.log("total tokens", totalTokens);

        const embeddingService = new EmbeddingService();
        let embeddedFiles: any[] = [];
        // embed the files
        await runWithTime("embed files", async () => {
            embeddedFiles = await embeddingService.generateEmbeddingsForFilesInChunks(
                tokenizedFiles
            );
        });

        // save everything
        await runWithTime("save files", async () => {
            await repositoryService.syncBranch("aqureshiest", repo, "main", embeddedFiles);
        });

        console.log("-------------------");
        sleep(1000);
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithTime = async (label: string, fn: () => Promise<any>) => {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
};

main();
