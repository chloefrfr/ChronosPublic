import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "../server";
import xmlparser from "xml-parser";
import xmlbuilder from "xmlbuilder";
import { logger } from "../../..";
import { XmppService } from "../saved/XmppServices";
import { updatePresenceForFriend } from "../utilities/UpdatePresenceForFriend";
import { getUserPresence } from "../utilities/GetUserPresence";

export default async function (
  socket: ServerWebSocket<ChronosSocket>,
  root: xmlparser.Node,
): Promise<void> {
  const rootType = root.attributes.type;
  const to = root.attributes.to;
  const children = root.children;

  switch (rootType) {
    case "unavailable":
      if (
        to.endsWith("@muc.prod.ol.epicgames.com") ||
        to.split("/")[0].endsWith("@muc.prod.ol.epicgames.com")
      ) {
        const roomName = to.split("@")[0];
        const room = XmppService.xmppMucs[roomName];

        if (room) {
          const roomMemberIndex = room.members.findIndex(
            (member: { accountId: string }) => member.accountId === socket.data.accountId,
          );

          if (roomMemberIndex !== undefined && roomMemberIndex !== -1) {
            room.members.splice(roomMemberIndex, 1);
            XmppService.joinedMUCs.splice(XmppService.joinedMUCs.indexOf(roomName), 1);
          }

          socket.send(
            xmlbuilder
              .create("presence")
              .attribute("to", socket.data.jid)
              .attribute(
                "from",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  socket.data.displayName as string,
                )}:${socket.data.accountId}:${socket.data.resource}`,
              )
              .attribute("xmlns", "jabber:client")
              .attribute("type", "unavailable")
              .element("x")
              .attribute("xmlns", "http://jabber.org/protocol/muc#user")
              .element("item")
              .attribute(
                "nick",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  socket.data.displayName as string,
                )}:${socket.data.accountId}:${socket.data.resource}`.replace(
                  `${roomName}@muc.prod.ol.epicgames.com/`,
                  "",
                ),
              )
              .attribute("jid", socket.data.jid)
              .attribute("role", "none")
              .up()
              .element("status")
              .attribute("code", "110")
              .up()
              .element("status")
              .attribute("code", "100")
              .up()
              .element("status")
              .attribute("code", "170")
              .up()
              .up()
              .toString({ pretty: true }),
          );
        }
      }

      break;

    default:
      if (
        children.find((child) => child.name === "muc:x") ||
        children.find((child) => child.name === "x")
      ) {
        const roomName = to.split("@")[0];

        if (!XmppService.xmppMucs[roomName]) {
          // @ts-ignore
          XmppService.xmppMucs[roomName] = { members: [] };
        }

        if (
          XmppService.xmppMucs[roomName].members.find(
            (member: { accountId: string }) => member.accountId === socket.data.accountId,
          )
        )
          return;

        if (XmppService.xmppMucs[roomName]) {
          XmppService.xmppMucs[roomName].members = XmppService.xmppMucs[roomName].members || [];
        }
        XmppService.xmppMucs[roomName].members.push({
          accountId: socket.data.accountId as string,
        });
        XmppService.joinedMUCs.push(roomName);

        socket.send(
          xmlbuilder
            .create("presence")
            .attribute("to", socket.data.jid)
            .attribute(
              "from",
              `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                socket.data.displayName as string,
              )}:${socket.data.accountId}:${socket.data.resource}`,
            )
            .attribute("xmlns", "jabber:client")
            .element("x")
            .attribute("xmlns", "http://jabber.org/protocol/muc#user")
            .element("item")
            .attribute(
              "nick",
              `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                socket.data.displayName as string,
              )}:${socket.data.accountId}:${socket.data.resource}`.replace(
                `${roomName}@muc.prod.ol.epicgames.com/`,
                "",
              ),
            )
            .attribute("jid", socket.data.jid)
            .attribute("role", "participant")
            .attribute("affiliation", "none")
            .up()
            .element("status")
            .attribute("code", "110")
            .up()
            .element("status")
            .attribute("code", "100")
            .up()
            .element("status")
            .attribute("code", "170")
            .up()
            .element("status")
            .attribute("code", "201")
            .up()
            .up()
            .toString({ pretty: true }),
        );

        XmppService.xmppMucs[roomName].members.forEach(async (member: { accountId: string }) => {
          const client = XmppService.clients.find(
            (client) => client.accountId === member.accountId,
          );

          if (!client) return;

          socket.send(
            xmlbuilder
              .create("presence")
              .attribute(
                "from",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  client?.displayName as string,
                )}:${client?.accountId}:${client?.resource}`,
              )
              .attribute("to", socket.data.jid)
              .attribute("xmlns", "jabber:client")
              .element("x")
              .attribute("xmlns", "http://jabber.org/protocol/muc#user")
              .element("item")
              .attribute(
                "nick",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  socket.data.displayName as string,
                )}:${socket.data.accountId}:${socket.data.resource}`.replace(
                  `${roomName}@muc.prod.ol.epicgames.com/`,
                  "",
                ),
              )
              .attribute("jid", client?.jid)
              .attribute("role", "participant")
              .attribute("affiliation", "none")
              .up()
              .up()
              .toString({ pretty: true }),
          );

          if (socket.data.accountId === client.accountId) return;

          client?.socket?.send(
            xmlbuilder
              .create("presence")
              .attribute(
                "from",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  socket.data.displayName as string,
                )}:${socket.data.accountId}:${socket.data.resource}`,
              )
              .attribute("to", client.jid)
              .attribute("xmlns", "jabber:client")
              .element("x")
              .attribute("xmlns", "http://jabber.org/protocol/muc#user")
              .element("item")
              .attribute(
                "nick",
                `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(
                  socket.data.displayName as string,
                )}:${socket.data.accountId}:${socket.data.resource}`.replace(
                  `${roomName}@muc.prod.ol.epicgames.com/`,
                  "",
                ),
              )
              .attribute("jid", socket.data.jid)
              .attribute("role", "participant")
              .attribute("affiliation", "none")
              .up()
              .up()
              .toString({ pretty: true }),
          );
        });

        return;
      }
      break;
  }

  const findStatus = root.children.find((child) => child.name === "status");

  if (!findStatus || !findStatus.content) return;

  let parsedStatus: string = "";

  try {
    parsedStatus = JSON.parse(findStatus.content);
  } catch (error) {
    return void logger.error(`Failed to parse status: ${error}`);
  }

  if (!parsedStatus) return void logger.error(`ParsedStatus is undefined.`);

  const status = findStatus.content;

  let away: boolean = false;
  if (root.children.some((child) => child.name === "show")) away = true;

  await updatePresenceForFriend(socket, status, false, away);
  await getUserPresence(false, socket.data.accountId as string, socket.data.accountId as string);
}
