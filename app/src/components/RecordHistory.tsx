import { useState, useEffect } from 'react';
import { db, type StockRecord } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Package, ArrowRightLeft } from 'lucide-react';

interface RecordHistoryProps {
  productId?: number;
  limit?: number;
}

interface RecordWithDetails extends StockRecord {
  productName?: string;
  productSpec?: string;
  warehouseName?: string;
  targetWarehouseName?: string;
}

export function RecordHistory({ productId, limit }: RecordHistoryProps) {
  const [records, setRecords] = useState<RecordWithDetails[]>([]);

  useEffect(() => {
    loadRecords();
  }, [productId]);

  async function loadRecords() {
    let query = db.records.orderBy('createdAt').reverse();
    if (productId) {
      query = query.filter((r) => r.productId === productId);
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

    setRecords(limit ? recordsWithDetails.slice(0, limit) : recordsWithDetails);
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>暂无记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <Card key={record.id} className="overflow-hidden">
          <CardContent className="p-3">
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
                    variant="default"
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
                    <span>
                      {record.warehouseName} → {record.targetWarehouseName}
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
      ))}
    </div>
  );
}
