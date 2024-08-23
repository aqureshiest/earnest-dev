import { XMLParser } from "fast-xml-parser";

export function parseXml<T>(text: string, options: any = {}): T {
    const xmlParser = new XMLParser(options);

    let xmlText = text;

    if (text.startsWith("```xml")) {
        const match = text.match(/```xml([\s\S]*?)```/);
        if (match && match[1]) {
            xmlText = match[1].trim();
        }
    }

    const parsed = xmlParser.parse(xmlText) as T;

    return parsed;
}
