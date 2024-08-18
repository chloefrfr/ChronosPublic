import { Repository, In } from "typeorm";
import { Item, type ItemTypes } from "../../tables/storage/item";
import Database from "../Database.wrapper";

export class ItemStorageService {
  private itemRepository: Repository<Item>;
  private itemCache: Map<ItemTypes, Item>;

  constructor(private database: Database) {
    this.itemRepository = this.database.getRepository("item");
    this.itemCache = new Map<ItemTypes, Item>();
  }

  public async addItem(data: unknown | unknown[], type: ItemTypes): Promise<Item> {
    const existingItem = await this.itemRepository.findOne({ where: { type } });

    if (existingItem) {
      existingItem.data = data;
      await this.itemRepository.save(existingItem);
      this.addToCache(existingItem);
      return existingItem;
    } else {
      const newItem = this.itemRepository.create({ data, type });
      const savedItem = await this.itemRepository.save(newItem);
      this.addToCache(savedItem);
      return savedItem;
    }
  }

  public async getItemByType(type: ItemTypes): Promise<Item | null> {
    const item = await this.itemRepository.findOne({ where: { type } });

    return item;
  }

  public async deleteItem(type: ItemTypes): Promise<boolean> {
    const result = await this.itemRepository.delete({ type });

    if (result.affected! > 0) {
      this.removeFromCache(type);
      return true;
    }

    return false;
  }

  public async getAllItems(): Promise<Item[]> {
    return await this.itemRepository.find();
  }

  public async getItemsByTypes(types: ItemTypes[]): Promise<Item[]> {
    return await this.itemRepository.find({ where: { type: In(types) } });
  }

  public async deleteItemsByTypes(types: ItemTypes[]): Promise<boolean> {
    const result = await this.itemRepository.delete({ type: In(types) });

    if (result.affected! > 0) {
      types.forEach((type) => this.removeFromCache(type));
      return true;
    }

    return false;
  }

  private addToCache(item: Item): void {
    this.itemCache.set(item.type, item);
  }

  private removeFromCache(type: ItemTypes): void {
    this.itemCache.delete(type);
  }
}
