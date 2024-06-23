import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { v4 as uuid } from "uuid";
import { XmppService } from "../service";
import { logger } from "../..";
import { XmppUtilities } from "../../utilities/xmpp";

interface XmppMuc {
  members: { accountId: string }[];
}

export default async function handleSocketEvent(
  socket: ServerWebSocket<ChronosSocket>,
  root: xmlparser.Node,
): Promise<void> {
  const { type, to } = root.attributes;
  const { children } = root;

  if (!XmppService.isConnectionActive) {
    socket.close();
    return;
  }

  switch (type) {
    case "unavailable":
      return;

    default:
      if (children.some((val) => val.name === "muc:x" || val.name === "x")) {
        const room = to.split("@")[0];
        if (!XmppService.xmppMucs.has(room)) {
          XmppService.xmppMucs.set(room, { members: [] });
        }

        const mucRoom = XmppService.xmppMucs.get(room)!;
        if (!mucRoom.members) {
          mucRoom.members = [];
        }

        // Check if the member already exists.
        if (mucRoom.members.some((member) => member.accountId === socket.data.accountId)) {
          return;
        }

        mucRoom.members.push({ accountId: socket.data.accountId as string });
        XmppService.joinedMUCs.push(room);

        const fromJid = `${room}@muc.prod.ol.epicgames.com/${encodeURIComponent(
          socket.data.displayName as string,
        )}:${socket.data.accountId}:${socket.data.resource}`;

        const presenceXml = xmlbuilder
          .create("presence", { headless: false })
          .attribute("to", socket.data.jid)
          .attribute("from", fromJid)
          .attribute("xmlns", "jabber:client")
          .attribute("type", "unavailable")
          .ele("x")
          .attribute("xmlns", "http://jabber.org/protocol/muc#user")
          .ele("item")
          .attribute("nick", fromJid.replace(`${room}@muc.prod.ol.epicgames.com/`, ""))
          .attribute("jid", socket.data.jid)
          .attribute("role", "participant")
          .attribute("affiliation", "none")
          .up()
          .up()
          .ele("status", { code: "110" })
          .up()
          .ele("status", { code: "100" })
          .up()
          .ele("status", { code: "170" })
          .up()
          .ele("status", { code: "201" });

        socket.send(presenceXml.end({ pretty: true }));

        mucRoom.members.forEach(async (member) => {
          const client = XmppService.xmppClients.get(member.accountId);

          if (client && socket.data.accountId !== client.accountId) {
            const clientJid = `${room}@muc.prod.ol.epicgames.com/${encodeURIComponent(
              client.displayName as string,
            )}:${client.accountId}:${client.resource}`;

            const clientPresenceXml = xmlbuilder
              .create("presence", { headless: false })
              .attribute("from", clientJid)
              .attribute("to", socket.data.jid)
              .attribute("xmlns", "jabber:client")
              .ele("x")
              .attribute("xmlns", "http://jabber.org/protocol/muc#user")
              .ele("item")
              .attribute("nick", fromJid.replace(`${room}@muc.prod.ol.epicgames.com/`, ""))
              .attribute("jid", client.jid)
              .attribute("role", "participant")
              .attribute("affiliation", "none")
              .up()
              .up();

            socket.send(clientPresenceXml.end({ pretty: true }));

            if (client.socket) {
              const clientSocketPresenceXml = xmlbuilder
                .create("presence", { headless: false })
                .attribute("from", fromJid)
                .attribute("to", client.jid)
                .attribute("xmlns", "jabber:client")
                .ele("x")
                .attribute("xmlns", "http://jabber.org/protocol/muc#user")
                .ele("item")
                .attribute("nick", fromJid.replace(`${room}@muc.prod.ol.epicgames.com/`, ""))
                .attribute("jid", socket.data.jid)
                .attribute("role", "participant")
                .attribute("affiliation", "none")
                .up()
                .up();

              client.socket.send(clientSocketPresenceXml.end({ pretty: true }));
            }
          }
        });
      }
      break;
  }

  const findStatus = children.find((val) => val.name === "status");
  if (!findStatus || !findStatus.content) return;

  let statusData: string | null = null;

  try {
    statusData = JSON.parse(findStatus.content);
  } catch (error) {
    logger.error(`Failed to Parse Status Content: ${error}`);
    return;
  }

  if (statusData !== null) {
    const status: string = findStatus.content;
    const away: boolean = !!children.find((val) => val.name === "show");

    const sender = XmppService.xmppClients.get(socket.data.accountId as string);
    const receiver = XmppService.xmppClients.get(socket.data.accountId as string);

    if (!sender || !receiver) return socket.close();

    try {
      await XmppUtilities.UpdateClientPresence(socket, status, false, away);
      await XmppUtilities.GetUserPresence(false, sender.accountId, receiver.accountId);
    } catch (error) {
      logger.error(`Failed to update presence: ${error}`);
    }
  }
}
