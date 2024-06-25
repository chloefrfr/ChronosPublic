import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import { friendsService, logger, userService } from "../..";
import { XmppService } from "../saved/XmppServices";
import xmlbuilder from "xmlbuilder";
import { Friends, type Friend } from "../../tables/friends";

export namespace XmppUtilities {
  export async function UpdatePresenceForFriend(
    socket: ServerWebSocket<ChronosSocket>,
    status: string,
    offline: boolean,
    away: boolean,
  ) {
    logger.debug(`isAway: ${away}`);
    logger.debug(`isOffline: ${offline}`);

    const sender = XmppService.clients.find((client) => client.socket === socket);

    if (!sender) return;

    sender.lastPresenceUpdate.away = away;
    sender.lastPresenceUpdate.status = status;

    const friends = await friendsService.findFriendByAccountId(sender.accountId);

    if (!friends) return;

    for (const accepted of friends.accepted) {
      console.log(accepted);

      const client = XmppService.clients.find((client) => client.accountId === accepted.accountId);

      if (!client) continue;

      console.log(client.displayName);

      let xmlMessage = xmlbuilder
        .create("presence")
        .attribute("to", client.jid)
        .attribute("xmlns", "jabber:client")
        .attribute("from", sender.jid)
        .attribute("type", offline ? "unavailable" : "available");

      if (sender.lastPresenceUpdate.away)
        xmlMessage = xmlMessage
          .element("show", "away")
          .element("status", sender.lastPresenceUpdate.status)
          .up();
      else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

      console.log(xmlMessage.toString({ pretty: true }));

      client.socket.send(xmlMessage.toString({ pretty: true }));
    }
  }

  export async function GetUserPresence(offline: boolean, senderId: string, receiverId: string) {
    const sender = XmppService.clients.find((client) => client.accountId === senderId);
    const receiver = XmppService.clients.find((client) => client.accountId === receiverId);

    if (!sender || !receiver) return;

    let xmlMessage = xmlbuilder
      .create("presence")
      .attribute("to", receiver.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("from", sender.jid)
      .attribute("type", offline ? "unavailable" : "available");
    // .end({ pretty: true });

    if (sender.lastPresenceUpdate.away)
      xmlMessage = xmlMessage
        .element("show", "away")
        .element("status", sender.lastPresenceUpdate.status)
        .up();
    else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

    console.log(xmlMessage.toString({ pretty: true }));

    receiver.socket.send(xmlMessage.toString({ pretty: true }));
  }

  export async function SendFriendRequest(accountId: string, friendId: string): Promise<boolean> {
    const [frienduser, friendInList, user, friend] = await Promise.all([
      friendsService.findFriendByAccountId(accountId),
      friendsService.findFriendByAccountId(friendId),
      userService.findUserByAccountId(accountId),
      userService.findUserByAccountId(friendId),
    ]);

    if (!frienduser || !friendInList || !user || !friend || user.banned || friend.banned) {
      return false;
    }

    const updatedOutgoing: Friend[] = [];
    updatedOutgoing.push({
      accountId: friend.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    await Friends.createQueryBuilder()
      .update()
      .set({ outgoing: updatedOutgoing })
      .where("accountId = :accountId", { accountId: frienduser.accountId })
      .execute();

    const updatedIncoming: Friend[] = [];
    updatedIncoming.push({
      accountId: user.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    await Friends.createQueryBuilder()
      .update()
      .set({ incoming: updatedIncoming })
      .where("accountId = :accountId", { accountId: friendInList.accountId })
      .execute();

    SendMessageToId(
      JSON.stringify({
        payload: {
          accountId: friend.accountId,
          status: "PENDING",
          direction: "OUTBOUND",
          created: new Date().toISOString(),
          favorite: false,
        },
        type: "com.epicgames.friends.core.apiobjects.Friend",
        timestamp: new Date().toISOString(),
      }),
      user.accountId,
    );

    SendMessageToId(
      JSON.stringify({
        payload: {
          accountId: user.accountId,
          status: "PENDING",
          direction: "INBOUND",
          created: new Date().toISOString(),
          favorite: false,
        },
        type: "com.epicgames.friends.core.apiobjects.Friend",
        timestamp: new Date().toISOString(),
      }),
      friend.accountId,
    );

    return true;
  }

  export async function AcceptFriendRequest(accountId: string, friendId: string): Promise<boolean> {
    const [frienduser, friendInList, user, friend] = await Promise.all([
      friendsService.findFriendByAccountId(accountId),
      friendsService.findFriendByAccountId(friendId),
      userService.findUserByAccountId(accountId),
      userService.findUserByAccountId(friendId),
    ]);

    if (!frienduser || !friendInList || !user || !friend || user.banned || friend.banned) {
      return false;
    }

    const incomingFriendsIndex = frienduser.incoming.findIndex(
      (incoming) => incoming.accountId === friend.accountId,
    );
    const outgoingFriendsIndex = friendInList.outgoing.findIndex(
      (outgoing) => outgoing.accountId === user.accountId,
    );

    if (incomingFriendsIndex === -1) return false;
    if (outgoingFriendsIndex === -1) return false;

    frienduser.incoming.splice(incomingFriendsIndex, 1);
    friendInList.outgoing.splice(outgoingFriendsIndex, 1);

    const updatedAccepted: Friend[] = [];

    updatedAccepted.push({
      accountId: friend.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    const friendUpdatedAccept: Friend[] = [];
    friendUpdatedAccept.push({
      accountId: user.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    await Friends.createQueryBuilder()
      .update()
      .set({ accepted: updatedAccepted, incoming: frienduser.incoming })
      .where("accountId = :accountId", { accountId: frienduser.accountId })
      .execute();

    SendMessageToId(
      JSON.stringify({
        payload: {
          accountId: friend.accountId,
          status: "ACCEPTED",
          direction: "OUTBOUND",
          created: new Date().toISOString(),
          favorite: false,
        },
        type: "com.epicgames.friends.core.apiobjects.Friend",
        timestamp: new Date().toISOString(),
      }),
      user.accountId,
    );

    await Friends.createQueryBuilder()
      .update()
      .set({ accepted: friendUpdatedAccept, outgoing: friendInList.outgoing })
      .where("accountId = :accountId", { accountId: friendInList.accountId })
      .execute();

    SendMessageToId(
      JSON.stringify({
        payload: {
          accountId: user.accountId,
          status: "ACCEPTED",
          direction: "INBOUND",
          created: new Date().toISOString(),
          favorite: false,
        },
        type: "com.epicgames.friends.core.apiobjects.Friend",
        timestamp: new Date().toISOString(),
      }),
      friend.accountId,
    );

    return true;
  }

  export function SendMessageToId(body: string, receiverId: string) {
    const receiver = XmppService.clients.find((client) => client.accountId === receiverId);

    if (typeof body === "object") body = JSON.stringify(body);

    if (!receiver) return;

    receiver.socket.send(
      xmlbuilder
        .create("message")
        .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
        .attribute("to", receiver.jid)
        .attribute("xmlns", "jabber:client")
        .element("body", `${body}`)
        .up()
        .toString({ pretty: true }),
    );
  }
}
