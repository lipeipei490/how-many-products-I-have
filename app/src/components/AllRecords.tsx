import { useState, useEffect } from 'react';
import { db, type StockRecord, type Warehouse } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Package, Filter, ArrowRightLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AllRecordsProps {
  warehouseId: number | null;
  warehouses: Warehouse[];
}

interface RecordWithDetails extends StockRecord {
  productName?: string;
  productSpec?: string;
  warehouseName?: string;
  targetWarehouseName?: string;
}

export function AllRecords({ warehouseId, warehouses }: AllRecordsProps) {
  const [records, setRecords] = useState<RecordWithDetails[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<string>(warehouseId?.toString() || 'all');

  useEffect(() => {
    loadRecords();
  }, [warehouseId, filterType, filterWarehouse]);

  async function loadRecords() {
    let query = db.records.orderBy('createdAt').reverse();
    
    // 类型筛选
    if (filterType !== 'all') {
      query = query.filter((r) => r.type === filterType);
    }
    
    const allRecords = await query.toArray();
    
    // 获取详细信息
    const recordsWithDetails = await Promise.all(
      allRecords.map(async (r) => {
        const product = await db.products.get(r.productId);
        const warehouse = await db.warehouses.get(r.warehouseId);
        const targetWarehouse = r.targetWarehouseId 
          ? await db.warehouses.get(r.targetWarehouseId)
          : null;
        
        return {
          ...r,
          productName: product?.name,
          productSpec: product?.spec,
          warehouseName: warehouse?.name,
          targetWarehouseName: targetWarehouse?.name,
        };
      })
    );

    // 仓库筛选
    let filteredRecords = recordsWithDetails;
    if (filterWarehouse !== 'all') {
      const whId = parseInt(filterWarehouse);
      filteredRecords = recordsWithDetails.filter(
        r => r.warehouseId === whId || r.targetWarehouseId === whId
      );
    }

    setRecords(filteredRecords);
  }

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="in">进货</SelectItem>
            <SelectItem value="out">销售</SelectItem>
            <SelectItem value="transfer">调拨</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
          <SelectTrigger className="flex-1">
            <span className="truncate">仓库</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部仓库</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id!.toString()}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 记录列表 */}
      <div className="space-y-3">
        {records.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无记录</p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    record.type === 'in' 
                      ? 'bg-green-100 text-green-600' 
                      : record.type === 'out'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {record.type === 'in' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : record.type === 'out' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{record.productName}</div>
                      <Badge 
                        className={
                          record.type === 'in' 
                            ? 'bg-green-600' 
                            : record.type === 'out'
                            ? 'bg-blue-600'
                            : 'bg-purple-600'
                        }
                      >
                        {record.type === 'in' ? '进货' : record.type === 'out' ? '销售' : '调拨'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">{record.productSpec}</div>
                    
                    {/* 仓库信息 */}
                    <div className="text-sm text-gray-600 mt-1">
                      {record.type === 'transfer' ? (
                        <span className="flex items-center gap-1">
                          {record.warehouseName} 
                          <span className="text-gray-400">→</span> 
                          {record.targetWarehouseName}
                        </span>
                      ) : (
                        <span>{record.warehouseName}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="text-lg font-bold">
                        {record.type === 'out' ? '-' : '+'}{record.quantity}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    {record.note && (
                      <div className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                        备注：{record.note}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
