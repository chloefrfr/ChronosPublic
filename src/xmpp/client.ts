import type { Server, ServerWebSocket } from "bun";
import { TextDecoder } from "util";
import xmlparser from "xml-parser";
import { logger } from "..";
import open from "./roots/open";
import auth from "./roots/auth";
import iq from "./roots/iq";
import presence from "./roots/presence";
import { XmppService } from "./saved/XmppServices";

export interface ChronosSocket extends ServerWebSocket {
  isAuthenticated?: boolean;
  accountId?: string;
  token?: string;
  displayName?: string;
  jid?: string;
  resource?: string;
  socket?: ServerWebSocket<ChronosSocket> | null;
}

export interface XmppClient {
  accountId: string;
  displayName: string;
  token: string;
  jid: string;
  resource: string;
  socket: ServerWebSocket<ChronosSocket>;
  lastPresenceUpdate: {
    away: boolean;
    status: string;
  };
}

export class Client {
  private socket: ServerWebSocket<ChronosSocket>;
  private message: string | Buffer;

  constructor(socket: ServerWebSocket<ChronosSocket>, message: string | Buffer) {
    this.socket = socket;
    this.message = message;

    const decoder = new TextDecoder("utf-8");

    let receivedMessage = "";

    receivedMessage += decoder.decode(this.message as Uint8Array);

    if (typeof message !== "string") {
      logger.error("Received non-text WebSocket message.");
      return;
    }

    logger.info(`Received WebSocket message: ${receivedMessage}`);

    this.handle(receivedMessage);
  }

  private async handle(receivedMessage: string) {
    try {
      let parsedMessage = JSON.parse(receivedMessage);

      logger.error("Disconnecting user as fake response");
      receivedMessage = "";
      return;
    } catch {}

    let xmlDoc = xmlparser(receivedMessage);

    const { name } = xmlDoc.root;

    switch (name) {
      case "open":
        await open(this.socket, xmlDoc.root);
        break;

      case "auth":
        await auth(this.socket, xmlDoc.root);
        break;

      case "iq":
        await iq(this.socket, xmlDoc.root);
        break;

      case "presence":
        await presence(this.socket, xmlDoc.root);
        break;
    }

    const isValidConnection =
      !XmppService.isUserLoggedIn &&
      this.socket.data.isAuthenticated &&
      this.socket.data.accountId &&
      this.socket.data.displayName &&
      this.socket.data.jid &&
      this.socket.data.resource;

    if (isValidConnection) {
      XmppService.clients.push({
        socket: this.socket,
        accountId: this.socket.data.accountId as string,
        displayName: this.socket.data.displayName as string,
        token: this.socket.data.token as string,
        jid: this.socket.data.jid as string,
        resource: this.socket.data.resource as string,
        lastPresenceUpdate: {
          away: false,
          status: "{}",
        },
      });

      XmppService.isUserLoggedIn = true;
    }
    receivedMessage = "";
  }
}
