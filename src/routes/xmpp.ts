import { app } from "..";
import { XmppService } from "../xmpp/service";

export default function () {
  app.get("/xmpp/services/clients", async (c) => {
    return c.json({
      connectedClients: XmppService.xmppClients.length,
      clients: XmppService.xmppClients,
    });
  });
}
