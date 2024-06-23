import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "./server";
import xmlparser from "xml-parser";
import { logger } from "..";
import path from "node:path";
import { XmppService, type ClientInfo } from "./service";

interface ClientOptions {
  socket: ServerWebSocket<ChronosSocket>;
  message?: string | Buffer;
}

export default class XmppClient {
  private socket: ServerWebSocket<ChronosSocket>;
  private message: string | Buffer;
  private clientData: xmlparser.Document | null = null;

  constructor(options: ClientOptions) {
    this.socket = options.socket;
    this.message = options.message!;
  }

  async initialize(): Promise<void> {
    try {
      if (Buffer.isBuffer(this.message)) this.message = this.message.toString();

      this.clientData = xmlparser(this.message);

      if (!this.clientData) return this.socket.close(1008, "Invalid XML");

      await this.handleMessage();
    } catch (error) {
      logger.error(`Error initializing XmppClient: ${error}`);
      this.socket.close(1008, "Invalid XML");
    }
  }

  private async handleMessage(): Promise<void> {
    const { name } = this.clientData!.root;

    logger.debug(`Requested root: ${name}`);

    const handlerPath = path.join(__dirname, "handlers", `${name}.ts`);
    const handlerModule = await import(handlerPath);

    const handler = handlerModule.default;

    if (handler) await handler(this.socket, this.clientData!.root);
    else logger.error(`Root with the name '${name}' does not exist.`);

    this.handleValidConnection();
  }

  private handleValidConnection(): void {
    if (this.isValidConnection()) {
      const clientInfo = this.getClientInfo();

      if (clientInfo) {
        XmppService.xmppClients.set(clientInfo.accountId, clientInfo);
        XmppService.isConnectionActive = true;
      }
    }
  }

  private getClientInfo(): ClientInfo | null {
    const { accountId, displayName, jid, resource, token } = this.socket.data;
    if (!accountId || !displayName || !jid || !resource || !token) return null;

    return {
      accountId,
      displayName,
      token,
      jid,
      resource,
      socket: this.socket,
      lastPresenceUpdate: {
        away: false,
        status: "{}",
      },
    };
  }

  private isValidConnection(): boolean {
    const { isAuthenticated, accountId, displayName, jid, resource } = this.socket.data;

    return (
      !XmppService.isConnectionActive &&
      isAuthenticated === true &&
      typeof accountId === "string" &&
      typeof displayName === "string" &&
      typeof jid === "string" &&
      typeof resource === "string"
    );
  }
}
