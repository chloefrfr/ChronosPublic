import type { PartyInfo } from "../../xmpp/saved/XmppServices";

export function getQueueLength(party: PartyInfo | undefined) {
  let clients: number = 0;

  if (!party) return;

  clients += party.members.length;

  return clients;
}
