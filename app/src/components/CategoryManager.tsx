import { useState } from 'react';
import { db, type Category } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Folder, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onUpdate: () => void;
}

export function CategoryManager({ categories, onUpdate }: CategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await db.categories.add({
        name: newCategoryName.trim(),
        createdAt: new Date(),
      });
      setNewCategoryName('');
      onUpdate();
    } catch (error) {
      console.error('添加分类失败:', error);
      alert('添加失败，可能分类名称已存在');
    }
  }

  async function handleDelete(id: number) {
    // 检查是否有产品使用此分类
    const productsInCategory = await db.products.where('categoryId').equals(id).count();
    if (productsInCategory > 0) {
      alert(`该分类下有 ${productsInCategory} 个产品，无法删除。请先删除或移动这些产品。`);
      return;
    }

    if (confirm('确定要删除这个分类吗？')) {
      await db.categories.delete(id);
      onUpdate();
    }
  }

  async function handleEditSave(id: number) {
    if (!editingName.trim()) return;
    await db.categories.update(id, { name: editingName.trim() });
    setEditingId(null);
    onUpdate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Folder className="w-4 h-4 mr-1" />
          分类管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理分类</DialogTitle>
        </DialogHeader>
        
        {/* 添加新分类 */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="输入新分类名称"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newCategoryName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        {/* 分类列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无分类</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 mr-2"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSave(cat.id!)}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex-1">{cat.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(cat.id!);
                          setEditingName(cat.name);
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(cat.id!)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
