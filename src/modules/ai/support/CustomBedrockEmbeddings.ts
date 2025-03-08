import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Embeddings } from "@langchain/core/embeddings";
import { BedrockEmbeddingsParams } from "@langchain/aws";

export interface CustomBedrockEmbeddingsParams extends BedrockEmbeddingsParams {
    dimensions?: number;
    normalize?: boolean;
}

export class CustomBedrockEmbeddings extends Embeddings {
    model: string;
    client: BedrockRuntimeClient;
    dimensions: number;
    normalize: boolean;
    batchSize = 512;

    constructor(fields?: CustomBedrockEmbeddingsParams) {
        super(fields ?? {});

        this.model = fields?.model ?? "amazon.titan-embed-text-v2:0";
        this.dimensions = fields?.dimensions ?? 256;
        this.normalize = fields?.normalize ?? true;

        this.client =
            fields?.client ??
            new BedrockRuntimeClient({
                region: fields?.region,
                credentials: fields?.credentials,
            });
    }

    protected async _embedText(text: string): Promise<number[]> {
        try {
            // Replace newlines, which can negatively affect performance
            const cleanedText = text.replace(/\n/g, " ");

            const res = await this.client.send(
                new InvokeModelCommand({
                    modelId: this.model,
                    body: JSON.stringify({
                        inputText: cleanedText,
                        dimensions: this.dimensions,
                        normalize: this.normalize,
                    }),
                    contentType: "application/json",
                    accept: "application/json",
                })
            );

            const body = new TextDecoder().decode(res.body);
            return JSON.parse(body).embedding;
        } catch (e) {
            console.error({ error: e });
            if (e instanceof Error) {
                throw new Error(`An error occurred while embedding with Titan: ${e.message}`);
            }
            throw new Error("An error occurred while embedding with Titan");
        }
    }

    embedQuery(document: string): Promise<number[]> {
        return this._embedText(document);
    }

    async embedDocuments(documents: string[]): Promise<number[][]> {
        return Promise.all(documents.map((document) => this._embedText(document)));
    }
}
