import {
  Repository,
  DataSource,
  type ObjectType,
  EntityMetadata,
  type EntityTarget,
  type QueryRunner,
  type Logger,
} from "typeorm";
import { config, logger } from "..";
import { LoggerFactory } from "typeorm/logger/LoggerFactory.js";
import { User } from "../tables/user";
import { Account } from "../tables/account";
import { Tokens } from "../tables/tokens";
import { Timeline } from "../tables/timeline";
import { Profiles } from "../tables/profiles";
import { Hype } from "../tables/hype";
import { Friends } from "../tables/friends";
import { Item } from "../tables/storage/item";
import { Server } from "../tables/server";
import { DailyQuest } from "../tables/storage/other/dailyQuestStorage";
import { BattlepassQuest } from "../tables/storage/other/battlepassQuestStorage";

interface DatabaseConfig {
  connectionString?: string;
  ssl?: boolean;
}

class ORMLogger implements Logger {
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    const start = process.hrtime();
    logger.info(`Query: ${query}`);
    const duration = process.hrtime(start);
    const milliseconds = duration[0] * 1000 + duration[1] / 1000000;
    logger.info(`Duration: ${milliseconds.toFixed(2)}ms`);
  }
  logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    logger.error(`QueryError: ${error}, Query: ${query}`);
  }
  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    logger.warn(`QuerySlow: ${time}ms, Query: ${query}`);
  }
  logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
    logger.debug(`SchemaBuild: ${message}`);
  }
  logMigration(message: string, queryRunner?: QueryRunner): any {
    logger.info(`Migration: ${message}`);
  }
  log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner | undefined) {}
}

export default class Database {
  private connection!: DataSource;
  private repositories: Record<string, Repository<any>> = {};
  private cache: Record<string, any> = {};

  constructor(private dbConfig: DatabaseConfig = {}) {}

  public async connect() {
    try {
      this.connection = new DataSource({
        type: "postgres",
        url: this.dbConfig.connectionString || config.databaseUrl,
        ssl: this.dbConfig.ssl ? { rejectUnauthorized: false } : false,
        entities: [
          User,
          Account,
          Tokens,
          Timeline,
          Profiles,
          Hype,
          Friends,
          Item,
          Server,
          DailyQuest,
          BattlepassQuest,
        ],
        synchronize: true,
        // logging: true,
        // logger: new ORMLogger(),
        migrations: [
          User,
          Account,
          Tokens,
          Timeline,
          Profiles,
          Hype,
          Friends,
          Item,
          Server,
          DailyQuest,
          BattlepassQuest,
        ],
      });

      await this.connection.initialize();

      if (config.drop) {
        await this.dropAllTables(config.drop);
      }

      await this.connection.synchronize();

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

  public async dropAllTables(drop: boolean) {
    if (!drop) return;

    if (!this.connection.isInitialized) {
      logger.error("Database connection is not initialized.");
      return;
    }

    const queryRunner = this.connection.createQueryRunner();

    try {
      logger.info("Dropping tables");

      const tables = await queryRunner.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public';
      `);

      for (const { tablename } of tables) {
        const tableExists = await queryRunner.query(
          `
          SELECT EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename = $1
          );
        `,
          [tablename],
        );

        if (tableExists[0].exists) {
          try {
            await queryRunner.query(`DROP TABLE "${tablename}" CASCADE`);
            logger.info(`Dropped table: ${tablename}`);
          } catch (dropError) {
            logger.error(`Failed to drop table ${tablename}: ${dropError}`);
          }
        }
      }

      logger.info("Dropped all tables successfully.");
    } catch (error) {
      logger.error(`Failed to drop tables: ${error}`);
    } finally {
      await queryRunner.release();
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

  private async getFromCache(key: string): Promise<any | undefined> {
    const cachedItem = this.cache[key];
    if (cachedItem) {
      const { value, expiry } = cachedItem;
      if (expiry === 0 || Date.now() < expiry) {
        return value;
      } else {
        delete this.cache[key];
      }
    }
    return undefined;
  }

  private async setToCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const expiry = ttlSeconds === 0 ? 0 : Date.now() + ttlSeconds * 1000;
    this.cache[key] = { value, expiry };
  }

  public async getCachedRepository(entityName: string): Promise<Repository<any>> {
    const cachedRepo = await this.getFromCache(`repo_${entityName}`);
    if (cachedRepo) {
      return cachedRepo;
    } else {
      const repository = this.connection.getRepository(entityName);
      await this.setToCache(`repo_${entityName}`, repository);
      return repository;
    }
  }
}
