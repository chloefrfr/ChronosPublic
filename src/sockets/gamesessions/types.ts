export enum ServerStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  MAINTENANCE = "maintenance",
}

export interface HostServer {
  sessionId: string;
  status: ServerStatus;
  version: number;
  identifier: string;
  address: string;
  port: number;
  queue: string[];
  options: ServerOptions;
}

export interface ServerOptions {
  region: string;
}
