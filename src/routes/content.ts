import axios from "axios";
import { app, logger } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import createTournamentInfo from "../utilities/createTournamentInfo";
import createPlaylistInfo from "../utilities/createPlaylistInfo";

export default function () {
  app.get("/content/api/pages/fortnite-game", async (c) => {
    const useragent = c.req.header("User-Agent");
    const timestamp = new Date().toISOString();

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

    const request = await fetch(
      "https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game",
    ).then((res) => res.json() as any);

    const seasonImages = {
      13: {
        solo: "",
        duo: "",
        battle_lab:
          "https://static2.srcdn.com/wordpress/wp-content/uploads/2020/06/Fortnite-Creative-Mode.jpg",
        arena_solo:
          "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
        arena_duos:
          "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
      },
    };

    const playlists = {
      13: [
        {
          image: seasonImages[13].solo,
          playlist_name: "Playlist_DefaultSolo",
          hidden: false,
          special_border: "None",
          _type: "FortPlaylistInfo",
          display_name: "Solo",
        },
        {
          image: seasonImages[13].duo,
          playlist_name: "Playlist_DefaultDuo",
          hidden: false,
          special_border: "None",
          _type: "FortPlaylistInfo",
        },
        {
          image: seasonImages[13].battle_lab,
          playlist_name: "Playlist_BattleLab",
          hidden: false,
          special_border: "None",
          _type: "FortPlaylistInfo",
        },
        {
          image: seasonImages[13].arena_solo,
          playlist_name: "Playlist_ShowdownAlt_Solo",
          hidden: false,
          _type: "FortPlaylistInfo",
          display_name: "Arena",
        },
        {
          image: seasonImages[13].arena_duos,
          playlist_name: "Playlist_ShowdownAlt_Duos",
          hidden: true,
          _type: "FortPlaylistInfo",
          display_name: "Arena",
        },
      ],
    };

    /// TODO - VaultBackgrounds (ShopBackgrounds) & Emergencynotices & Battleroyalenews

    request.dynamicbackgrounds = {
      "jcr:isCheckedOut": true,
      backgrounds: {
        backgrounds: [
          {
            stage: uahelper.season === 10 ? uahelper.SeasonX : `season${uahelper.season}`,
            _type: "DynamicBackground",
            key: "lobby",
          },
          {
            stage: uahelper.season === 10 ? uahelper.SeasonX : `season${uahelper.season}`,
            _type: "DynamicBackground",
            key: "vault",
          },
        ],
        _type: "DynamicBackgroundList",
      },
      _title: "dynamicbackgrounds",
      _noIndex: false,
      "jcr:baseVersion": "a7ca237317f1e71f17852c-bccd-4be6-89a0-1bb52672a444",
      _activeDate: new Date(),
      lastModified: new Date(),
      _locale: "en-US",
    };
    request.tournamentinformation = createTournamentInfo();
    request.playlistinformation = createPlaylistInfo(playlists, uahelper.season);
    request.subgameinfo.battleroyale = {};

    return c.json(request);
  });
}
