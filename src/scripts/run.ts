import { EmbeddingService } from "@/modules/ai/EmbeddingService";
import { PGDatabaseService } from "@/modules/db/PGDatabaseService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

async function main() {
    const dbService = new DatabaseService();

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

    const embeddingService = new EmbeddingService();
    // const embedding1 = await embeddingService.generateEmbeddings(text);

    // create new branch
    const branch: StoredBranch = {
        owner: "owner1",
        repo: "repo1",
        ref: "ref1",
        commitHash: "commitHash1",
    };

    const savedBranch = await dbService.saveBranch(branch);
    if (savedBranch) {
        console.log("saved branch >>> ", savedBranch);

        // sample files
        const filesContents = [
            "fox ran in the hole",
            "man built the house",
            "apples are red",
            "sky is blue",
            "birds fly high",
            "cat is lazy",
        ];

        for (let i = 0; i < filesContents.length; i++) {
            const embedding = await embeddingService.generateEmbeddings(filesContents[i]);

            const fileDetails = {
                name: `file${i}`,
                branch: savedBranch,
                path: `path${i}`,
                content: filesContents[i],
                commitHash: "commitHash1",
                tokenCount: 1,
                embeddings: embedding,
            };

            await dbService.saveFileDetails(fileDetails);
        }

        // get file details
        const fetchedFile = await dbService.getFileDetails(savedBranch.id, "path2");
        console.log("fetched file >>> ", fetchedFile);

        // const embedding2 = await embeddingService.generateEmbeddings(text);
        // console.log(embedding1 == embedding2);

        // search for similar files
        // const similarFiles = await dbService.findSimilar("construction", 3, savedBranch.id);
        // console.log("similar files >>> ", similarFiles);
    }
}

main();
