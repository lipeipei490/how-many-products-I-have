import { useState, useEffect } from 'react';
import { db, type Category, type Warehouse } from '@/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductList } from '@/components/ProductList';
import { AddProduct } from '@/components/AddProduct';
import { CategoryManager } from '@/components/CategoryManager';
import { WarehouseManager } from '@/components/WarehouseManager';
import { StatsOverview } from '@/components/StatsOverview';
import { AllRecords } from '@/components/AllRecords';
import { Package, List, BarChart3, History, Warehouse as WarehouseIcon } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadCategories();
    loadWarehouses();
    initDefaultData();
  }, []);

  async function loadCategories() {
    const cats = await db.categories.toArray();
    setCategories(cats);
  }

  async function loadWarehouses() {
    const whs = await db.warehouses.toArray();
    setWarehouses(whs);
    
    // 如果没有选中仓库，选择默认仓库
    if (!selectedWarehouseId) {
      const defaultWh = whs.find(w => w.isDefault);
      if (defaultWh) {
        setSelectedWarehouseId(defaultWh.id!);
      } else if (whs.length > 0) {
        setSelectedWarehouseId(whs[0].id!);
      }
    }
  }

  async function initDefaultData() {
    // 如果没有分类，创建默认分类
    const catCount = await db.categories.count();
    if (catCount === 0) {
      await db.categories.add({ name: '未分类', createdAt: new Date() });
      await loadCategories();
    }

    // 如果没有仓库，创建默认仓库
    const whCount = await db.warehouses.count();
    if (whCount === 0) {
      await db.warehouses.add({ 
        name: '默认仓库', 
        isDefault: true,
        createdAt: new Date() 
      });
      await loadWarehouses();
    }
  }

  function handleDataUpdate() {
    setRefreshKey((prev) => prev + 1);
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">产品库存管家</h1>
            </div>
            <div className="flex gap-2">
              <WarehouseManager warehouses={warehouses} onUpdate={loadWarehouses} />
              <CategoryManager categories={categories} onUpdate={loadCategories} />
            </div>
          </div>
          
          {/* 仓库选择器 */}
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-gray-500" />
            <Select 
              value={selectedWarehouseId?.toString() || ''} 
              onValueChange={(value) => setSelectedWarehouseId(parseInt(value))}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="选择仓库" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id!.toString()}>
                    {wh.name} {wh.isDefault && '(默认)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="inventory" className="flex items-center gap-1">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">库存</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">记录</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">统计</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-0">
            <ProductList 
              key={refreshKey} 
              warehouseId={selectedWarehouseId}
              warehouses={warehouses}
            />
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            <AllRecords 
              warehouseId={selectedWarehouseId}
              warehouses={warehouses}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <StatsOverview warehouseId={selectedWarehouseId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* 浮动添加按钮 */}
      <div className="fixed bottom-6 right-6">
        <AddProduct 
          categories={categories} 
          warehouses={warehouses}
          defaultWarehouseId={selectedWarehouseId}
          onSuccess={handleDataUpdate} 
        />
      </div>

      {/* 底部提示 */}
      <footer className="max-w-lg mx-auto px-4 py-4 text-center text-xs text-gray-400 pb-24">
        <p>数据存储在本地，清除浏览器数据会丢失</p>
        <p className="mt-1">可以添加到主屏幕像 App 一样使用</p>
      </footer>

      <Toaster />
    </div>
  );
}

export default App;