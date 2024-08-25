import { GitHubService } from "@/modules/github/GitHubService";
import { parseYaml } from "@/modules/utilities/parseYaml";
import { loadEnvConfig } from "@next/env";
import * as Diff from "diff";

loadEnvConfig("");
async function main() {
    // const ghService = new GitHubService();
    // const owner = "aqureshiest";
    // const repo = "lc";
    // const branch = "main";
    // const file = "src/clients/ecore-service/client.test.ts";
    // const fileData = await ghService.readFile(owner, repo, branch, file);
    // const fileContents = Buffer.from(fileData.content, "base64").toString("utf-8");
    // console.log(fileContents);
    // console.log("-----------------------------------");
    // // count tokens
    // const tokenCount = encode(fileContents).length;
    // console.log("Token count:", tokenCount);

    // read yaml from /Users/adeelqureshi/earnest/earnest-dev/runs/add_error_handling_to_S__upload_functionality/codingassistant/ai_response_1723825863072.txt
    // const fs = require("fs");
    // const yaml = require("js-yaml");
    // const path = require("path");

    // const yamlFile = fs.readFileSync(
    //     path.join(
    //         __dirname,
    //         "../../runs/add_error_handling_to_S__upload_functionality/codingassistant/ai_response_1723825863072.txt"
    //     ),
    //     "utf8"
    // );

    //     const yamlString = `
    // \`\`\`yaml
    // prTitle: "Add error handling to S3 upload functionality"

    // newFiles:
    //   - path: "file 0"
    //     thoughts: "Do something"
    //     content: |
    //       File 0 Contents
    // newFiles:
    //   - path: "file 1"
    //     thoughts: "Do something"
    //     content: |
    //       File 1 Contents
    // modifiedFiles:
    //   - path: "file 2"
    //     thoughts: "Do something"
    //     content: |
    //       File 2 Contents
    // modifiedFiles:
    //   - path: "file 2"
    //     thoughts: "Do something"
    //     content: |
    //       File 2 Contents
    // modifiedFiles:
    //   - path: "file3.md"
    //     thoughts: "Do something"
    //     content: |
    //       # Do something

    //       ## then do more

    //       Finally complete it

    // deletedFiles: []
    // \`\`\`
    // `;

    //     const parsed = parseYaml(yamlString);

    //     console.log(parsed);

    const owner = "aqureshiest";
    const repo = "bookstore";
    const branch = "main";
    const path = "src/app/api/books/route.ts";

    const ghService = new GitHubService();
    const fileData = await ghService.readFile(owner, repo, branch, path);
    if (!("content" in fileData)) {
        throw new Error("No content found in file");
    }
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    const newContent = `import { openDb } from "@/app/db";
import { NextResponse } from "next/server";

export async function GET() {
  const db = await openDb();
  const books = await db.all("SELECT * FROM books");
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = await openDb();
  const result = await db.run(
    "INSERT INTO books (title, author, price, published_date) VALUES (?, ?, ?, ?)",
    [body.title, body.author, body.price, body.published_date]
  );
  const newBook = await db.get(
    "SELECT * FROM books WHERE id = ?",
    result.lastID
  );
  return NextResponse.json(newBook, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const db = await openDb();
  await db.run(
    "UPDATE books SET title = ?, author = ?, price = ?, published_date = ? WHERE id = ?",
    [body.title, body.author, body.price, body.published_date, body.id]
  );
  const updatedBook = await db.get("SELECT * FROM books WHERE id = ?", body.id);
  return NextResponse.json(updatedBook);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const db = await openDb();
  await db.run("DELETE FROM books WHERE id = ?", id);
  return NextResponse.json({ message: "Book deleted successfully" });
}`;

    const diff = Diff.createTwoFilesPatch("Original", "New", content, newContent);

    console.log(diff);

    console.log("\n\n-----------------------------------\n\n");

    // const Diff2Html = Diff2Html.Diff2Html;
}

main();
