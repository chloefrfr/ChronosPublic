import { Repository, In, EntityManager } from "typeorm";
import { Item, type ItemTypes } from "../../tables/storage/item";
import Database from "../Database.wrapper";

export class ItemStorageService {
  private itemRepository: Repository<Item>;
  private itemCache: Map<ItemTypes, Item>;

  constructor(private database: Database) {
    this.itemRepository = this.database.getRepository("item");
    this.itemCache = new Map<ItemTypes, Item>();
  }

  public async addItems(data: { data: unknown | unknown[]; type: ItemTypes }[]): Promise<Item[]> {
    return await this.itemRepository.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        const types = data.map((item) => item.type);
        const existingItems = await transactionalEntityManager.find(Item, {
          where: { type: In(types) },
        });

        const existingItemsMap = new Map<ItemTypes, Item>(
          existingItems.map((item) => [item.type, item]),
        );
        const newItems: Item[] = [];
        const updatedItems: Item[] = [];

        data.forEach(({ data, type }) => {
          if (existingItemsMap.has(type)) {
            const existingItem = existingItemsMap.get(type)!;
            existingItem.data = data;
            updatedItems.push(existingItem);
          } else {
            const newItem = transactionalEntityManager.create(Item, { data, type });
            newItems.push(newItem);
          }
        });

        if (newItems.length > 0) {
          await transactionalEntityManager.save(Item, newItems);
        }
        if (updatedItems.length > 0) {
          await transactionalEntityManager.save(Item, updatedItems);
        }

        const allItems = [...newItems, ...updatedItems];
        allItems.forEach((item) => this.itemCache.set(item.type, item));

        return allItems;
      },
    );
  }

  public async getItemByType(type: ItemTypes): Promise<Item | null> {
    if (this.itemCache.has(type)) {
      return this.itemCache.get(type) || null;
    }

    const item = await this.itemRepository.findOne({ where: { type } });
    if (item) {
      this.itemCache.set(item.type, item);
    }
    return item;
  }

  public async deleteItemsByTypes(types: ItemTypes[]): Promise<boolean> {
    if (types.length === 0) return false;

    const result = await this.itemRepository.delete({ type: In(types) });
    if (result.affected! > 0) {
      types.forEach((type) => this.itemCache.delete(type));
      return true;
    }

    return false;
  }

  public async getAllItems(): Promise<Item[]> {
    const items = await this.itemRepository.find();
    items.forEach((item) => this.itemCache.set(item.type, item));
    return items;
  }

  public async getItemsByTypes(types: ItemTypes[]): Promise<Item[]> {
    const cachedItems = types
      .map((type) => this.itemCache.get(type))
      .filter((item) => item !== undefined) as Item[];
    const typesToFetch = types.filter((type) => !this.itemCache.has(type));

    if (typesToFetch.length > 0) {
      const fetchedItems = await this.itemRepository.find({ where: { type: In(typesToFetch) } });
      fetchedItems.forEach((item) => this.itemCache.set(item.type, item));
      return [...cachedItems, ...fetchedItems];
    }

    return cachedItems;
  }
}
