export enum ServerStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  MAINTENANCE = "maintenance",
}

export interface HostServer {
  sessionId: string;
  status: ServerStatus;
  port: number;
}
