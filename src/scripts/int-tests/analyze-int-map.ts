import { IntegrationMapProcessor } from "@/modules/ai/integration-tests/IntegrationMapProcessor";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export const analyzeIntMap = async () => {
    const intMapPath = "/Users/adeelqureshi/earnest/earnest-dev/src/scripts/int-tests/int-map.pdf";

    // convert file to array buffer
    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
        const fs = require("fs");
        fs.readFile(intMapPath, (err: any, data: Buffer) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });

    const processor = new IntegrationMapProcessor();

    const analysis = await processor.process({
        taskId: "int-map-analysis",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id,
        task: "Analyze Integration Map",
        params: {
            projectName: "Sample Project",
            projectDescription: "A sample project for integration testing.",
            media_type: "application/pdf",
        },
        imageBuffer: imageBuffer,
    });

    console.log("Analysis Result:", analysis?.response);
};
