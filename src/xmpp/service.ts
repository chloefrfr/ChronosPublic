import type { ServerWebSocket } from "bun";
import type { ChronosSocket } from "./server";

export interface ClientInfo {
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

export interface MUCInfo {
  members: MUCMember[];
}

interface MUCMember {
  accountId: string;
}

export namespace XmppService {
  export const xmppClients: Map<string, ClientInfo> = new Map();
  export const xmppMucs: Map<string, MUCInfo> = new Map();
  export const joinedMUCs: string[] = [];
  export let isConnectionActive: boolean = false;
}
