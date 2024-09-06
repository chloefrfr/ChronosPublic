import type { XmppClient } from "../client";

export interface MUCInfo {
  members: MUCMember[];
}

interface MUCMember {
  accountId: string;
}

export interface PartyInfo {
  id: string;
  created_at: string;
  updated_at: string;
  config: any;
  members: PartyMember[];
  applicants: any[];
  meta: any;
  invites: any[];
  revision: number;
}

interface PartyConfig {
  max_size: number;
  joinability: string;
}

interface PartyMember {
  account_id: string;
  meta: any;
  connections: Connection[];
  revision: number;
  updated_at: string;
  joined_at: string;
  role: string;
}

interface Connection {
  id: string;
  connected_at: string;
  updated_at: string;
  yield_leadership: boolean;
  meta: any;
}

interface Pings {
  id?: string;
  sent_to?: string;
  sent_by?: string;
  sent_at?: string;
  expires_at?: string;
  meta?: any;
}

interface Invites {
  sent_to: string;
}

export type StatusInfo = {
  Properties: Record<string, StatusData>;
};

interface StatusData {
  partyId: string;
}

export namespace XmppService {
  export const clients: XmppClient[] = [];
  export let isUserLoggedIn: boolean = false;
  export const xmppMucs: { [key: string]: MUCInfo } = {};
  export const parties: { [key: string]: PartyInfo } = {};
  export const pings: Pings[] = [];
  export const joinedMUCs: string[] = [];
}
