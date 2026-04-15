import { useState, useEffect } from 'react';
import { db } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingDown, TrendingUp, AlertTriangle, Warehouse } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StatsOverviewProps {
  warehouseId: number | null;
}

export function StatsOverview({ warehouseId }: StatsOverviewProps) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    todayIn: 0,
    todayOut: 0,
    todayTransfer: 0,
  });
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(warehouseId?.toString() || 'all');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedWarehouse]);

  async function loadWarehouses() {
    const whs = await db.warehouses.toArray();
    setWarehouses(whs.map(w => ({ id: w.id!, name: w.name })));
  }

  async function loadStats() {
    const products = await db.products.toArray();
    const allStocks = await db.warehouseStocks.toArray();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 筛选仓库
    let filteredStocks = allStocks;
    if (selectedWarehouse !== 'all') {
      const whId = parseInt(selectedWarehouse);
      filteredStocks = allStocks.filter(s => s.warehouseId === whId);
    }

    // 计算总库存（按产品汇总）
    const stockByProduct = new Map<number, number>();
    for (const stock of filteredStocks) {
      const current = stockByProduct.get(stock.productId) || 0;
      stockByProduct.set(stock.productId, current + stock.quantity);
    }

    // 统计有库存的产品数
    const productsWithStock = Array.from(stockByProduct.entries()).filter(([_, qty]) => qty > 0);
    const totalStock = productsWithStock.reduce((sum, [_, qty]) => sum + qty, 0);

    // 库存预警（总库存低于阈值）
    let lowStockCount = 0;
    for (const product of products) {
      const totalQty = selectedWarehouse === 'all' 
        ? allStocks.filter(s => s.productId === product.id).reduce((sum, s) => sum + s.quantity, 0)
        : stockByProduct.get(product.id!) || 0;
      
      if (totalQty <= product.minStock) {
        lowStockCount++;
      }
    }

    // 今日记录
    let todayQuery = db.records.where('createdAt').above(today);
    if (selectedWarehouse !== 'all') {
      const whId = parseInt(selectedWarehouse);
      todayQuery = db.records.where('warehouseId').equals(whId);
    }
    const todayRecords = await todayQuery.toArray();
    
    // 如果是全部仓库，需要重新筛选
    const filteredTodayRecords = selectedWarehouse === 'all' 
      ? todayRecords 
      : await db.records.where('createdAt').above(today).filter(r => 
          r.warehouseId === parseInt(selectedWarehouse) || r.targetWarehouseId === parseInt(selectedWarehouse)
        ).toArray();

    const todayIn = filteredTodayRecords.filter((r) => r.type === 'in').reduce((sum, r) => sum + r.quantity, 0);
    const todayOut = filteredTodayRecords.filter((r) => r.type === 'out').reduce((sum, r) => sum + r.quantity, 0);
    const todayTransfer = filteredTodayRecords.filter((r) => r.type === 'transfer').reduce((sum, r) => sum + r.quantity, 0);

    setStats({
      totalProducts: productsWithStock.length,
      totalStock,
      lowStockCount,
      todayIn,
      todayOut,
      todayTransfer,
    });
  }

  return (
    <div className="space-y-4">
      {/* 仓库筛选 */}
      <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
        <SelectTrigger>
          <Warehouse className="w-4 h-4 mr-2" />
          <SelectValue placeholder="选择仓库" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部仓库</SelectItem>
          {warehouses.map((wh) => (
            <SelectItem key={wh.id} value={wh.id.toString()}>
              {wh.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <div className="text-xs text-gray-500">有库存产品</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalStock}</div>
                <div className="text-xs text-gray-500">总库存</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">+{stats.todayIn}</div>
                <div className="text-xs text-gray-500">今日进货</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">-{stats.todayOut}</div>
                <div className="text-xs text-gray-500">今日销售</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats.todayTransfer > 0 && (
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.todayTransfer}</div>
                  <div className="text-xs text-gray-500">今日调拨</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.lowStockCount > 0 && (
          <Card className="col-span-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
                  <div className="text-xs text-orange-600">款产品库存不足</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
