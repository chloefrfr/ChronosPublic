import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "./server";

export interface ClientInfo {
  accountId: string;
  displayName: string;
  token: string;
  jid: string;
  resource: string;
  lastPresenceUpdate: {
    away: boolean;
    status: string;
  };
}

export namespace XmppService {
  export const xmppClients: Map<ServerWebSocket<ChronosSocket>, ClientInfo> = new Map();
  export let isConnectionActive: boolean = false;
}
