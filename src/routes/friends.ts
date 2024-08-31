import { app, friendsService, userService } from "..";
import { Validation } from "../middleware/validation";
import { acceptFriendRequest } from "../sockets/xmpp/utilities/AcceptFriendRequest";
import { getUserPresence } from "../sockets/xmpp/utilities/GetUserPresence";
import { sendFriendRequest } from "../sockets/xmpp/utilities/SendFriendRequest";
import { Friends, type Friend } from "../tables/friends";
import errors from "../utilities/errors";

interface FriendList {
  accountId: string;
  status: string;
  direction: string;
  createdAt: string;
  favorite: boolean;
}

export default function () {
  app.get("/fortnite/api/v1/:accountId/blocklist", async (c) => {
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();

    if (!accountId)
      return c.json(
        errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
        400,
      );

    const friends = await friendsService.findFriendByAccountId(accountId);

    if (!friends)
      return c.json(errors.createError(400, c.req.url, "Failed to find friends.", timestamp), 400);

    const list: Friend[] = [];

    for (const blocked of friends.blocked) {
      list.push({
        accountId: blocked.accountId,
        createdAt: new Date().toISOString(),
        alias: "",
      });
    }

    return c.json(list);
  });

  app.get("/fortnite/api/public/list/fortnite/:accountId/recentPlayers", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/v1/:accountId/settings", async (c) => {
    return c.json({
      acceptInvites: "public",
    });
  });

  app.get("/friends/api/public/blocklist/:accountId", Validation.verifyToken, async (c) => {
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();

    if (!accountId)
      return c.json(
        errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
        400,
      );

    const friends = await friendsService.findFriendByAccountId(accountId);

    if (!friends)
      return c.json(errors.createError(400, c.req.url, "Failed to find friends.", timestamp), 400);

    return c.json({
      blockedUsers: friends.blocked.map((user) => user.accountId && user.createdAt),
    });
  });

  app.get(
    "/friends/api/public/friends/:accountId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const timestamp = new Date().toISOString();

      if (!accountId)
        return c.json(
          errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
          400,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(`friends:${accountId}`, [
        "READ,UPDATE,DELETE",
      ]);

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`friends:${accountId}`, "READ,UPDATE,DELETE"),
            timestamp,
          ),
          401,
        );

      const friends = await friendsService.findFriendByAccountId(accountId);

      if (!friends)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find friends.", timestamp),
          400,
        );

      const list: FriendList[] = [];
      const acceptedFriends = friends.accepted;
      const incomingFriends = friends.incoming;
      const outgoingFriends = friends.outgoing;
      const blockedFriends = friends.blocked;

      for (const friend of acceptedFriends) {
        list.push({
          accountId: friend.accountId,
          status: "ACCEPTED",
          direction: "OUTBOUND",
          createdAt: new Date().toISOString(),
          favorite: false,
        });
      }

      for (const friend of incomingFriends) {
        list.push({
          accountId: friend.accountId,
          status: "PENDING",
          direction: "INBOUND",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      for (const friend of outgoingFriends) {
        list.push({
          accountId: friend.accountId,
          status: "PENDING",
          direction: "OUTBOUND",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      for (const friend of blockedFriends) {
        list.push({
          accountId: friend.accountId,
          status: "BLOCKED",
          direction: "INBOUND",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      return c.json(list);
    },
  );

  app.get(
    "/friends/api/v1/:accountId/summary",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const timestamp = new Date().toISOString();

      if (!accountId)
        return c.json(
          errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
          400,
        );

      const friends = await friendsService.findFriendByAccountId(accountId);

      if (!friends)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find friends.", timestamp),
          400,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(`friends:${accountId}`, [
        "READ,UPDATE,DELETE",
      ]);

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`friends:${accountId}`, "READ,UPDATE,DELETE"),
            timestamp,
          ),
          401,
        );

      const content: {
        friends: any[];
        incoming: any[];
        outgoing: any[];
        suggested: any[];
        blocklist: any[];
        settings: { acceptInvites: string };
      } = {
        friends: [],
        incoming: [],
        outgoing: [],
        suggested: [],
        blocklist: [],
        settings: {
          acceptInvites: "public",
        },
      };

      const acceptedFriends = friends.accepted;
      const incomingFriends = friends.incoming;
      const outgoingFriends = friends.outgoing;
      const blockedFriends = friends.blocked;

      for (const friend of acceptedFriends) {
        content.friends.push({
          accountId: friend.accountId,
          groups: [],
          mutual: 0,
          alias: "",
          note: "",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      for (const friend of incomingFriends) {
        content.incoming.push({
          accountId: friend.accountId,
          groups: [],
          mutual: 0,
          alias: "",
          note: "",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      for (const friend of outgoingFriends) {
        content.outgoing.push({
          accountId: friend.accountId,
          groups: [],
          mutual: 0,
          alias: "",
          note: "",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      for (const friend of blockedFriends) {
        content.blocklist.push({
          accountId: friend.accountId,
          groups: [],
          mutual: 0,
          alias: "",
          note: "",
          createdAt: friend.createdAt,
          favorite: false,
        });
      }

      return c.json(content);
    },
  );

  app.get("/fortnite/api/v1/:accountId/recent/:type", Validation.verifyToken, async (c) => {
    return c.json([]);
  });

  app.get(
    "/friends/api/v1/:accountId/friends/:friendId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const friendId = c.req.param("friendId");
      const timestamp = new Date().toISOString();

      if (!accountId || !friendId)
        return c.json(errors.createError(400, c.req.url, "Missing parameters.", timestamp), 400);

      const user = await friendsService.findFriendByAccountId(accountId);
      const friend = await friendsService.findFriendByAccountId(friendId);

      if (!user || !friend)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find friends.", timestamp),
          400,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(`friends:${user.accountId}`, [
        "READ,UPDATE,DELETE",
      ]);

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`friends:${user.accountId}`, "READ,UPDATE,DELETE"),
            timestamp,
          ),
          401,
        );

      const accepted = friend.accepted.find((accepted) => accepted.accountId === friend.accountId);

      if (!accepted)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Friendship between ${user.accountId} and ${friend.accountId} does not exist.`,
            timestamp,
          ),
        );

      return c.json({
        accountId: user.accountId,
        groups: [],
        mutual: 0,
        alias: "",
        note: "",
        favorite: false,
        created: accepted.createdAt,
      });
    },
  );

  app.post(
    "/friends/api/public/friends/:accountId/:friendId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const friendId = c.req.param("friendId");
      const timestamp = new Date().toISOString();

      if (!accountId || !friendId)
        return c.json(errors.createError(400, c.req.url, "Missing parameters.", timestamp), 400);

      const frienduser = await friendsService.findFriendByAccountId(accountId);
      const friendInList = await friendsService.findFriendByAccountId(friendId);

      if (!frienduser || !friendInList)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find friends.", timestamp),
          400,
        );

      const user = await userService.findUserByAccountId(frienduser.accountId);
      const friend = await userService.findUserByAccountId(friendInList.accountId);

      if (!user || !friend)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find user or friend.", timestamp),
          400,
        );

      if (user.banned || friend.banned)
        return c.json(
          errors.createError(403, c.req.url, "Friend or User is banned.", timestamp),
          403,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(`friends:${user.accountId}`, [
        "READ,UPDATE,DELETE",
      ]);

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`friends:${user.accountId}`, "READ,UPDATE,DELETE"),
            timestamp,
          ),
          401,
        );

      const acceptedFriends = frienduser.accepted.find(
        (accepted) => accepted.accountId === friend.accountId,
      );

      const incomingFriends = frienduser.incoming.find(
        (incoming) => incoming.accountId === friend.accountId,
      );

      const outgoingFriends = frienduser.outgoing.find(
        (outgoing) => outgoing.accountId === friend.accountId,
      );

      if (acceptedFriends)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Friendship between ${user.accountId} and ${friend.accountId} already exists.`,
            timestamp,
          ),
          400,
        );

      if (outgoingFriends)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Friendship request has already been sent to ${friend.accountId}`,
            timestamp,
          ),
          400,
        );

      if (user.accountId === friend.accountId)
        return c.json(
          errors.createError(400, c.req.url, "You cannot add yourself.", timestamp),
          400,
        );

      if (incomingFriends) {
        if (!(await acceptFriendRequest(user.accountId, friend.accountId)))
          return c.json(
            errors.createError(400, c.req.url, "Failed to accept friend request.", timestamp),
            400,
          );

        await getUserPresence(false, user.accountId, friend.accountId);
        await getUserPresence(false, friend.accountId, user.accountId);
      } else if (!(await sendFriendRequest(user.accountId, friend.accountId)))
        return c.json(
          errors.createError(400, c.req.url, "Failed to send friend request.", timestamp),
          400,
        );

      return c.json([]);
    },
  );

  app.post(
    "/friends/api/v1/:accountId/friends/:friendId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const friendId = c.req.param("friendId");
      const timestamp = new Date().toISOString();

      if (!accountId || !friendId)
        return c.json(errors.createError(400, c.req.url, "Missing parameters.", timestamp), 400);

      const frienduser = await friendsService.findFriendByAccountId(accountId);
      const friendInList = await friendsService.findFriendByAccountId(friendId);

      if (!frienduser || !friendInList)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find friends.", timestamp),
          400,
        );

      const user = await userService.findUserByAccountId(frienduser.accountId);
      const friend = await userService.findUserByAccountId(friendInList.accountId);

      if (!user || !friend)
        return c.json(
          errors.createError(400, c.req.url, "Failed to find user or friend.", timestamp),
          400,
        );

      if (user.banned || friend.banned)
        return c.json(
          errors.createError(403, c.req.url, "Friend or User is banned.", timestamp),
          403,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(`friends:${user.accountId}`, [
        "READ,UPDATE,DELETE",
      ]);

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`friends:${user.accountId}`, "READ,UPDATE,DELETE"),
            timestamp,
          ),
          401,
        );

      const acceptedFriends = frienduser.accepted.find(
        (accepted) => accepted.accountId === friend.accountId,
      );

      const incomingFriends = frienduser.incoming.find(
        (incoming) => incoming.accountId === friend.accountId,
      );

      const outgoingFriends = frienduser.outgoing.find(
        (outgoing) => outgoing.accountId === friend.accountId,
      );

      if (acceptedFriends)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Friendship between ${user.accountId} and ${friend.accountId} already exists.`,
            timestamp,
          ),
          400,
        );

      if (outgoingFriends)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Friendship request has already been sent to ${friend.accountId}`,
            timestamp,
          ),
          400,
        );

      if (user.accountId === friend.accountId)
        return c.json(
          errors.createError(400, c.req.url, "You cannot add yourself.", timestamp),
          400,
        );

      if (incomingFriends) {
        if (!(await acceptFriendRequest(user.accountId, friend.accountId)))
          return c.json(
            errors.createError(400, c.req.url, "Failed to accept friend request.", timestamp),
            400,
          );

        await getUserPresence(false, user.accountId, friend.accountId);
        await getUserPresence(false, friend.accountId, user.accountId);
      } else if (!(await sendFriendRequest(user.accountId, friend.accountId)))
        return c.json(
          errors.createError(400, c.req.url, "Failed to send friend request.", timestamp),
          400,
        );

      return c.json([]);
    },
  );
}
