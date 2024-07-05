import { ServerStatus, type HostServer } from "./types";

export const servers: HostServer[] = [
  {
    sessionId: "",
    status: ServerStatus.OFFLINE,
    version: 0,
    identifier: "",
    address: "",
    port: 0,
    queue: [],
    options: {
      region: "",
    },
  },
];
