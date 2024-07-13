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

  public async addItem(data: Record<string, any>[], type: ItemTypes): Promise<void> {
    let existingItem = await this.itemRepository.findOne({ where: { type } });

    if (existingItem) {
      for (const newData of data) {
        if (!existingItem.data[newData.templateId]) {
          existingItem.data[newData.templateId] = [];
        }
        existingItem.data[newData.templateId].push(newData);
      }
      await this.itemRepository.save(existingItem);
      this.addToCache(existingItem);
    } else {
      const newData = data.reduce((acc, curr) => {
        if (!acc[curr.templateId]) {
          acc[curr.templateId] = [];
        }
        acc[curr.templateId].push(curr);
        return acc;
      }, {});

      const newItem = this.itemRepository.create({ data: newData, type });
      await this.itemRepository.save(newItem);
      this.addToCache(newItem);
    }
  }

  public async getItemByType(type: ItemTypes): Promise<any | null> {
    const item = await this.itemRepository.findOne({ where: { type } });

    if (item && item.data) {
      try {
        const parsedData = JSON.parse(item.data);
        return parsedData;
      } catch (error) {
        return null;
      }
    }

    return null;
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
