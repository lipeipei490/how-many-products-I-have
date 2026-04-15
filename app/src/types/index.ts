export interface Warehouse {
  id?: number;
  name: string;
  address?: string;
  note?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Category {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface Product {
  id?: number;
  name: string;
  spec: string;
  photo?: string;
  categoryId: number;
  minStock: number;
  createdAt: Date;
}

export interface WarehouseStock {
  id?: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockRecord {
  id?: number;
  productId: number;
  warehouseId: number;
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  note?: string;
  targetWarehouseId?: number;
  createdAt: Date;
}

export interface ProductWithStock extends Product {
  stocks?: { warehouseId: number; warehouseName: string; quantity: number }[];
  totalStock?: number;
}

export interface RecordWithDetails extends StockRecord {
  productName?: string;
  productSpec?: string;
  warehouseName?: string;
  targetWarehouseName?: string;
}
