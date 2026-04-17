import { useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../../store'
import { bankersRound } from '../../lib'

function itemColor(itemId: string): string {
  if (itemId === 'Salmon-Head') return '#f4a261';
  return '#79b8ff';
}

function typeColor(type: string): string {
  if (type === 'EMERGENCY') return '#ff7b7b';
  if (type === 'OVERDUE') return '#ffd877';
  return '#79b8ff'; // DAILY
}

interface TableRow {
  orderId: string;
  customerId: string;
  subOrderId: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  requestQty: number;
  type: string;
  createDate: string;
  allocated: number;
  remark?: string;
  locked?: boolean;
}

export function OrderTable() {
  const orders = useStore(state => state.orders);
  const warehouseStock = useStore(state => state.warehouseStock);
  const customers = useStore(state => state.customers);
  const priceTiers = useStore(state => state.priceTiers);
  const updateSubOrder = useStore(state => state.updateSubOrder);
  const toggleLock = useStore(state => state.toggleLock);
  const runAutoAllocation = useStore(state => state.runAutoAllocation);
  const commitAllocation = useStore(state => state.commitAllocation);
  const reAllocateUnlocked = () => runAutoAllocation((result) => commitAllocation(result));
  const filters = useStore(state => state.filters);

  // Effective remaining stock = totalCapacity - Σ all current allocated values per WH/SP/Item
  const effectiveRemainingStock = useMemo(() => {
    const map = new Map<string, number>();
    warehouseStock.forEach(s => map.set(`${s.warehouseId}-${s.supplierId}-${s.itemId}`, s.totalCapacity));
    orders.forEach(o => {
      o.subOrders.forEach(sub => {
        if (sub.allocated > 0 && sub.warehouseId && sub.warehouseId !== 'WH-000' && sub.supplierId && sub.supplierId !== 'SP-000') {
          const key = `${sub.warehouseId}-${sub.supplierId}-${sub.itemId}`;
          const cur = map.get(key);
          if (cur !== undefined) map.set(key, cur - sub.allocated);
        }
      });
    });
    return map;
  }, [warehouseStock, orders]);

  // Effective remaining credit = creditLimit - Σ all current allocation costs per customer
  const effectiveRemainingCredit = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => map.set(c.customerId, c.creditLimit));
    orders.forEach(o => {
      o.subOrders.forEach(sub => {
        if (sub.allocated > 0 && sub.supplierId && sub.supplierId !== 'SP-000') {
          const tier = priceTiers.find(t => t.itemId === sub.itemId && t.supplierId === sub.supplierId);
          const tierMultiplier = tier?.tiers.find(t => t.type === sub.type)?.tierMultiplier || 1;
          const unitPrice = tier ? bankersRound(tier.basePrice * tierMultiplier) : 100;
          const cost = bankersRound(sub.allocated * unitPrice);
          map.set(o.customerId, (map.get(o.customerId) ?? 0) - cost);
        }
      });
    });
    return map;
  }, [customers, orders, priceTiers]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(warehouseStock.map(s => s.warehouseId))).sort();
  }, [warehouseStock]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(warehouseStock.map(s => s.supplierId))).sort();
  }, [warehouseStock]);

  // Flatten logic
  const data = useMemo(() => {
    let flatData = orders.flatMap(order =>
      order.subOrders.map(sub => ({
        orderId: order.orderId,
        customerId: order.customerId,
        subOrderId: sub.subOrderId,
        itemId: sub.itemId,
        warehouseId: sub.warehouseId,
        supplierId: sub.supplierId,
        requestQty: sub.requestQty,
        type: sub.type,
        createDate: sub.createDate,
        allocated: sub.allocated,
        remark: sub.remark,
        locked: sub.locked
      }))
    );

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      flatData = flatData.filter(d =>
        (d.orderId && d.orderId.toLowerCase().includes(q)) ||
        (d.subOrderId && d.subOrderId.toLowerCase().includes(q)) ||
        (d.customerId && d.customerId.toLowerCase().includes(q))
      );
    }

    if (filters.typeFilter) flatData = flatData.filter(d => d.type === filters.typeFilter);
    if (filters.itemFilter) flatData = flatData.filter(d => d.itemId === filters.itemFilter);
    if (filters.warehouseFilter) flatData = flatData.filter(d => d.warehouseId === filters.warehouseFilter);
    if (filters.supplierFilter) flatData = flatData.filter(d => d.supplierId === filters.supplierFilter);

    if (filters.sortByType || filters.sortByFifo) {
      const TYPE_PRIORITY: Record<string, number> = { EMERGENCY: 0, OVERDUE: 1, DAILY: 2 };
      flatData = [...flatData].sort((a, b) => {
        if (filters.sortByType) {
          const pa = TYPE_PRIORITY[a.type] ?? 99;
          const pb = TYPE_PRIORITY[b.type] ?? 99;
          if (pa !== pb) return pa - pb;
        }
        if (filters.sortByFifo) {
          return new Date(a.createDate).getTime() - new Date(b.createDate).getTime();
        }
        return 0;
      });
    }

    return flatData;
  }, [orders, filters]);

  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    {
      accessorKey: 'orderId',
      header: 'Order ID',
      size: 100,
      cell: ({ getValue, row }) => {
        const color = typeColor(row.original.type);
        return <span className="font-bold select-none text-xs" style={{ color }}>{getValue<string>()}</span>;
      }
    },
    {
      accessorKey: 'subOrderId',
      header: 'Sub Order',
      size: 120,
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>
    },
    {
      accessorKey: 'itemId',
      header: 'Item',
      size: 70,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return <span className="text-xs font-bold text-accent" style={{ color: itemColor(v) }}>{v}</span>;
      }
    },
    {
      accessorKey: 'warehouseId',
      header: 'Warehouse',
      size: 100,
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const val = getValue<string>();
        return (
          <select
            value={val}
            onChange={(e) => { updateSubOrder(row.original.orderId, row.original.subOrderId, 'warehouseId', e.target.value); reAllocateUnlocked(); }}
            className="w-full bg-background border border-border rounded px-1 py-[2px] text-[11px] font-bold font-mono outline-none focus:border-accent cursor-pointer"
          >
            <option value="">ANY WH</option>
            {uniqueWarehouses.map(wh => (
              <option key={wh} value={wh}>{wh}</option>
            ))}
          </select>
        );
      }
    },
    {
      accessorKey: 'supplierId',
      header: 'Supplier',
      size: 100,
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const val = getValue<string>();
        return (
          <select
            value={val}
            onChange={(e) => { updateSubOrder(row.original.orderId, row.original.subOrderId, 'supplierId', e.target.value); reAllocateUnlocked(); }}
            className="w-full bg-background border border-border rounded px-1 py-[2px] text-[11px] font-bold font-mono outline-none focus:border-accent cursor-pointer"
          >
            <option value="">ANY SP</option>
            {uniqueSuppliers.map(sp => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>
        );
      }
    },
    {
      accessorKey: 'createDate',
      header: 'Req Date',
      size: 100,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        if (!v) return null;
        return <span className="text-muted text-xs whitespace-nowrap block w-full text-center">{new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>;
      }
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 100,
      cell: ({ getValue }) => {
        const t = getValue<string>();
        if (!t) return null;
        const bgClass = t === 'EMERGENCY' ? 'bg-emergency/15 border-emergency/30'
          : t === 'OVERDUE' ? 'bg-overdue/15 border-overdue/30'
            : 'bg-daily/10 border-daily/30';

        return <span className={`border px-[6px] py-[2px] rounded-full text-[9px] font-bold tracking-wider block w-full text-center ${bgClass}`} style={{ color: typeColor(t) }}>{t}</span>
      }
    },
    {
      accessorKey: 'customerId',
      header: 'Customer',
      size: 80,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? <span className="font-mono text-accent text-xs font-bold">{v}</span> : null;
      }
    },
    {
      accessorKey: 'requestQty',
      header: 'Req Qty',
      size: 70,
      cell: ({ getValue }) => {
        const v = getValue<number>();
        return v ? <span className="font-bold font-mono text-accent text-xs block w-full text-right">{v}</span> : null;
      }
    },
    {
      id: 'priceUnit',
      header: 'Price/Unit',
      size: 90,
      cell: ({ row }) => {
        const o = row.original;
        if (!o.supplierId || o.supplierId === 'SP-000') return <span className="text-muted block w-full text-right">-</span>;

        const tierConfig = priceTiers.find(t => t.itemId === o.itemId && t.supplierId === o.supplierId);
        if (!tierConfig) return <span className="text-muted block w-full text-right">-</span>;

        const tierMultiplier = tierConfig.tiers.find(t => t.type === o.type)?.tierMultiplier || 1;
        const unitPrice = bankersRound(tierConfig.basePrice * tierMultiplier);

        return <span className="font-mono text-xs block w-full text-right">{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      }
    },
    {
      accessorKey: 'allocated',
      header: 'Allocated',
      size: 110,
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const v = getValue<number>() || 0;
        const o = row.original;

        // Compute unit price for this row
        const tier = priceTiers.find(t => t.itemId === o.itemId && t.supplierId === o.supplierId);
        const tierMultiplier = tier?.tiers.find(t => t.type === o.type)?.tierMultiplier || 1;
        const unitPrice = (tier && o.supplierId && o.supplierId !== 'SP-000') ? bankersRound(tier.basePrice * tierMultiplier) : 0;

        // Max by stock (add back this row's own allocation to get headroom)
        let maxByStock = Infinity;
        if (o.warehouseId && o.warehouseId !== 'WH-000' && o.supplierId && o.supplierId !== 'SP-000') {
          const remaining = effectiveRemainingStock.get(`${o.warehouseId}-${o.supplierId}-${o.itemId}`);
          if (remaining !== undefined) maxByStock = remaining + v;
        }

        // Max by credit (add back this row's cost to get headroom)
        let maxByCredit = Infinity;
        if (unitPrice > 0) {
          const creditRemaining = effectiveRemainingCredit.get(o.customerId) ?? 0;
          const thisRowCost = bankersRound(v * unitPrice);
          maxByCredit = Math.floor((creditRemaining + thisRowCost) / unitPrice);
        }

        const maxAllowed = Math.min(maxByStock, maxByCredit, o.requestQty);
        const isOverQty = v > 0 && v > o.requestQty;
        const isOverStock = v > 0 && v > maxByStock;
        const isOverCredit = v > 0 && v > maxByCredit;
        const isInvalid = v > 0 && v > maxAllowed + 0.001;

        const errorMsg = isOverQty ? 'Over req qty' : isOverStock ? 'Over stock' : isOverCredit ? 'Over credit' : '';

        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <input
              type="number"
              value={v || ''}
              placeholder="0"
              min={0}
              step={1}
              onChange={(e) => {
                const newVal = Math.floor(parseFloat(e.target.value)) || 0;
                updateSubOrder(o.orderId, o.subOrderId, 'allocated', newVal);
              }}
              onBlur={() => reAllocateUnlocked()}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className={`w-full border rounded-[4px] py-[2px] text-center font-bold font-mono text-accent text-xs outline-none transition-colors shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                ${isInvalid ? 'bg-danger/10 border-danger focus:border-danger text-danger' : 'bg-background border-border focus:border-accent'}`}
            />
            {errorMsg && (
              <span className="absolute bottom-[-11px] right-0 text-center text-danger text-[9px] leading-none pointer-events-none">
                {errorMsg}
              </span>
            )}
          </div>
        )
      }
    },
    {
      id: 'totalPrice',
      header: 'Total',
      size: 100,
      cell: ({ row }) => {
        const o = row.original;
        if (!o.supplierId || o.supplierId === 'SP-000' || !o.allocated) return <span className="text-muted block w-full text-right">-</span>;

        const tierConfig = priceTiers.find(t => t.itemId === o.itemId && t.supplierId === o.supplierId);
        if (!tierConfig) return <span className="text-muted block w-full text-right">-</span>;

        const tierMultiplier = tierConfig.tiers.find(t => t.type === o.type)?.tierMultiplier || 1;
        const unitPrice = bankersRound(tierConfig.basePrice * tierMultiplier);
        const total = bankersRound(unitPrice * o.allocated);

        return <span className="font-mono text-accent font-bold text-xs block w-full text-right">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      }
    },
    {
      accessorKey: 'remark',
      header: 'Remark',
      size: 140,
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const v = getValue<string>() || '';
        return (
          <input
            type="text"
            value={v}
            placeholder=""
            onChange={(e) => updateSubOrder(row.original.orderId, row.original.subOrderId, 'remark', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="w-full bg-background border border-border rounded px-2 py-[2px] text-[11px] outline-none focus:border-accent transition-colors text-muted hover:text-text focus:text-text cursor-text shadow-inner"
          />
        )
      }
    },
    {
      id: 'locked',
      header: 'Lock',
      size: 52,
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full">
          <input
            type="checkbox"
            checked={!!row.original.locked}
            onChange={() => toggleLock(row.original.orderId, row.original.subOrderId)}
            className="w-3.5 h-3.5 cursor-pointer accent-accent"
          />
        </div>
      )
    }
  ], [uniqueWarehouses, uniqueSuppliers, updateSubOrder, toggleLock, runAutoAllocation, commitAllocation]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: false,
    autoResetPageIndex: false,
    initialState: {
      pagination: {
        pageSize: 12,
      }
    }
  });

  const { rows } = table.getRowModel();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
    : 0;

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div ref={tableContainerRef} className="flex-1 w-full overflow-auto custom-scrollbar relative">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-elevated z-10 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}
                    style={{ width: header.getSize() }}
                    className="py-3 px-4 text-center text-[10px] font-semibold text-muted uppercase tracking-[0.05em] border-b border-border whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} /></tr>}

            {virtualRows.map(virtualRow => {
              const row = rows[virtualRow.index];
              let borderClass = 'border-transparent';
              if (row.original.type === 'EMERGENCY') borderClass = 'border-emergency/60';
              else if (row.original.type === 'OVERDUE') borderClass = 'border-overdue/60';
              else borderClass = 'border-daily/60';

              return (
                <tr
                  key={row.id}
                  className={`border-b border-border transition-colors ${row.original.locked ? 'bg-elevated/60' : 'hover:bg-elevated/40'}`}
                  style={{ height: `${virtualRow.size}px` }}
                >
                  {row.getVisibleCells().map((cell, i) => {
                    return (
                      <td
                        key={cell.id}
                        className={`py-2 px-4 whitespace-nowrap align-middle ${cell.column.id === 'allocated' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'} ${i === 0 ? `border-l-[3px] ${borderClass}` : 'border-l-[3px] border-transparent'}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  }
                  )}
                </tr>
              )
            })}

            {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} /></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="h-12 border-t border-border bg-surface flex items-center justify-between px-4 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-muted">Rows per page:</span>
          <select
            className="bg-elevated border border-border rounded px-2 py-1 outline-none text-text focus:border-accent cursor-pointer"
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
          >
            {[12, 60, 120, 240, 480].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-muted">
          <span>Page <strong className="text-text">{table.getState().pagination.pageIndex + 1}</strong> of <strong className="text-text">{table.getPageCount() || 1}</strong></span>

          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded bg-elevated border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border/40 transition-colors cursor-pointer"
            >
              {'<<'}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded bg-elevated border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border/40 transition-colors cursor-pointer"
            >
              {'<'} Prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded bg-elevated border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border/40 transition-colors cursor-pointer"
            >
              Next {'>'}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded bg-elevated border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-border/40 transition-colors cursor-pointer"
            >
              {'>>'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
