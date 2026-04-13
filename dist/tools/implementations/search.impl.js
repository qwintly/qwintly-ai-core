import { spawn } from "node:child_process";
const defaultExecRg = async ({ query, cwd, maxCount }) => {
    return await new Promise((resolve, reject) => {
        const child = spawn("rg", [
            "-n",
            "--no-heading",
            "--color",
            "never",
            "--max-count",
            String(maxCount),
            query,
            ".",
        ], { cwd });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (err) => {
            reject(err);
        });
        child.on("close", (code) => {
            resolve({ code: code ?? 0, stdout, stderr });
        });
    });
};
export const createSearchImpl = (deps) => {
    const { workspaceRoot, logger } = deps;
    const execRg = deps.execRg ?? defaultExecRg;
    return async (searchQuery) => {
        const trimmed = (searchQuery ?? "").trim();
        logger?.info?.(`Tool search: "${trimmed}"`);
        if (!trimmed)
            return [];
        try {
            const { code, stdout, stderr } = await execRg({
                query: trimmed,
                cwd: workspaceRoot,
                maxCount: 20,
            });
            if (code === 1)
                return [];
            if (code !== 0) {
                throw new Error(`rg exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`);
            }
            const lines = stdout
                .replace(/\r\n/g, "\n")
                .split("\n")
                .filter(Boolean)
                .slice(0, 20);
            return lines.map((line) => {
                const first = line.indexOf(":");
                const second = first === -1 ? -1 : line.indexOf(":", first + 1);
                if (first === -1 || second === -1)
                    return { path: line, content: "" };
                const file = line.slice(0, first);
                const lineNo = line.slice(first + 1, second);
                const content = line.slice(second + 1);
                return { path: `${file}:${lineNo}`, content };
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger?.error?.(`Tool search failed for "${trimmed}": ${message}`);
            return [];
        }
    };
};
//# sourceMappingURL=search.impl.js.map