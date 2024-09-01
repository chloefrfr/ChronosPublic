import { app } from "..";

export default function () {
  app.get("/", async (c) => {
    return c.text("Chronos");
  });
}
