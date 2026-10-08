// Preloaded by `pnpm start` (node --import) before anything else: React and the rest of the
// server read NODE_ENV when they load, so it must be set before the build is imported.
// The Docker image sets it in its environment instead.
import process from "node:process";

process.env.NODE_ENV = "production";
