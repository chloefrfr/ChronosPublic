import { app } from "..";

export default function () {
  app.get("/fortnite/api/v2/versioncheck", async (c) => {
    return c.json({
      type: "NO_UPDATE",
    });
  });

  app.get("/fortnite/api/v2/versioncheck/:version", async (c) => {
    return c.json({
      type: "NO_UPDATE",
    });
  });
}
