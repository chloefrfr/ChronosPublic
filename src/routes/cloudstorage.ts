import { app, logger, tokensService, userService } from "..";
import errors from "../utilities/errors";
import parser from "../utilities/useragent";
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

interface CloudStorageFile {
  [key: string]: any;
}

interface CloudStorage {
  files: CloudStorageFile[];
}

export default function () {
  app.get("/fortnite/api/cloudstorage/system", Validation.verifyPermissions, async (c) => {
    const SeasonData = parser(c.req.header("User-Agent"));
    const timestamp = new Date().toISOString();

    if (!SeasonData)
      return c.json(errors.createError(400, c.req.url, "Invalid User Agent!", timestamp), 400);

    const permissions = c.get("permission");

    const hasPermission = permissions.hasPermission("fortnite:cloudstorage:system", "READ");

    if (!hasPermission)
      return c.json(
        errors.createError(
          401,
          c.req.url,
          permissions.errorReturn("fortnite:cloudstorage:system", "READ"),
          timestamp,
        ),
        401,
      );

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

    permissions.addPermission({
      resource: "fortnite:cloudstorage:system:DefaultEngine.ini",
      abilities: "READ",
      action: 16,
    });

    permissions.addPermission({
      resource: "fortnite:cloudstorage:system:DefaultGame.ini",
      abilities: "READ",
      action: 16,
    });

    permissions.addPermission({
      resource: "fortnite:cloudstorage:system:DefaultRuntimeOptions.ini",
      abilities: "READ",
      action: 16,
    });

    return c.json(CloudStorage.files, 200);
  });

  app.get(
    "/fortnite/api/cloudstorage/system/:filename",
    Validation.verifyPermissions,
    async (c) => {
      const filename = c.req.param("filename");
      const timestamp = new Date().toISOString();

      const SeasonData = parser(c.req.header("User-Agent"));

      if (!SeasonData)
        return c.json(errors.createError(400, c.req.url, "Invalid User Agent!", timestamp), 400);

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(
        `fortnite:cloudstorage:system:${filename}`,
        "READ",
      );

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`fortnite:cloudstorage:system:${filename}`, "READ"),
            timestamp,
          ),
          401,
        );

      switch (filename) {
        case "DefaultEngine.ini":
          c.status(200);
          return c.text(GetDefaultEngine());

        case "DefaultGame.ini":
          c.status(200);
          return c.text(GetDefaultGame(SeasonData.season));

        case "DefaultRuntimeOptions.ini":
          c.status(200);
          return c.text(GetDefaultRuntimeOptions());

        default:
          c.status(400);
          return c.json({
            errorCode: "errors.com.epicgames.bad_request",
            errorMessage: "Hotfix File not found!",
            numericErrorCode: 1001,
            originatingService: "fortnite",
            intent: "prod-live",
          });
      }
    },
  );

  app.get("/fortnite/api/cloudstorage/user/:accountId/:file", Validation.verifyToken, async (c) => {
    const clientSettings: string = path.join(
      process.env.LOCALAPPDATA as string,
      "Chronos",
      "ClientSettings",
    );

    if (!existsSync(clientSettings)) await mkdir(clientSettings);

    const file = c.req.param("file");
    const accountId = c.req.param("accountId");

    const clientSettingsFile = path.join(clientSettings, `ClientSettings-${accountId}.Sav`);

    if (file !== "ClientSettings.Sav" || !existsSync(clientSettingsFile)) {
      c.status(404);
      return c.json({
        errorCode: "errors.com.epicgames.cloudstorage.file_not_found",
        errorMessage: `Sorry, we couldn't find a settings file with the filename ${file} for the accountId ${accountId}`,
        messageVars: undefined,
        numericErrorCode: 12007,
        originatingService: "any",
        intent: "prod-live",
        error_description: `Sorry, we couldn't find a settings file with the filename ${file} for the accountId ${accountId}`,
        error: "fortnite",
      });
    }

    try {
      c.header("Content-Disposition", `attachment; filename=${file}`);
      c.header("Content-Type", "application/octet-stream");
      c.status(200);

      return c.json({});
    } catch (err) {
      console.error("Error sending file:", err);
      c.status(500);
      return c.text("Internal Server Error");
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
      if (Buffer.byteLength(await c.req.raw.text()) >= 400000) {
        console.log("File size exceeds the maximum allowed limit (400KB).");
        c.status(403);
        return c.json({
          error: "File size exceeds the maximum allowed limit (400KB).",
        });
      }

      if (c.req.param("file") !== "ClientSettings.Sav") {
        c.status(404);
        return c.json({ error: "File not found." });
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

      await writeFile(clientSettingsFile, await c.req.raw.clone().text(), "latin1");
      return c.json([]);
    },
  );
}
