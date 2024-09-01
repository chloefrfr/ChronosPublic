import { Repository, DataSource, type ObjectLiteral, type EntityTarget } from "typeorm";
import { config, logger } from "..";
import { User } from "../tables/user";
import { Account } from "../tables/account";
import { Tokens } from "../tables/tokens";
import { Profiles } from "../tables/profiles";
import { Hype } from "../tables/hype";
import { Friends } from "../tables/friends";
import { Item } from "../tables/storage/item";

import { Quests } from "../tables/quests";

interface DatabaseConfig {
  connectionString?: string;
  ssl?: boolean;
}

export default class Database {
  private connection!: DataSource;
  private repositories: Record<string, Repository<ObjectLiteral>> = {};

  constructor(private dbConfig: DatabaseConfig = {}) {}

  public async connect() {
    try {
      this.connection = new DataSource({
        type: "postgres",
        url: this.dbConfig.connectionString || config.databaseUrl,
        ssl: this.dbConfig.ssl ? { rejectUnauthorized: false } : false,
        entities: [User, Account, Tokens, Profiles, Hype, Friends, Item, Quests],
        synchronize: true,
        // logging: true,
        // logger: new ORMLogger(),
        migrations: [User, Account, Tokens, Profiles, Hype, Friends, Item],
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

  public getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.connection.getRepository(entity);
  }
}
