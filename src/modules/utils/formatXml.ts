import { XMLBuilder } from "fast-xml-parser";

export function formatXml<T>(data: T): string {
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        indentBy: "  ",
    });

    return builder.build(data) as string;
}
