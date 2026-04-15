import { useState, useRef, useEffect } from 'react';
import { db, type Warehouse } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddProductProps {
  categories: { id?: number; name: string }[];
  warehouses: Warehouse[];
  defaultWarehouseId: number | null;
  onSuccess: () => void;
}

export function AddProduct({ categories, warehouses, defaultWarehouseId, onSuccess }: AddProductProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId?.toString() || '');
  const [currentStock, setCurrentStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当默认仓库变化时更新
  useEffect(() => {
    if (defaultWarehouseId && !warehouseId) {
      setWarehouseId(defaultWarehouseId.toString());
    }
  }, [defaultWarehouseId]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !categoryId || !warehouseId) return;

    setLoading(true);
    try {
      // 创建产品
      const productId = await db.products.add({
        name,
        spec,
        photo: photo || undefined,
        categoryId: parseInt(categoryId),
        minStock: parseInt(minStock) || 5,
        createdAt: new Date(),
      });

      // 添加库存到指定仓库
      const stock = parseInt(currentStock) || 0;
      if (stock > 0) {
        await db.warehouseStocks.add({
          productId: productId as number,
          warehouseId: parseInt(warehouseId),
          quantity: stock,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 添加进货记录
        await db.records.add({
          productId: productId as number,
          warehouseId: parseInt(warehouseId),
          type: 'in',
          quantity: stock,
          note: '初始库存',
          createdAt: new Date(),
        });
      }

      // 重置表单
      setName('');
      setSpec('');
      setCategoryId('');
      setWarehouseId(defaultWarehouseId?.toString() || '');
      setCurrentStock('');
      setMinStock('5');
      setPhoto(null);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 w-14 h-14 rounded-full shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加新产品</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 照片 */}
          <div>
            <Label>产品照片</Label>
            <div className="mt-2">
              {photo ? (
                <div className="relative w-32 h-32">
                  <img
                    src={photo}
                    alt="产品照片"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                >
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-sm">拍照/选择</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 名称 */}
          <div>
            <Label htmlFor="name">
              产品名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：iPhone 15 Pro"
              required
            />
          </div>

          {/* 规格 */}
          <div>
            <Label htmlFor="spec">规格型号</Label>
            <Input
              id="spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="例如：256GB 黑色"
            />
          </div>

          {/* 分类 */}
          <div>
            <Label htmlFor="category">
              分类 <span className="text-red-500">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id!.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 仓库 */}
          <div>
            <Label htmlFor="warehouse">
              存放仓库 <span className="text-red-500">*</span>
            </Label>
            <Select value={warehouseId} onValueChange={setWarehouseId} required>
              <SelectTrigger>
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

          {/* 当前库存 */}
          <div>
            <Label htmlFor="stock">当前库存数量</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* 预警阈值 */}
          <div>
            <Label htmlFor="minStock">库存预警阈值</Label>
            <Input
              id="minStock"
              type="number"
              min="1"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-gray-500 mt-1">
              当库存低于此数值时会提醒您补货
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={loading || !name || !categoryId || !warehouseId}
            >
              {loading ? '添加中...' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
