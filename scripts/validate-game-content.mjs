import { build } from "esbuild";
import { resolve } from "node:path";

const entry = resolve(process.cwd(), "app/content-validator.ts");
const result = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const source = result.outputFiles[0]?.text;
if (!source) throw new Error("Game-content validation bundle was empty.");

const validator = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const issues = validator.validateGameContent();
if (issues.length) {
  throw new Error(`Invalid game content:\n${issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
}

console.log("Executable game content is valid.");
