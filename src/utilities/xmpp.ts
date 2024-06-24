import { db, friendsService, logger, userService } from "..";
import { Friends } from "../tables/friends";
import xmlbuilder from "xmlbuilder";
import { XmppService } from "../xmpp/service";
import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../xmpp/server";

export namespace XmppUtilities {
  export async function UpdateClientPresence(
    socket: ServerWebSocket<ChronosSocket>,
    status: string,
    offline: boolean,
    away: boolean,
  ) {
    const sender = XmppService.xmppClients.get(socket.data.accountId as string);

    if (!sender) return;

    sender.lastPresenceUpdate.status = status;
    sender.lastPresenceUpdate.away = away;

    const friends = await friendsService.findFriendByAccountId(sender.accountId);

    if (!friends) return;

    friends.accepted.forEach((friend) => {
      const client = XmppService.xmppClients.get(friend.accountId);
      if (!client) return;

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

      client.socket.send(xmlMessage.toString({ pretty: true }));
    });
  }

  export async function GetUserPresence(offline: boolean, senderId: string, receiverId: string) {
    const sender = XmppService.xmppClients.get(senderId);
    const receiver = XmppService.xmppClients.get(receiverId);

    if (!sender || !receiver) return;

    let xmlMessage = xmlbuilder
      .create("presence")
      .attribute("to", receiver.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("from", sender.jid)
      .attribute("type", "available");

    if (sender.lastPresenceUpdate.away)
      xmlMessage = xmlMessage
        .element("show", "away")
        .element("status", sender.lastPresenceUpdate.status)
        .up();
    else xmlMessage = xmlMessage.element("status", sender.lastPresenceUpdate.status).up();

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

    frienduser.outgoing.push({
      accountId: friend.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    friendInList.incoming.push({
      accountId: user.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    const entityManager = db.getRepository("friends").manager;
    await entityManager.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.save(frienduser);
      await transactionalEntityManager.save(friendInList);
    });

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

    if (incomingFriendsIndex === -1) return false;

    frienduser.incoming.splice(incomingFriendsIndex, 1);
    frienduser.accepted.push({
      accountId: friend.accountId,
      createdAt: new Date().toISOString(),
      alias: "",
    });

    const entityManager = db.getRepository("friends").manager;
      await entityManager.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.save(frienduser);
      });
    

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

    return true;
  }

  export function SendMessageToId(body: string, receiverId: string) {
    const receiver = XmppService.xmppClients.get(receiverId);

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

    logger.info(`Sent XMPP message to accountId: ${receiver.accountId}`);
  }
}
