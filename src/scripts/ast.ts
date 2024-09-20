import { parse } from "@babel/parser";
// import traverse from "@babel/traverse";
import fs from "fs";

export const ast = () => {
    function analyzeCodeStructure(code: string) {
        const ast = parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });

        const codeBlocks: { type: string; code: string }[] = [];

        // traverse(ast, {
        //     FunctionDeclaration(path: any) {
        //         codeBlocks.push({
        //             type: "function",
        //             code: code.slice(path.node.start, path.node.end),
        //         });
        //     },
        //     ClassDeclaration(path: any) {
        //         codeBlocks.push({
        //             type: "class",
        //             code: code.slice(path.node.start, path.node.end),
        //         });
        //     },
        //     ImportDeclaration(path: any) {
        //         codeBlocks.push({
        //             type: "import",
        //             code: code.slice(path.node.start, path.node.end),
        //         });
        //     },
        //     ExportDefaultDeclaration(path: any) {
        //         codeBlocks.push({
        //             type: "export",
        //             code: code.slice(path.node.start, path.node.end),
        //         });
        //     },
        // });

        return codeBlocks;
    }

    const file = "src/app/components/YamlDisplay.tsx";
    const fileContents = fs.readFileSync(file, "utf-8");
    // console.log(fileContents);

    const codeStructure = analyzeCodeStructure(fileContents);
    console.log(codeStructure);
};
