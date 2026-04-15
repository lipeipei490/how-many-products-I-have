import { useState } from 'react';
import { db, type Warehouse } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductWithDetails {
  id?: number;
  name: string;
  spec: string;
  photo?: string;
  categoryId: number;
  minStock: number;
  createdAt: Date;
  stocks: { warehouseId: number; warehouseName: string; quantity: number }[];
  totalStock: number;
  currentWarehouseStock: number;
}

interface StockFormProps {
  product: ProductWithDetails;
  warehouseId: number;
  warehouses: Warehouse[];
  type: 'in' | 'out';
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockForm({ product, warehouseId, warehouses, type, onSuccess, onCancel }: StockFormProps) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouseId.toString());
  const [loading, setLoading] = useState(false);


  const currentStock = product.stocks.find(s => s.warehouseId === parseInt(selectedWarehouseId))?.quantity || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;

    setLoading(true);
    try {
      const whId = parseInt(selectedWarehouseId);
      
      // 添加记录
      await db.records.add({
        productId: product.id!,
        warehouseId: whId,
        type,
        quantity: qty,
        note: note || undefined,
        createdAt: new Date(),
      });

      // 更新库存
      const existingStock = await db.warehouseStocks
        .where({ productId: product.id, warehouseId: whId })
        .first();

      if (existingStock) {
        const newQuantity = type === 'in' 
          ? existingStock.quantity + qty 
          : existingStock.quantity - qty;
        
        await db.warehouseStocks.update(existingStock.id!, { 
          quantity: newQuantity,
          updatedAt: new Date(),
        });
      } else if (type === 'in') {
        await db.warehouseStocks.add({
          productId: product.id!,
          warehouseId: whId,
          quantity: qty,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      onSuccess();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 仓库选择 */}
      <div>
        <Label htmlFor="warehouse">
          {type === 'in' ? '进货' : '销售'}仓库
        </Label>
        <Select 
          value={selectedWarehouseId} 
          onValueChange={setSelectedWarehouseId}
        >
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

      <div>
        <Label className="text-gray-500">当前库存</Label>
        <div className="text-2xl font-bold text-gray-900">{currentStock}</div>
      </div>

      <div>
        <Label htmlFor="quantity">
          {type === 'in' ? '进货' : '销售'}数量 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          max={type === 'out' ? currentStock : undefined}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="请输入数量"
          required
          autoFocus
        />
        {type === 'out' && currentStock > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            最多可销售 {currentStock} 件
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="note">备注（可选）</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === 'in' ? '例如：供应商、批次等' : '例如：客户、订单号等'}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          type="submit"
          className={`flex-1 ${
            type === 'in' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={loading || !quantity || parseInt(quantity) <= 0 || (type === 'out' && parseInt(quantity) > currentStock)}
        >
          {loading ? '处理中...' : '确认'}
        </Button>
      </div>
    </form>
  );
}
