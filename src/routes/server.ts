import { app } from "..";
import { XmppService } from "../xmpp/saved/XmppServices";

export default function () {
  app.get("/chronos/api/server/data/:type", async (c) => {
    const type = c.req.param("type");

    switch (type) {
      case "parties":
        return c.json(XmppService.parties);
      case "pings":
        return c.json(XmppService.pings);
      case "clients":
        return c.json(XmppService.clients);
      case "mucs":
        return c.json(XmppService.xmppMucs);
    }
  });
}