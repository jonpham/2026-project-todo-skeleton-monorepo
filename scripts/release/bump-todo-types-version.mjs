import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPackageJsonPath = path.resolve(
  __dirname,
  "../../packages/todo-types/package.json"
);

function parseArgs(argv) {
  const options = {
    packageJson: defaultPackageJsonPath,
    baseVersion: undefined,
  };

  function requireValue(flag, value) {
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}.`);
    }

    return value;
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--package-json") {
      options.packageJson = requireValue(argument, argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--package-json=")) {
      options.packageJson = requireValue(
        "--package-json",
        argument.slice("--package-json=".length)
      );
      continue;
    }

    if (argument === "--base-version") {
      options.baseVersion = requireValue(argument, argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith("--base-version=")) {
      options.baseVersion = requireValue(
        "--base-version",
        argument.slice("--base-version=".length)
      );
      continue;
    }

    if (argument.startsWith("--")) {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function bumpPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(
      `Expected a simple semver version (x.y.z). Received "${version}".`
    );
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const options = parseArgs(process.argv.slice(2));
const packageJsonPath = path.resolve(options.packageJson);
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentVersion = options.baseVersion ?? packageJson.version;
const nextVersion = bumpPatchVersion(currentVersion);

packageJson.version = nextVersion;

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(nextVersion);
