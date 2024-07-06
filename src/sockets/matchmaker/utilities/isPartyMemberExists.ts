import { XmppService, type PartyInfo } from "../../xmpp/saved/XmppServices";

export function isPartyMemberExists(accountId: string): PartyInfo | undefined {
  for (const party of Object.values(XmppService.parties)) {
    for (const member of party.members) {
      if (member.account_id === accountId) return party;
    }
  }

  return undefined;
}
