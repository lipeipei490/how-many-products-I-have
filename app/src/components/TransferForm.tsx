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

interface TransferFormProps {
  product: ProductWithDetails;
  fromWarehouseId: number;
  warehouses: Warehouse[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransferForm({ product, fromWarehouseId, warehouses, onSuccess, onCancel }: TransferFormProps) {
  const [quantity, setQuantity] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const fromWarehouse = warehouses.find(w => w.id === fromWarehouseId);
  const fromStock = product.stocks.find(s => s.warehouseId === fromWarehouseId)?.quantity || 0;
  
  // 可选的目标仓库（排除源仓库）
  const availableWarehouses = warehouses.filter(w => w.id !== fromWarehouseId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0 || !targetWarehouseId) return;
    if (qty > fromStock) {
      alert('调拨数量不能超过当前库存');
      return;
    }

    setLoading(true);
    try {
      const targetId = parseInt(targetWarehouseId);
      
      // 添加调拨记录
      await db.records.add({
        productId: product.id!,
        warehouseId: fromWarehouseId,
        type: 'transfer',
        quantity: qty,
        targetWarehouseId: targetId,
        note: note || undefined,
        createdAt: new Date(),
      });

      // 减少源仓库库存
      const fromStockRecord = await db.warehouseStocks
        .where({ productId: product.id, warehouseId: fromWarehouseId })
        .first();
      
      if (fromStockRecord) {
        await db.warehouseStocks.update(fromStockRecord.id!, {
          quantity: fromStockRecord.quantity - qty,
          updatedAt: new Date(),
        });
      }

      // 增加目标仓库库存
      const targetStockRecord = await db.warehouseStocks
        .where({ productId: product.id, warehouseId: targetId })
        .first();
      
      if (targetStockRecord) {
        await db.warehouseStocks.update(targetStockRecord.id!, {
          quantity: targetStockRecord.quantity + qty,
          updatedAt: new Date(),
        });
      } else {
        await db.warehouseStocks.add({
          productId: product.id!,
          warehouseId: targetId,
          quantity: qty,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      onSuccess();
    } catch (error) {
      console.error('调拨失败:', error);
      alert('调拨失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 源仓库 */}
      <div>
        <Label className="text-gray-500">源仓库</Label>
        <div className="flex items-center gap-2 mt-1 p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">{fromWarehouse?.name}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">库存: {fromStock}</span>
        </div>
      </div>

      {/* 目标仓库 */}
      <div>
        <Label htmlFor="targetWarehouse">
          目标仓库 <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={targetWarehouseId} 
          onValueChange={setTargetWarehouseId}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="选择目标仓库" />
          </SelectTrigger>
          <SelectContent>
            {availableWarehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id!.toString()}>
                {wh.name} {wh.isDefault && '(默认)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 调拨数量 */}
      <div>
        <Label htmlFor="quantity">
          调拨数量 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          max={fromStock}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="请输入数量"
          required
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          最多可调拨 {fromStock} 件
        </p>
      </div>

      {/* 备注 */}
      <div>
        <Label htmlFor="note">备注（可选）</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例如：调拨原因等"
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
          className="flex-1 bg-purple-600 hover:bg-purple-700"
          disabled={
            loading || 
            !quantity || 
            parseInt(quantity) <= 0 || 
            parseInt(quantity) > fromStock ||
            !targetWarehouseId
          }
        >
          {loading ? '处理中...' : '确认调拨'}
        </Button>
      </div>
    </form>
  );
}
