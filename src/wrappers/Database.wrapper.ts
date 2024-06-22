import { Repository, EntityMetadata, DataSource, type Logger, type QueryRunner } from "typeorm";
import { config, logger } from "..";
import { LoggerFactory } from "typeorm/logger/LoggerFactory.js";
import { User } from "../tables/user";
import { Account } from "../tables/account";
import { Tokens } from "../tables/tokens";
import { Timeline } from "../tables/timeline";
import { Profiles } from "../tables/profiles";

interface DatabaseConfig {
  connectionString?: string;
  ssl?: boolean;
}

class ORMLogger implements Logger {
  logQuery(query: string, parameters?: any[], queryRunner?: import("typeorm").QueryRunner): any {
    const start = process.hrtime();
    logger.info(`Query: ${query}`);
    const duration = process.hrtime(start);
    const milliseconds = duration[0] * 1000 + duration[1] / 1000000;
    logger.info(`Duration: ${milliseconds.toFixed(2)}ms`);
  }
  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    queryRunner?: import("typeorm").QueryRunner,
  ): any {
    logger.error(`QueryError: ${error}, Query: ${query}`);
  }
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: import("typeorm").QueryRunner,
  ): any {
    logger.warn(`QuerySlow: ${time}ms, Query: ${query}`);
  }
  logSchemaBuild(message: string, queryRunner?: import("typeorm").QueryRunner): any {
    logger.debug(`SchemaBuild: ${message}`);
  }
  logMigration(message: string, queryRunner?: import("typeorm").QueryRunner): any {
    logger.info(`Migration: ${message}`);
  }
  log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner | undefined) {}
}

export default class Database {
  private connection!: DataSource;
  private repositories: Record<string, Repository<any>> = {};

  constructor(private dbConfig: DatabaseConfig = {}) {}

  public async connect() {
    try {
      this.connection = new DataSource({
        type: "postgres",
        url: this.dbConfig.connectionString || config.databaseUrl,
        ssl: this.dbConfig.ssl ? { rejectUnauthorized: false } : false,
        entities: [User, Account, Tokens, Timeline, Profiles],
        synchronize: true,
        logging: true,
        logger: new ORMLogger(),
        migrations: [User, Account, Tokens, Timeline, Profiles],
      });

      await this.connection.initialize();

      const entityMetadatas = this.connection.entityMetadatas;

      for (const metadata of entityMetadatas) {
        const repository = this.connection.getRepository(metadata.name);
        this.repositories[metadata.name] = repository;
      }

      logger.startup("Connected to Database.");
    } catch (error) {
      logger.error(`Error connecting to database: ${error}`);
    }
  }

  public async disconnect() {
    try {
      await this.connection.close();
      logger.startup("Disconnected from Database.");
    } catch (error) {
      logger.error(`Error disconnecting from database: ${error}`);
    }
  }

  public getRepository(entityName: string): Repository<any> {
    return this.connection.getRepository(entityName);
  }
}
