import express from "express";
import { createServer as createHttpServer } from "node:http";
import { z } from "zod";

/** @type {import("vite").ViteDevServer | undefined} */
let vite;
/** @type {import("zod").ZodType<import("react-router").ServerBuild>} */
const buildSchema = z.custom(
  (value) => value && typeof value === "object" && "routes" in value && "entry" in value,
);

const production = process.argv.includes("--production");
process.env.NODE_ENV = production ? "production" : "development";
const { createRequestHandler } = await import("@react-router/express");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : (process.env.PORT ?? 3000));
const app = express();
const server = createHttpServer(app);
app.disable("x-powered-by");
// Overwrites the internal header: the no-proxy fallback comes from the socket, never the client.
app.use((request, _response, next) => {
  request.headers["x-nelcota-peer-ip"] = request.socket.remoteAddress;
  next();
});
let build;
/** @type {import("react-router").ServerBuild | undefined} */
let activeBuild;
if (production) {
  build = buildSchema.parse(await import("./build/server/index.js"));
  activeBuild = build;
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(express.static("build/client", { maxAge: "1h" }));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true, ws: { server, clientPort: port } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  // Loads the server and validates the environment before accepting requests.
  activeBuild = buildSchema.parse(await vite.ssrLoadModule("virtual:react-router/server-build"));
  await vite.environments.client.warmupRequest("/app/entry.client.tsx");
  const devServer = vite;
  build = async () => {
    activeBuild = buildSchema.parse(
      await devServer.ssrLoadModule("virtual:react-router/server-build"),
    );
    return activeBuild;
  };
}
app.use(createRequestHandler({ build, mode: process.env.NODE_ENV }));
server.listen(port, process.env.HOST ?? "0.0.0.0", () =>
  console.info(`Nelcota: http://localhost:${port}`),
);
const shutdown = () => {
  server.close(() => {
    void (async () => {
      const { shutdownRuntime } = z
        .object({
          shutdownRuntime: z.function().output(z.promise(z.void())),
        })
        .parse(activeBuild?.entry.module);
      await shutdownRuntime();
      await vite?.close();
      process.exit(0);
    })().catch((error) => {
      console.error("Falha ao encerrar o servidor:", error);
      process.exit(1);
    });
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
