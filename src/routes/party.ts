import type { Context } from "hono";
import { app, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";
import { XmppService } from "../sockets/xmpp/saved/XmppServices";
import { randomUUID } from "node:crypto";
import uaparser from "../utilities/uaparser";
import { time } from "discord.js";
import { date } from "zod";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

export default function () {
  app.get(
    "/party/api/v1/Fortnite/user/:accountId/notifications/undelivered/count",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");

      const pingsCount = XmppService.pings.filter((ping) => ping.sent_to === accountId).length;

      const party = Object.values(XmppService.parties).find((member) =>
        member.members.some((m) => m.account_id === accountId),
      );

      const invitesCount = party
        ? party.invites.filter((invite) => invite.sent_to === accountId).length
        : 0;

      return c.json({ pings: pingsCount, invites: invitesCount });
    },
  );

  app.get("/party/api/v1/Fortnite/user/:accountId", Validation.verifyToken, async (c) => {
    const accountId = c.req.param("accountId");

    const parties = Object.values(XmppService.parties).filter((party) =>
      party.members.some((m) => m.account_id === accountId),
    );

    return c.json({
      current: parties.length > 0 ? parties : [],
      pending: [],
      invites: [],
      pings: XmppService.pings.filter((ping) => ping.sent_to === accountId),
    });
  });

  app.post("/party/api/v1/Fortnite/parties", Validation.verifyToken, async (c) => {
    const body = await c.req.json();
    const timestamp = new Date().toISOString();

    const { join_info, config, meta } = body;

    if (!join_info || !join_info.connection) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "JoinInfo or JoinInfoConnection was not found.",
          timestamp,
        ),
      );
    }

    const partyId = randomUUID();

    const party = {
      id: partyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config,
      members: [
        {
          account_id: (join_info.connection.id || "").split("@prod")[0],
          meta: join_info.meta || {},
          connections: [
            {
              id: join_info.connection.id || "",
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              yield_leadership: join_info.connection.yield_leadership || false,
              meta: join_info.connection.meta || {},
            },
          ],
          revision: 0,
          updated_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          role: "CAPTAIN",
        },
      ],
      applicants: [],
      meta: meta || {},
      invites: [],
      revision: 0,
    };

    XmppService.parties[partyId] = party;

    return c.json(party);
  });

  app.patch("/party/api/v1/Fortnite/parties/:partyId", Validation.verifyToken, async (c) => {
    const partyId = c.req.param("partyId");
    const newParty = XmppService.parties[partyId];
    const timestamp = new Date().toISOString();

    const body = await c.req.json();

    if (!newParty) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          `Party with the id '${partyId}' does not exist.`,
          timestamp,
        ),
      );
    }

    const { config, meta, revision } = body;

    if (config) {
      Object.assign(newParty.config, config);
    }

    if (meta) {
      for (const property of Object.keys(meta.delete || {})) {
        delete newParty.meta[property];
      }

      Object.assign(newParty.meta, meta.update || {});
    }

    newParty.revision = revision;
    newParty.updated_at = new Date().toISOString();

    const captain = newParty.members.find((member) => member.role === "CAPTAIN");

    XmppService.parties[partyId] = newParty;

    newParty.members.forEach(async (member) => {
      SendMessageToId(
        JSON.stringify({
          captain_id: captain!.account_id,
          created_at: newParty.created_at,
          invite_ttl_seconds: 14400,
          max_number_of_members: newParty.config.max_size,
          ns: "Fortnite",
          party_id: newParty.id,
          party_privacy_type: newParty.config.joinability,
          party_state_overriden: {},
          party_state_removed: meta.delete,
          party_state_updated: meta.update,
          party_sub_type: newParty.meta["urn:epic:cfg:party-type-id_s"],
          party_type: "DEFAULT",
          revision: newParty.revision,
          sent: new Date().toISOString(),
          type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
          updated_at: new Date().toISOString(),
        }),
        member.account_id,
      );
    });

    return c.body(null, 200);
  });

  app.patch(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId/meta",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const partyId = c.req.param("partyId");

      const newParty = XmppService.parties[partyId];
      const timestamp = new Date().toISOString();

      const body = await c.req.json();

      const { delete: MetaDelete = {}, update = {}, revision } = body;

      if (!newParty) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party with the id '${partyId}' does not exist.`,
            timestamp,
          ),
        );
      }

      const member = newParty.members.find((m) => m.account_id === accountId);

      if (!member) {
        return c.json(errors.createError(404, c.req.url, "Member not found.", timestamp));
      }

      for (const property of Object.keys(MetaDelete)) {
        delete member.meta[property];
      }

      Object.assign(member.meta, update);
      member.revision = revision;
      member.updated_at = new Date().toISOString();
      newParty.updated_at = new Date().toISOString();

      XmppService.parties[partyId] = newParty;

      newParty.members.forEach((m) => {
        SendMessageToId(
          JSON.stringify({
            account_id: accountId,
            account_dn: m.meta["urn:epic:member:dn_s"],
            member_state_updated: update,
            member_state_removed: MetaDelete,
            member_state_overridden: {},
            party_id: newParty.id,
            updated_at: new Date().toISOString(),
            sent: new Date().toISOString(),
            revision: member.revision,
            ns: "Fortnite",
            type: "com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED",
          }),
          m.account_id,
        );
      });

      return c.body(null, 200);
    },
  );

  app.get("/party/api/v1/Fortnite/parties/:partyId", Validation.verifyToken, async (c) => {
    const partyId = c.req.param("partyId");

    const newParty = XmppService.parties[partyId];
    const timestamp = new Date().toISOString();

    if (!newParty) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          `Party with the id '${partyId}' does not exist.`,
          timestamp,
        ),
      );
    }

    return c.json(newParty);
  });

  app.delete(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId",
    Validation.verifyToken,
    async (c) => {
      const partyId = c.req.param("partyId");
      const accountId = c.req.param("accountId");

      const newParty = XmppService.parties[partyId];
      const timestamp = new Date().toISOString();

      if (!newParty) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Party with the id '${partyId}' does not exist.`,
            timestamp,
          ),
        );
      }

      const memberIndex = newParty.members.findIndex((member) => member.account_id === accountId);

      if (memberIndex === -1) {
        return c.json(errors.createError(404, c.req.url, "Member not found.", timestamp));
      }

      newParty.members.forEach((m) => {
        SendMessageToId(
          JSON.stringify({
            account_id: accountId,
            member_state_update: {},
            ns: "Fortnite",
            party_id: newParty.id,
            revision: newParty.revision || 0,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.MEMBER_LEFT",
          }),
          m.account_id,
        );
      });

      newParty.members.splice(memberIndex, 1);

      if (newParty.members.length === 0) {
        delete XmppService.parties[partyId];
      }

      return c.body(null, 200);
    },
  );
  app.post(
    "/party/api/v1/Fortnite/parties/:partyId/members/:accountId/join",
    Validation.verifyToken,
    async (c) => {
      const partyId = c.req.param("partyId");
      const accountId = c.req.param("accountId");

      const newParty = XmppService.parties[partyId];
      const timestamp = new Date().toISOString();

      const { meta, connection } = await c.req.json();

      if (!newParty) {
        return c.json({
          error: {
            status: 400,
            message: `Party with the id '${partyId}' does not exist.`,
            timestamp,
          },
        });
      }

      let memberIndex = newParty.members.findIndex((member) => member.account_id === accountId);

      if (memberIndex !== -1) {
        return c.json({
          status: "JOINED",
          party_id: newParty.id,
        });
      }

      const partyMember = {
        account_id: (connection.id || "").split("@prod")[0],
        meta: meta || {},
        connections: [
          {
            id: connection.id || "",
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            yield_leadership: !!connection.yield_leadership,
            meta: connection.meta || {},
          },
        ],
        revision: 0,
        updated_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        role: connection.yield_leadership ? "CAPTAIN" : "MEMBER",
      };

      newParty.members.push(partyMember);
      newParty.updated_at = new Date().toISOString();

      XmppService.parties[partyId] = newParty;

      newParty.members.forEach((member) => {
        SendMessageToId(
          JSON.stringify({
            account_dn: connection.meta["urn:epic:member:dn_s"],
            account_id: (connection.id || "").split("@prod")[0],
            connection: {
              connected_at: new Date().toISOString(),
              id: connection.id,
              meta: connection.meta,
              updated_at: new Date().toISOString(),
            },
            joined_at: new Date().toISOString(),
            member_state_updated: meta || {},
            ns: "Fortnite",
            party_id: newParty.id,
            revision: 0,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
            updated_at: new Date().toISOString(),
          }),
          member.account_id,
        );
      });

      return c.json({
        status: "JOINED",
        party_id: newParty.id,
      });
    },
  );

  app.post(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId",
    Validation.verifyToken,
    async (c) => {
      const useragent = c.req.header("User-Agent");
      const timestamp = new Date().toISOString();
      const accountId = c.req.param("accountId");
      const pingerId = c.req.param("pingerId");

      if (!useragent)
        return c.json(
          errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
          400,
        );

      const uahelper = uaparser(useragent);

      if (!uahelper)
        return c.json(
          errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
          400,
        );

      var pIndex;
      if (
        (pIndex = XmppService.pings
          .filter((p) => p.sent_to == accountId)
          .findIndex((p) => p.sent_by == pingerId)) != -1
      )
        XmppService.pings.splice(pIndex, 1);

      var d = new Date();
      d.setHours(d.getHours() + 1);

      var ping = {
        sent_by: pingerId,
        sent_to: accountId,
        sent_at: new Date().toISOString(),
        expires_at: d.toISOString(),
        meta: {},
      };
      XmppService.pings.push(ping);

      const user = await userService.findUserByAccountId(pingerId);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

      SendMessageToId(
        accountId,
        JSON.stringify({
          expires: ping.expires_at,
          meta: {},
          ns: "Fortnite",
          pinger_dn: user.username,
          pinger_id: pingerId,
          sent: ping.sent_at,
          version: uahelper.season,
          type: "com.epicgames.social.party.notification.v0.PING",
        }),
      );

      return c.json(ping);
    },
  );

  app.delete(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const pingerId = c.req.param("pingerId");

      const pingIndex = XmppService.pings.findIndex(
        (ping) => ping.sent_to === accountId && ping.sent_by === pingerId,
      );

      if (pingIndex !== -1) {
        XmppService.pings.splice(pingIndex, 1);
      }

      return c.body(null, 200);
    },
  );

  app.get(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/parties",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const pingerId = c.req.param("pingerId");

      let queriedPings = XmppService.pings.filter(
        (ping) => ping.sent_to === accountId && ping.sent_by === pingerId,
      );

      if (queriedPings.length === 0) {
        queriedPings = [{ sent_by: pingerId }];
      }

      const parties = Object.values(XmppService.parties);
      const result = queriedPings
        .map((ping) => {
          const party = parties.find((p) =>
            p.members.some((member) => member.account_id === ping.sent_by),
          );

          if (!party) return null;

          return {
            id: party.id,
            created_at: party.created_at,
            updated_at: party.updated_at,
            config: party.config,
            members: party.members,
            applicants: [],
            meta: party.meta,
            invites: [],
            revision: party.revision || 0,
          };
        })
        .filter((party) => party !== null);

      return c.json(result);
    },
  );

  app.post(
    "/party/api/v1/Fortnite/user/:accountId/pings/:pingerId/join",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const pingerId = c.req.param("pingerId");

      const { connection, meta } = await c.req.json();

      let ping = XmppService.pings.find((p) => p.sent_to === accountId && p.sent_by === pingerId);
      if (!ping) {
        ping = { sent_by: pingerId };
      }

      const newParty = Object.values(XmppService.parties).find((party) =>
        party.members.some((member) => member.account_id === ping.sent_by),
      );

      const memberIndex = newParty!.members.findIndex((member) => member.account_id === accountId);
      if (memberIndex !== -1) {
        return c.json({
          status: "JOINED",
          party_id: newParty!.id,
        });
      }

      const connectionId = (connection.id || "").split("@prod")[0];
      const mem = {
        account_id: accountId,
        meta: meta || {},
        connections: [
          {
            id: connection.id || "",
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            yield_leadership: !!connection.yield_leadership,
            meta: connection.meta || {},
          },
        ],
        revision: 0,
        updated_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        role: connection.yield_leadership ? "CAPTAIN" : "MEMBER",
      };

      newParty!.members.push(mem);
      newParty!.updated_at = new Date().toISOString();
      XmppService.parties[newParty!.id] = newParty!;

      newParty!.members.forEach(async (member) => {
        SendMessageToId(
          JSON.stringify({
            account_dn: connection.meta["urn:epic:member:dn_s"],
            account_id: connectionId,
            connection: {
              connected_at: new Date().toISOString(),
              id: connection.id,
              meta: connection.meta,
              updated_at: new Date().toISOString(),
            },
            joined_at: new Date().toISOString(),
            member_state_updated: meta || {},
            ns: "Fortnite",
            party_id: newParty!.id,
            revision: 0,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
            updated_at: new Date().toISOString(),
          }),
          member.account_id,
        );
      });

      return c.json({
        status: "JOINED",
        party_id: newParty!.id,
      });
    },
  );
}
