import type { XmppClient } from "../../xmpp/client";
import { XmppService, type PartyInfo } from "../../xmpp/saved/XmppServices";

type PartyOrClientInfo = PartyInfo | XmppClient | undefined;

export function isPartyMemberExists(accountId: string): PartyOrClientInfo {
  for (const party of Object.values(XmppService.parties)) {
    for (const member of party.members) {
      if (member.account_id === accountId) {
        return party;
      }
    }
  }

  for (const client of XmppService.clients) {
    if (client.accountId === accountId) {
      return client;
    }
  }

  return undefined;
}
