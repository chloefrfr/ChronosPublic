import axios from "axios";
import { app, logger } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import createTournamentInfo from "../utilities/createTournamentInfo";
import createPlaylistInfo from "../utilities/createPlaylistInfo";

interface Background {
  stage: string;
  _type: string;
  key: string;
}

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

    const backgrounds: Background[] = [
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
    ];

    const vaultBackground = {
      stage: backgrounds[1].stage,
      _type: "DynamicBackground",
      key: "vault",
    };

    return c.json({
      "jcr:isCheckedOut": true,
      _title: "Fortnite Game",
      "jcr:baseVersion": "a7ca237317f1e74e4b8154-226a-4450-a3cd-c77af841e798",
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
      creative: {
        _type: "CommonUI Simple Message",
        message: {
          image: "https://cdn2.unrealengine.com/subgameselect-cr-512x1024-371f42541731.png",
          hidden: false,
          messagetype: "normal",
          _type: "CommonUI Simple Message Base",
          title: "New Featured Islands!",
          body: "Your Island. Your Friends. Your Rules.\n\nDiscover new ways to play Fortnite, play community made games with friends and build your dream island.",
          spotlight: false,
        },
      },
      dynamicbackgrounds: {
        "jcr:isCheckedOut": true,
        backgrounds: {
          backgrounds,
          _type: "DynamicBackgroundList",
        },
        _title: "dynamicbackgrounds",
        _noIndex: false,
        "jcr:baseVersion": "a7ca237317f1e74e4b8154-226a-4450-a3cd-c77af841e798",
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      shopSections: {
        sectionList: {
          sections: [
            {
              bSortOffersByOwnership: false,
              bShowIneligibleOffersIfGiftable: false,
              bEnableToastNotification: true,
              background: vaultBackground,
              _type: "ShopSection",
              landingPriority: 0,
              bHidden: false,
              sectionId: "Featured",
              bShowTimer: true,
              sectionDisplayName: "Featured",
              bShowIneligibleOffers: true,
            },
            {
              bSortOffersByOwnership: false,
              bShowIneligibleOffersIfGiftable: false,
              bEnableToastNotification: true,
              background: vaultBackground,
              _type: "ShopSection",
              landingPriority: 1,
              bHidden: false,
              sectionId: "Daily",
              bShowTimer: true,
              sectionDisplayName: "Daily",
              bShowIneligibleOffers: true,
            },
            {
              bSortOffersByOwnership: false,
              bShowIneligibleOffersIfGiftable: false,
              bEnableToastNotification: false,
              background: vaultBackground,
              _type: "ShopSection",
              landingPriority: 2,
              bHidden: false,
              sectionId: "Battlepass",
              bShowTimer: false,
              sectionDisplayName: "Battle Pass",
              bShowIneligibleOffers: false,
            },
          ],
        },
        lastModified: "9999-12-12T00:00:00.000Z",
      },
      tournamentinformation: createTournamentInfo(),
      playlistinformation: {
        frontend_matchmaking_header_style: "None",
        _title: "playlistinformation",
        frontend_matchmaking_header_text: "",
        playlist_info: {
          _type: "Playlist Information",
          // @ts-ignore
          playlists: playlists[uahelper.season],
        },
        _noIndex: false,
        _activeDate: "2018-04-25T15:05:39.956Z",
        lastModified: "2019-10-29T14:05:17.030Z",
        _locale: "en-US",
      },
    });
  });
}
