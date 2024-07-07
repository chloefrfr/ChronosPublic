import type { Repository } from "typeorm";
import { Server } from "../../tables/server";
import type Database from "../Database.wrapper";
import { logger } from "../..";

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

  public async setServerStatus(sessionId: string, status: string): Promise<boolean> {
    try {
      const updateResult = await this.serverRepository
        .createQueryBuilder()
        .update(Server)
        .set({ status })
        .where("sessionId = :sessionId", { sessionId })
        .execute();

      return !!updateResult.affected;
    } catch (error) {
      logger.error(`Failed to set status: ${error}`);
      return false;
    }
  }
}
