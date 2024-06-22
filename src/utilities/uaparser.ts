export interface UserAgentInfo {
  buildId: string;
  buildString: string;
}

export interface SeasonInfo {
  season: number;
  build?: number;
  netcl?: string | undefined;
  buildUpdate: number | string;
  lobby: string;
  SeasonX: string;
}

export default function uaparser(userAgent: string | undefined): SeasonInfo | null {
  if (!userAgent) return null;

  const getBuildID = (): string | undefined =>
    userAgent.split("-")[3]?.split(",")[0] || userAgent.split("-")[1]?.split("+")[0];

  const parseBuildString = (buildString: string): number =>
    Math.floor(parseFloat(buildString)) || 0;

  const handleValidBuild = ({ buildId, buildString }: UserAgentInfo): SeasonInfo => {
    const netcl = !isNaN(Number(buildID)) ? buildID : undefined;
    let build = parseBuildString(buildString || "");
    const buildUpdate = userAgent.split("-")[1].split("+")[0];
    let season = build;
    let lobby: string = "";
    let SeasonX: string = "";

    switch (true) {
      case Number.isNaN(netcl):
        lobby = "LobbySeason0";
        season = 0;
        build = 0.0;
        break;

      case Number(netcl) < 3724489:
        lobby = "Season0";
        season = 0;
        build = 0.0;
        break;

      case Number(netcl) <= 3790078:
        lobby = "LobbySeason1";
        season = 1;
        build = 1.0;
        break;

      case buildUpdate === netcl || buildUpdate === "Cert":
        season = 2;
        build = 2.0;
        lobby = "LobbyWinterDecor";
        break;

      case season === 10:
        SeasonX = "seasonx";
        break;

      default:
        lobby = `Lobby${season}`;
        break;
    }

    return { season, build, netcl, lobby, buildUpdate, SeasonX };
  };

  const buildID = getBuildID();
  const buildString = userAgent.split("Release-")[1]?.split("-")[0] || "";

  if ((buildID || buildString) && !isNaN(parseFloat(buildID || buildString))) {
    return handleValidBuild({ buildId: buildID as string, buildString });
  }
  return null;
}
