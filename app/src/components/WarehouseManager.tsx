import { useState } from 'react';
import { db, type Warehouse } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Warehouse as WarehouseIcon, Plus, Trash2, Edit2, X, Check, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface WarehouseManagerProps {
  warehouses: Warehouse[];
  onUpdate: () => void;
}

export function WarehouseManager({ warehouses, onUpdate }: WarehouseManagerProps) {
  const [open, setOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', note: '', isDefault: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<Partial<Warehouse>>({});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newWarehouse.name.trim()) return;

    try {
      // 如果设置为默认，先取消其他默认仓库
      if (newWarehouse.isDefault) {
        const defaultWarehouses = await db.warehouses.where('isDefault').equals(1).toArray();
        for (const w of defaultWarehouses) {
          await db.warehouses.update(w.id!, { isDefault: false });
        }
      }

      await db.warehouses.add({
        ...newWarehouse,
        name: newWarehouse.name.trim(),
        createdAt: new Date(),
      });

      setNewWarehouse({ name: '', address: '', note: '', isDefault: false });
      onUpdate();
    } catch (error) {
      console.error('添加仓库失败:', error);
      alert('添加失败，请重试');
    }
  }

  async function handleDelete(id: number) {
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse?.isDefault) {
      alert('默认仓库不能删除，请先设置其他仓库为默认');
      return;
    }

    if (confirm('确定要删除这个仓库吗？该仓库的所有库存数据也会被删除。')) {
      await db.warehouses.delete(id);
      // 删除相关库存记录
      await db.warehouseStocks.where('warehouseId').equals(id).delete();
      onUpdate();
    }
  }

  async function handleSetDefault(id: number) {
    const defaultWarehouses = await db.warehouses.where('isDefault').equals(1).toArray();
    for (const w of defaultWarehouses) {
      await db.warehouses.update(w.id!, { isDefault: false });
    }
    await db.warehouses.update(id, { isDefault: true });
    onUpdate();
  }

  async function handleEditSave(id: number) {
    if (!editingWarehouse.name?.trim()) return;
    
    // 如果设置为默认，先取消其他默认仓库
    if (editingWarehouse.isDefault) {
      const defaultWarehouses = await db.warehouses.where('isDefault').equals(1).toArray();
      for (const w of defaultWarehouses) {
        if (w.id !== id) {
          await db.warehouses.update(w.id!, { isDefault: false });
        }
      }
    }

    await db.warehouses.update(id, {
      name: editingWarehouse.name.trim(),
      address: editingWarehouse.address,
      note: editingWarehouse.note,
      isDefault: editingWarehouse.isDefault,
    });
    setEditingId(null);
    onUpdate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <WarehouseIcon className="w-4 h-4 mr-1" />
          仓库管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理仓库</DialogTitle>
        </DialogHeader>
        
        {/* 添加新仓库 */}
        <form onSubmit={handleAdd} className="space-y-3 mb-4">
          <div>
            <Label htmlFor="wh-name">仓库名称 <span className="text-red-500">*</span></Label>
            <Input
              id="wh-name"
              value={newWarehouse.name}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              placeholder="例如：主仓库"
            />
          </div>
          <div>
            <Label htmlFor="wh-address">地址</Label>
            <Input
              id="wh-address"
              value={newWarehouse.address}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
              placeholder="仓库地址（可选）"
            />
          </div>
          <div>
            <Label htmlFor="wh-note">备注</Label>
            <Textarea
              id="wh-note"
              value={newWarehouse.note}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, note: e.target.value })}
              placeholder="备注信息（可选）"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newWarehouse.isDefault}
              onCheckedChange={(checked) => setNewWarehouse({ ...newWarehouse, isDefault: checked })}
            />
            <Label className="cursor-pointer">设为默认仓库</Label>
          </div>
          <Button type="submit" className="w-full" disabled={!newWarehouse.name.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            添加仓库
          </Button>
        </form>

        {/* 仓库列表 */}
        <div className="space-y-2">
          <Label>现有仓库</Label>
          {warehouses.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <WarehouseIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无仓库</p>
            </div>
          ) : (
            warehouses.map((wh) => (
              <div
                key={wh.id}
                className="p-3 bg-gray-50 rounded-lg"
              >
                {editingId === wh.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingWarehouse.name}
                      onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                      placeholder="仓库名称"
                      autoFocus
                    />
                    <Input
                      value={editingWarehouse.address || ''}
                      onChange={(e) => setEditingWarehouse({ ...editingWarehouse, address: e.target.value })}
                      placeholder="地址"
                    />
                    <Textarea
                      value={editingWarehouse.note || ''}
                      onChange={(e) => setEditingWarehouse({ ...editingWarehouse, note: e.target.value })}
                      placeholder="备注"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingWarehouse.isDefault}
                        onCheckedChange={(checked) => setEditingWarehouse({ ...editingWarehouse, isDefault: checked })}
                      />
                      <Label className="cursor-pointer text-sm">设为默认仓库</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditSave(wh.id!)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{wh.name}</span>
                        {wh.isDefault && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            默认
                          </span>
                        )}
                      </div>
                      {wh.address && (
                        <p className="text-sm text-gray-500 truncate">{wh.address}</p>
                      )}
                      {wh.note && (
                        <p className="text-xs text-gray-400 mt-1">{wh.note}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {!wh.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetDefault(wh.id!)}
                          title="设为默认"
                        >
                          <Star className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(wh.id!);
                          setEditingWarehouse({ ...wh });
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(wh.id!)}
                        disabled={wh.isDefault}
                      >
                        <Trash2 className={`w-4 h-4 ${wh.isDefault ? 'text-gray-300' : 'text-red-500'}`} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
