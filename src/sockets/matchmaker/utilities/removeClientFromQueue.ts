import type { PartyInfo } from "../../xmpp/saved/XmppServices";

export function removeClientFromQueue(party: PartyInfo, queue: string[]) {
  for (const members of party.members) {
    const index = queue.findIndex((id) => id === members.account_id);

    if (index === -1) queue.splice(index, 1);
  }
}
