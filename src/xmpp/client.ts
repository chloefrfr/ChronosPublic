import xmlparser from "xml-parser";

import type { ChronosSocket } from "./server";
import type { ServerWebSocket } from "bun";
import { logger } from "..";
import { XmppService } from "./service";
import message from "./handlers/message";
import iq from "./handlers/iq";
import auth from "./handlers/auth";
import open from "./handlers/open";
import presence from "./handlers/presence";

export default async function (socket: ServerWebSocket<ChronosSocket>, chunk: string | Buffer) {
  try {
    let clientData: xmlparser.Document;

    if (Buffer.isBuffer(chunk)) chunk = chunk.toString();

    clientData = xmlparser(chunk as string);

    if (!clientData || !clientData.root || !clientData.root.name)
      return socket.close(1008, "Invalid XML");

    const { name } = clientData.root;

    console.log(`requested ${name}`);

    switch (name) {
      case "open":
        await open(socket, clientData.root);
        break;

      case "auth":
        await auth(socket, clientData.root);
        break;

      case "iq":
        await iq(socket, clientData.root);
        break;

      case "presence":
        await presence(socket, clientData.root);
        break;

      case "message":
        await message(socket, clientData.root);
        break;

      default:
        logger.error(`Socket root with the name ${name} is not implemented!`);
        break;
    }

    const isValidConnection =
      !XmppService.isConnectionActive &&
      socket.data.isAuthenticated &&
      socket.data.accountId &&
      socket.data.displayName &&
      socket.data.jid &&
      socket.data.resource;

    if (isValidConnection) {
      XmppService.xmppClients.push({
        socket,
        accountId: socket.data.accountId as string,
        displayName: socket.data.displayName as string,
        token: socket.data.token as string,
        jid: socket.data.jid as string,
        resource: socket.data.resource as string,
        lastPresenceUpdate: {
          away: false,
          status: "{}",
        },
      });

      XmppService.isConnectionActive = true;
    }
  } catch (error) {
    logger.error(`Error handling message: ${error}`);
  }
}
