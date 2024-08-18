import type { ServerWebSocket } from "bun";
import xmlparser from "xml-parser";
import { logger } from "../..";
import open from "./roots/open";
import auth from "./roots/auth";
import iq from "./roots/iq";
import presence from "./roots/presence";
import { XmppService } from "./saved/XmppServices";
import message from "./roots/message";

export interface ChronosSocket extends ServerWebSocket {
  isLoggedIn?: boolean;
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

    if (typeof message !== "string") {
      logger.error("Received non-text WebSocket message.");
      return;
    }

    this.handle();
  }

  private async handle() {
    const xmlDoc = xmlparser(this.message as string);

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

      case "message":
        await message(this.socket, xmlDoc.root);
        break;

      default:
        logger.warn(`Root '${name}' is missing.`);
    }

    const isValidConnection =
      !this.socket.data.isLoggedIn &&
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

      this.socket.data.isLoggedIn = true;
    }
  }
}
