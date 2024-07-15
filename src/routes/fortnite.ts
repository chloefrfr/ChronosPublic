import { app } from "..";
import { Validation } from "../middleware/validation";
import path from "node:path";

export default function () {
  app.get("/fortnite/api/game/v2/world/info", Validation.verifyToken, async (c) => {
    const content = await Bun.file(
      path.join(__dirname, "..", "memory", "world", "worldinfo.json"),
    ).json();

    return c.json(content);
  });
}
