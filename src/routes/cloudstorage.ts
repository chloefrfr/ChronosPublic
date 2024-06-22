import { app } from "..";
import errors from "../utilities/errors";
import parser from "../utilities/useragent";
import {
  GetDefaultEngine,
  GetDefaultGame,
  GetDefaultRuntimeOptions,
} from "../wrappers/Hotfix.wrapper";
import crypto from "node:crypto";

interface CloudStorageFile {
  [key: string]: any;
}

interface CloudStorage {
  files: CloudStorageFile[];
}

export default function () {
  app.get("/fortnite/api/cloudstorage/system", async (c) => {
    const SeasonData = parser(c.req.header("User-Agent"));
    const timestamp = new Date().toISOString();

    if (!SeasonData)
      return c.json(
        errors.createError(400, c.req.url, "Invalid User Agent!", timestamp),
        400
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

    return c.json(CloudStorage.files, 200);
  });

  app.get("/fortnite/api/cloudstorage/system/:filename", async (c) => {
    const filename = c.req.param("filename");
    const timestamp = new Date().toISOString();

    const SeasonData = parser(c.req.header("User-Agent"));

    if (!SeasonData)
      return c.json(
        errors.createError(400, c.req.url, "Invalid User Agent!", timestamp),
        400
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
  });
}
