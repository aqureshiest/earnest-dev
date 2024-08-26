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
    const repo = "earnest-mobile-test";
    const branch = "main";
    const path = "src/app/api/books/route.ts";

    const ghService = new GitHubService();
    //     const fileData = await ghService.readFile(owner, repo, branch, path);
    //     if (!("content" in fileData)) {
    //         throw new Error("No content found in file");
    //     }
    //     const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    //     const newContent = `import { openDb } from "@/app/db";
    // import { NextResponse } from "next/server";

    // export async function GET() {
    //   const db = await openDb();
    //   const books = await db.all("SELECT * FROM books");
    //   return NextResponse.json(books);
    // }

    // export async function POST(request: Request) {
    //   const body = await request.json();
    //   const db = await openDb();
    //   const result = await db.run(
    //     "INSERT INTO books (title, author, price, published_date) VALUES (?, ?, ?, ?)",
    //     [body.title, body.author, body.price, body.published_date]
    //   );
    //   const newBook = await db.get(
    //     "SELECT * FROM books WHERE id = ?",
    //     result.lastID
    //   );
    //   return NextResponse.json(newBook, { status: 201 });
    // }

    // export async function PUT(request: Request) {
    //   const body = await request.json();
    //   const db = await openDb();
    //   await db.run(
    //     "UPDATE books SET title = ?, author = ?, price = ?, published_date = ? WHERE id = ?",
    //     [body.title, body.author, body.price, body.published_date, body.id]
    //   );
    //   const updatedBook = await db.get("SELECT * FROM books WHERE id = ?", body.id);
    //   return NextResponse.json(updatedBook);
    // }

    // export async function DELETE(request: Request) {
    //   const { id } = await request.json();
    //   const db = await openDb();
    //   await db.run("DELETE FROM books WHERE id = ?", id);
    //   return NextResponse.json({ message: "Book deleted successfully" });
    // }`;

    //     const diff = Diff.createTwoFilesPatch("Original", "New", content, newContent);

    //     console.log(diff);

    //     console.log("\n\n-----------------------------------\n\n");

    // const languages = await ghService.getPrimaryLanguage(owner, repo);
    // console.log(languages);

    // const Diff2Html = Diff2Html.Diff2Html;

    const text1 = `import { Response } from 'express';
import { errorMessages } from '../../../utils/error-messages.js';
import { StatusCodes } from '../../../utils/http-status-codes.js';
import { UserFilesHandlerInjections } from "../types.js";

export const userFileDownloadHanlder = 
    (injections: UserFilesHandlerInjections) => 
        async (request, response: Response) => {
            const { loggerFactory, filesDownloadService } = injections;
            const logger = loggerFactory(userFileDownloadHanlder.name);
            const user_id = request.credentials.user_id;
            const documentId = request.params.id;

            const { error: idError } = filesDownloadService.validateDocumentId(documentId);
            if(idError) {
                return response.status(StatusCodes.BAD_REQUEST).json({ message: idError.message });
            }

            try {
                // get document info from db
                const { document, error: fetchDocumentError } = await filesDownloadService.getUserDocumentById(documentId);
                if(!fetchDocumentError && !document.userPermissions.some((permission: { userId: string }) => permission.userId === user_id)) {
                    return response.status(StatusCodes.FORBIDDEN).json({ message: errorMessages.FORBIDDEN });
                }
                if(fetchDocumentError) {
                    return response.status(StatusCodes.NOT_FOUND).json({ message: fetchDocumentError.message });
                }

                // get file from s3
                const documentVersion = document.documentVersions[0];
                const s3Path = documentVersion.s3Path;
                logger.log({ level: 'info', message: \`S3 get file: {s3Path}\` });
                const file = await filesDownloadService.getFileFromS3(s3Path);
                logger.log({ level: 'info', message: 'got file from S3' });

                const fileType = documentVersion.contentType;
                const fileSize = documentVersion.fileSize;
                const filename = documentVersion.filename.split(".")[0];
                response.header("Content-Type", fileType);
                response.header('Content-Length', \`{fileSize}\`);
                response.header("Content-Disposition", \`inline;filename={filename}\`);

                return response.status(StatusCodes.OK).send(file);
            } catch(error) {
                logger.error({
                    event: "file-download-error",
                    errors: error,
                })
                return response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
            }
}`;

    const text2 = `import { Request, Response } from "express";
import { FilesDownloadServiceInjections } from "./types.js";
import { validate as uuidValidate } from 'uuid';

export const userFileDownloadHanlder =
  (injections: FilesDownloadServiceInjections) =>
    async (request: Request, response: Response) => {
      const { loggerFactory, filesDownloadService } = injections;
      const logger = loggerFactory(userFileDownloadHanlder.name);

      const documentId = request.params.id;

      // Validate document ID format
      if (!uuidValidate(documentId)) {
        logger.error({ event: "Invalid document ID format", documentId });
        return response.status(400).json({ message: "document_id format is invalid" });
      }

      logger.debug({ event: "Fetching document", documentId });
      const { error, document } = await filesDownloadService.getUserDocumentById(documentId);
      if (error) {
        logger.error({ event: "Document not found", error });
        return response.status(404).json({ message: error.message });
      }

      const { documentVersions } = document;
      if (!documentVersions || documentVersions.length === 0) {
        logger.error({ event: "No document versions found", documentId });
        return response.status(404).json({ message: "No document versions found" });
      }

      const { s3Path, contentType, filename } = documentVersions[0];

      try {
        const fileBuffer = await filesDownloadService.getFileFromS3(s3Path);
        response.set({
          "Content-Type": contentType,
          "Content-Length": fileBuffer.length,
          "Content-Disposition": \`inline;filename={filename}\`,
        });
        return response.status(200).send(fileBuffer);
      } catch (error) {
        logger.error({ event: "Error retrieving file from S3", error });
        return response.status(500).json({ message: "Error retrieving file from S3" });
      }
    };
`;

    // do a diff between text1 and text2
    const diff = Diff.createTwoFilesPatch("Original", "New", text1, text2);
    console.log(diff);
}

main();
