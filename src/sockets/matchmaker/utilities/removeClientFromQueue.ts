import type { XmppClient } from "../../xmpp/client";
import type { PartyInfo } from "../../xmpp/saved/XmppServices";

type PartyOrClientInfo = PartyInfo | XmppClient;

export function removeClientFromQueue(partyOrClient: PartyOrClientInfo, queue: string[]) {
  if ("members" in partyOrClient) {
    for (const member of partyOrClient.members) {
      const index = queue.indexOf(member.account_id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
  } else {
    const index = queue.indexOf(partyOrClient.accountId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }
}
