import { useState } from 'react'
import { useStore } from '../../store'

export function LeftSidebar() {
  const [open, setOpen] = useState(false);
  const stock = useStore(state => state.warehouseStock);

  const whMap = stock.reduce((acc, curr) => {
    if (!acc[curr.warehouseId]) acc[curr.warehouseId] = [];
    acc[curr.warehouseId].push(curr);
    return acc;
  }, {} as Record<string, typeof stock>);

  if (!open) {
    return (
      <aside className="w-8 border-r border-border bg-surface flex-shrink-0 flex flex-col items-center pt-3">
        <button
          onClick={() => setOpen(true)}
          title="Warehouse Stock"
          className="flex flex-col items-center gap-1 text-muted hover:text-text transition-colors cursor-pointer p-1 rounded"
        >
          <span className="text-[10px]">›</span>
          <span className="text-[9px] uppercase tracking-widest font-semibold writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            Stock
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] border-r border-border bg-surface flex-shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
        <h2 className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted">
          Warehouse Stock
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-text transition-colors cursor-pointer text-xs px-1"
          title="Collapse"
        >
          ‹
        </button>
      </div>

      {stock.length === 0 ? (
        <div className="p-4 animate-pulse flex flex-col gap-4">
          <div className="h-32 bg-elevated rounded w-full"></div>
          <div className="h-32 bg-elevated rounded w-full"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            {Object.entries(whMap).map(([whId, items]) => {
              const totalWHStock = items.reduce((sum, i) => sum + i.stock, 0);
              return (
                <div key={whId} className="bg-elevated border border-border rounded-[8px] p-3 shadow-sm hover:border-accent/40 transition-colors duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-text">{whId}</span>
                    <span className="text-[11px] text-muted font-mono">{totalWHStock.toLocaleString()} KG</span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {items.map(item => {
                      const percentRemaining = item.totalCapacity === 0 ? 0 : (item.stock / item.totalCapacity);
                      const fillClass = percentRemaining > 0.5 ? 'bg-success' : (percentRemaining > 0.2 ? 'bg-warning' : 'bg-danger');
                      return (
                        <div key={item.id} className="text-[10px] space-y-1 pt-2 border-t border-border">
                          <div className="flex justify-between">
                            <span className="text-muted">{item.supplierId} / {item.itemId.replace('Salmon-', '')}</span>
                            <span className="font-mono text-text">{item.stock.toLocaleString()} / {item.totalCapacity.toLocaleString()} KG</span>
                          </div>
                          <div className="h-[3px] bg-background rounded-full overflow-hidden mt-[2px] shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-700 ease-in-out ${fillClass}`} style={{ width: `${Math.max(Math.min(percentRemaining * 100, 100), 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
