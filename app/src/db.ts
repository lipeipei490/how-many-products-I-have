import Dexie, { type Table } from 'dexie';

// 仓库
export interface Warehouse {
  id?: number;
  name: string;
  address?: string;
  note?: string;
  isDefault: boolean;
  createdAt: Date;
}

// 产品分类
export interface Category {
  id?: number;
  name: string;
  createdAt: Date;
}

// 产品
export interface Product {
  id?: number;
  name: string;
  spec: string;
  photo?: string;
  categoryId: number;
  minStock: number; // 库存预警阈值
  createdAt: Date;
}

// 仓库库存（产品和仓库的多对多关系）
export interface WarehouseStock {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

// 库存记录（进货/销售）
export interface StockRecord {
  id?: number;
  productId: number;
  warehouseId: number;
  type: 'in' | 'out' | 'transfer'; // in=进货, out=销售, transfer=调拨
  quantity: number;
  note?: string;
  targetWarehouseId?: number; // 调拨目标仓库
  createdAt: Date;
}

// 数据库类
export class InventoryDB extends Dexie {
  warehouses!: Table<Warehouse>;
  categories!: Table<Category>;
  products!: Table<Product>;
  warehouseStocks!: Table<WarehouseStock>;
  records!: Table<StockRecord>;

  constructor() {
    super('InventoryDB');
    this.version(2).stores({
      warehouses: '++id, name, isDefault',
      categories: '++id, name',
      products: '++id, name, categoryId',
      warehouseStocks: '++id, [productId+warehouseId], productId, warehouseId',
      records: '++id, productId, warehouseId, type, createdAt',
    });
  }
}

export const db = new InventoryDB();
