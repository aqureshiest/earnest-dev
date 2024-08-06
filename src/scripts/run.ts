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
    const embedding1 = await embeddingService.generateEmbeddings(text);

    // // save file details
    const fileDetails = {
        name: "file1",
        owner: "owner1",
        repo: "repo1",
        ref: "ref1",
        path: "path1",
        content: "content1",
        commitHash: "commitHash1",
        tokenCount: 1,
        embeddings: embedding1,
    };
    const result = await dbService.saveFileDetails(fileDetails);
    console.log(result);

    // const embedding2 = await embeddingService.generateEmbeddings(text);
    // console.log(embedding1 == embedding2);
}

main();
