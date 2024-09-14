import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";
import { StandardAssistant } from "./StandardAssistant";

export class DescribeImageAssistant extends StandardAssistant<TaskRequest, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    getSystemPrompt(): string {
        return "You are an AI assistant tasked with describing an image. Analyze the provided image and generate a detailed description that captures the key elements, objects, and context depicted in the image. Your description should be concise, informative, and accessible to a general audience. Avoid overly technical or specialized language, and focus on providing a clear, engaging narrative that conveys the visual content effectively.";
    }
    getPrompt(params?: any): string {
        return `Here is the image you will be describing:
<image>
[[IMAGE_PLACEHOLDER]]
</image>
            `;
    }

    protected handleResponse(response: string): string {
        const parsedResponse = this.responseParser.parse(response) as string;
        console.log(parsedResponse);
        return parsedResponse;
    }
}
