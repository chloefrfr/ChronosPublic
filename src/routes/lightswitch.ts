import { app, userService } from "..";
import errors from "../utilities/errors";
import jwt from "jsonwebtoken";

enum Status {
  UP = "UP",
  DOWN = "DOWN",
}

enum UserAction {
  PLAY = "PLAY",
  DOWNLOAD = "DOWNLOAD",
  NONE = "NONE",
}

export default function () {
  app.get("/lightswitch/api/service/bulk/status", async (c) => {
    let Authorization: string | undefined;
    let accountId: string | undefined;

    const timestamp = new Date().toISOString();

    try {
      Authorization = c.req.header("Authorization")?.replace("bearer eg1~", "");
      const decodedToken = jwt.decode(Authorization as string);

      if (!decodedToken)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            "Failed to decode token.",
            timestamp
          ),
          400
        );

      accountId = decodedToken.sub as string;
    } catch (error) {
      return c.json(
        errors.createError(500, c.req.url, "Internal Server Error", timestamp),
        500
      );
    }

    const user = await userService.findUserByAccountId(accountId);

    if (!user)
      return c.json(
        errors.createError(
          404,
          c.req.url,
          `Failed to find user with the accountId ${accountId}.`,
          timestamp
        ),
        404
      );

    // TODO - Add a Proper Maintenance system.

    return c.json([
      {
        serviceInstanceId: "fortnite",
        status: Status.UP,
        message: "Chronos Servers are UP!",
        maintenanceUri: null,
        overrideCatalogIds: ["a7f138b2e51945ffbfdacc1af0541053"],
        allowedActions: [UserAction.PLAY, UserAction.DOWNLOAD],
        banned: user.banned,
        launcherInfoDTO: {
          appName: "Fortnite",
          catalogItemId: "4fe75bbc5a674f4f9b356b5c90567da5",
          namespace: "fn",
        },
      },
    ]);
  });
}
