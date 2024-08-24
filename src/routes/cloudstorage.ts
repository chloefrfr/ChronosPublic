import { app, logger, tokensService, userService } from "..";
import errors from "../utilities/errors";
import {
  GetDefaultEngine,
  GetDefaultGame,
  GetDefaultRuntimeOptions,
} from "../wrappers/Hotfix.wrapper";
import crypto from "node:crypto";
import path from "node:path";
import { readdir, readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { Validation } from "../middleware/validation";
import { existsSync, readFileSync } from "node:fs";
import PermissionInfo from "../utilities/permissions/permissioninfo";
import type { GrantType } from "../../types/permissionsdefs";
import uaparser from "../utilities/uaparser";

interface CloudStorageFile {
  [key: string]: any;
}

interface CloudStorage {
  files: CloudStorageFile[];
}

export default function () {
  app.get("/fortnite/api/cloudstorage/system", async (c) => {
    const SeasonData = uaparser(c.req.header("User-Agent"));
    const timestamp = new Date().toISOString();

    if (!SeasonData)
      return c.json(errors.createError(400, c.req.url, "Invalid User Agent.", timestamp), 400);

    const fileContents: { [key: string]: string } = {
      "DefaultEngine.ini": GetDefaultEngine(),
      "DefaultGame.ini": GetDefaultGame(SeasonData.season),
      "DefaultRuntimeOptions.ini": GetDefaultRuntimeOptions(),
    };

    const CloudStorage: CloudStorage = { files: [] };

    for (const [file, content] of Object.entries(fileContents)) {
      CloudStorage.files.push({
        uniqueFilename: file,
        filename: file,
        hash: crypto.createHash("sha1").update(content).digest("hex"),
        hash256: crypto.createHash("sha256").update(content).digest("hex"),
        length: content.length,
        contentType: "application/octet-stream",
        uploaded: "2024-03-03T21:56:36.209-05:00",
        storageType: "S3",
        doNotCache: false,
      });
    }

    return c.json(CloudStorage.files, 200);
  });

  app.get("/fortnite/api/cloudstorage/system/:filename", async (c) => {
    const filename = c.req.param("filename");
    const timestamp = new Date().toISOString();

    const SeasonData = uaparser(c.req.header("User-Agent"));

    if (!SeasonData)
      return c.json(errors.createError(400, c.req.url, "Invalid User Agent!", timestamp), 400);

    switch (filename) {
      case "DefaultEngine.ini":
        return c.text(GetDefaultEngine());

      case "DefaultGame.ini":
        return c.text(GetDefaultGame(SeasonData.season));

      case "DefaultRuntimeOptions.ini":
        return c.text(GetDefaultRuntimeOptions());

      default:
        c.status(400);
        return c.json(
          errors.createError(404, c.req.url, `File '${filename} not found.'`, timestamp),
          404,
        );
    }
  });

  app.get("/fortnite/api/cloudstorage/user/:accountId/:file", Validation.verifyToken, async (c) => {
    const clientSettings: string = path.join(
      process.env.LOCALAPPDATA as string,
      "Chronos",
      "ClientSettings",
    );

    if (!existsSync(clientSettings)) await mkdir(clientSettings);

    const file = c.req.param("file");
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();

    const clientSettingsFile = path.join(clientSettings, `ClientSettings-${accountId}.Sav`);

    if (file !== "ClientSettings.Sav" || !existsSync(clientSettingsFile)) {
      return c.json(
        errors.createError(
          404,
          c.req.url,
          `Sorry, we couldn't find a settings file with the filename ${file} for the accountId ${accountId}`,
          timestamp,
        ),
        404,
      );
    }

    const data = await readFile(clientSettingsFile);

    try {
      return c.body(data as any);
    } catch (err) {
      return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
    }
  });

  app.get("/fortnite/api/cloudstorage/user/:accountId", Validation.verifyToken, async (c) => {
    const clientSettings: string = path.join(
      process.env.LOCALAPPDATA as string,
      "Chronos",
      "ClientSettings",
    );
    if (!existsSync(clientSettings)) {
      try {
        await mkdir(clientSettings, { recursive: true });
      } catch (err) {
        logger.error(`Error creating directory: ${err}`);
      }
    }
    const accountId = c.req.param("accountId");

    const clientSettingsFile = path.join(clientSettings, `ClientSettings-${accountId}.Sav`);

    if (existsSync(clientSettingsFile)) {
      const file = await readFile(clientSettingsFile, "latin1");
      const stats = await stat(clientSettingsFile);

      return c.json([
        {
          uniqueFilename: "ClientSettings.Sav",
          filename: "ClientSettings.Sav",
          hash: crypto.createHash("sha1").update(file).digest("hex"),
          hash256: crypto.createHash("sha256").update(file).digest("hex"),
          length: Buffer.byteLength(file),
          contentType: "application/octet-stream",
          uploaded: stats.mtime,
          storageType: "S3",
          storageIds: {},
          accountId: accountId,
          doNotCache: false,
        },
      ]);
    }

    return c.json([]);
  });

  app.put(
    "/fortnite/api/cloudstorage/user/:accountId/:file",
    Validation.verifyToken,
    async (c, next) => {
      const raw = await c.req.arrayBuffer();
      const body = Buffer.from(raw);
      const timestamp = new Date().toISOString();

      if (Buffer.byteLength(body) >= 400000) {
        return c.json(
          errors.createError(403, c.req.url, "Raw body is bigger than 400000.", timestamp),
          403,
        );
      }

      if (c.req.param("file") !== "ClientSettings.Sav") {
        return c.json(errors.createError(404, c.req.url, "File not found.", timestamp), 404);
      }

      const clientSettings: string = path.join(
        process.env.LOCALAPPDATA as string,
        "Chronos",
        "ClientSettings",
      );
      if (!existsSync(clientSettings)) await mkdir(clientSettings);

      const clientSettingsFile = path.join(
        clientSettings,
        `ClientSettings-${c.req.param("accountId")}.Sav`,
      );

      await writeFile(clientSettingsFile, body, "latin1");
      return c.json([]);
    },
  );
}
