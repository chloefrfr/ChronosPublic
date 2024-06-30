import type { Repository } from "typeorm";
import type { Server } from "../../tables/server";
import type Database from "../Database.wrapper";

export class ServerService {
  private serverRepository: Repository<Server>;

  constructor(private database: Database) {
    this.serverRepository = this.database.getRepository("server");
  }

  public async create(server: Partial<Server>): Promise<Server> {
    const newServer = this.serverRepository.create(server);
    await this.serverRepository.save(newServer);
    return newServer;
  }

  public async listServers(): Promise<Server[]> {
    return await this.serverRepository.find();
  }

  public async getServerBySessionId(sessionId: string): Promise<Server | null> {
    return await this.serverRepository.findOne({ where: { sessionId } });
  }
}
