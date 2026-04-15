import { useState, useEffect } from 'react';
import { db, type Product, type Category, type Warehouse } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, Plus, Minus, History, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StockForm } from './StockForm';
import { RecordHistory } from './RecordHistory';
import { TransferForm } from './TransferForm';


interface ProductListProps {
  warehouseId: number | null;
  warehouses: Warehouse[];
}

interface ProductWithDetails extends Product {
  category?: Category;
  stocks: { warehouseId: number; warehouseName: string; quantity: number }[];
  totalStock: number;
  currentWarehouseStock: number;
}

export function ProductList({ warehouseId, warehouses }: ProductListProps) {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [stockType, setStockType] = useState<'in' | 'out'>('in');

  useEffect(() => {
    loadProducts();
  }, [warehouseId]);

  async function loadProducts() {
    const allProducts = await db.products.toArray();
    const allStocks = await db.warehouseStocks.toArray();
    
    const productsWithDetails = await Promise.all(
      allProducts.map(async (p) => {
        const category = await db.categories.get(p.categoryId);
        
        // 获取该产品在所有仓库的库存
        const productStocks = allStocks.filter(s => s.productId === p.id);
        const stocks = await Promise.all(
          productStocks.map(async (s) => {
            const wh = await db.warehouses.get(s.warehouseId);
            return {
              warehouseId: s.warehouseId,
              warehouseName: wh?.name || '未知仓库',
              quantity: s.quantity,
            };
          })
        );
        
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
        const currentWarehouseStock = stocks.find(s => s.warehouseId === warehouseId)?.quantity || 0;
        
        return {
          ...p,
          category,
          stocks,
          totalStock,
          currentWarehouseStock,
        };
      })
    );
    
    setProducts(productsWithDetails);
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.spec.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 库存预警（总库存低于阈值）
  const lowStockProducts = products.filter((p) => p.totalStock <= p.minStock);

  return (
    <div className="space-y-4">
      {/* 库存预警 */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">库存预警</span>
            </div>
            <div className="text-sm text-orange-600">
              以下 {lowStockProducts.length} 款产品总库存不足：
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge key={p.id} variant="outline" className="border-orange-300 text-orange-700">
                  {p.name}（共 {p.totalStock}）
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜索产品名称或规格..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 产品列表 */}
      <div className="grid gap-3">
        {filteredProducts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无产品数据</p>
              <p className="text-sm mt-1">点击右下角添加产品</p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* 产品图片 */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.photo ? (
                      <img
                        src={product.photo}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* 产品信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.spec}</p>
                        {product.category && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          product.totalStock <= product.minStock ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {product.totalStock}
                        </div>
                        <div className="text-xs text-gray-400">总库存</div>
                      </div>
                    </div>

                    {/* 各仓库库存 */}
                    {product.stocks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.stocks.map((s) => (
                          <Badge 
                            key={s.warehouseId} 
                            variant="outline" 
                            className={`text-xs ${
                              s.warehouseId === warehouseId ? 'bg-indigo-50 border-indigo-200' : ''
                            }`}
                          >
                            {s.warehouseName}: {s.quantity}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setStockType('in');
                          setShowStockForm(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        进货
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setStockType('out');
                          setShowStockForm(true);
                        }}
                        disabled={product.currentWarehouseStock <= 0}
                      >
                        <Minus className="w-4 h-4 mr-1" />
                        销售
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-purple-600 border-purple-200 hover:bg-purple-50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowTransferForm(true);
                        }}
                        disabled={product.currentWarehouseStock <= 0}
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-1" />
                        调拨
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{product.name} - 历史记录</DialogTitle>
                          </DialogHeader>
                          <RecordHistory productId={product.id!} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 进货/销售弹窗 */}
      <Dialog open={showStockForm} onOpenChange={setShowStockForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockType === 'in' ? '进货' : '销售'} - {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && warehouseId && (
            <StockForm
              product={selectedProduct}
              warehouseId={warehouseId}
              warehouses={warehouses}
              type={stockType}
              onSuccess={() => {
                setShowStockForm(false);
                loadProducts();
              }}
              onCancel={() => setShowStockForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 调拨弹窗 */}
      <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>库存调拨 - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && warehouseId && (
            <TransferForm
              product={selectedProduct}
              fromWarehouseId={warehouseId}
              warehouses={warehouses}
              onSuccess={() => {
                setShowTransferForm(false);
                loadProducts();
              }}
              onCancel={() => setShowTransferForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
