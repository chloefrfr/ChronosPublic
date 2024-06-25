import type { XmppClient } from "../client";

export interface MUCInfo {
  members: MUCMember[];
}

interface MUCMember {
  accountId: string;
}

export namespace XmppService {
  export const clients: XmppClient[] = [];
  export let isUserLoggedIn: boolean = false;
  export const xmppMucs: { [key: string]: MUCInfo } = {};
  export const joinedMUCs: string[] = [];
}
