import { readdirSync } from "fs";
import { join, parse } from "path";
import { Hono, type Context } from "hono";
import { logger } from "..";
import { readdir } from "node:fs/promises";

type EndpointHandler = (c: Context) => Promise<void>;
interface EndpointHandlers {
  [key: string]: EndpointHandler;
}

async function loadRoute(directory: string, file: string) {
  try {
    const RouteModule = await import(join(directory, file));
    const defaultExport = RouteModule.default;

    if (defaultExport && typeof defaultExport === "function") {
      defaultExport();
    } else {
      logger.error(`${file} does not export a valid route initializer`);
    }
  } catch (error) {
    logger.error(`Error loading route ${file}: ${(error as Error).message}`);
  }
}

export async function loadRoutes(directory: string, app: Hono): Promise<void> {
  try {
    const files = readdirSync(directory);

    const routedFiles = files.filter((name) => name.endsWith(".ts") || name.endsWith(".js"));

    for (const file of routedFiles) {
      await loadRoute(directory, file);
    }
  } catch (error) {
    logger.error(`Failed to load routes: ${error}`);
  }
}

export async function loadOperations(): Promise<EndpointHandlers> {
  const operationsDir = join(__dirname, "..", "operations");
  const files = await readdir(operationsDir);

  const endpoints: EndpointHandlers = {};

  await Promise.all(
    files.map(async (file) => {
      const filePath = join(operationsDir, file);
      const { name } = parse(file);

      try {
        const { default: handler } = await import(filePath);
        endpoints[name] = handler;
      } catch (error) {
        logger.error(`Failed to load operation '${name}} from '${filePath}': ${error}`);
      }
    }),
  );

  return endpoints;
}
