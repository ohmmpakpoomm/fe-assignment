import { useState } from 'react'
import { useStore } from '../../store'

export function RightSidebar() {
  const [open, setOpen] = useState(false);
  const customers = useStore(state => state.customers);

  if (!open) {
    return (
      <aside className="w-8 border-l border-border bg-surface flex-shrink-0 flex flex-col items-center pt-3">
        <button
          onClick={() => setOpen(true)}
          title="Credit Usage"
          className="flex flex-col items-center gap-1 text-muted hover:text-text transition-colors cursor-pointer p-1 rounded"
        >
          <span className="text-[10px]">‹</span>
          <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
            Credit
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] border-l border-border bg-surface flex-shrink-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-text transition-colors cursor-pointer text-xs px-1"
          title="Collapse"
        >
          ›
        </button>
        <h2 className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted">
          Credit Usage
        </h2>
      </div>

      {customers.length === 0 ? (
        <div className="p-4 animate-pulse flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-elevated rounded w-full"></div>)}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-3">
            {customers.map(customer => {
              const percentUsed = customer.creditLimit === 0 ? 0 : (customer.usedCredit / customer.creditLimit);
              const fillClass = percentUsed < 0.5 ? 'bg-success' : (percentUsed < 0.8 ? 'bg-warning' : 'bg-danger');
              const isWarning = percentUsed > 0.8;
              return (
                <div key={customer.customerId} className={`bg-elevated border border-border rounded-[8px] p-3 shadow-sm transition-all duration-300 hover:-translate-y-[1px] ${isWarning ? 'border-danger/30 hover:border-danger/60' : 'hover:border-accent/40'}`}>
                  <div className="flex justify-between items-center mb-[2px]">
                    <span className="text-[11px] font-mono font-semibold text-accent">{customer.customerId}</span>
                    <span className="text-[10px] text-muted font-mono">{(percentUsed * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-end text-[10px] mb-2 leading-none">
                    <span className="font-mono text-text">{Math.floor(customer.usedCredit).toLocaleString()} / {Math.floor(customer.creditLimit).toLocaleString()} THB</span>
                  </div>
                  <div className="h-[4px] bg-background rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`} style={{ width: `${Math.max(Math.min(percentUsed * 100, 100), 2)}%` }} />
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
