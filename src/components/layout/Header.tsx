import { useStore } from '../../store'

export function Header() {
  const stock = useStore(state => state.warehouseStock);
  const orders = useStore(state => state.orders);
  const totalCapacity = stock.reduce((sum, s) => sum + s.totalCapacity, 0);
  const currentStock = stock.reduce((sum, s) => sum + s.stock, 0);
  const allocated = totalCapacity - currentStock;
  const totalRequested = orders.reduce((sum, o) => sum + o.subOrders.reduce((s, so) => s + so.requestQty, 0), 0);
  const totalAllocated = orders.reduce((sum, o) => sum + o.subOrders.reduce((s, so) => s + so.allocated, 0), 0);
  const percentOrderFilled = totalRequested > 0 ? (totalAllocated / totalRequested) * 100 : 0;

  return (
    <header className="h-[60px] border-b border-border bg-surface/90 backdrop-blur-md flex items-center px-6 sticky top-0 z-50 shadow-sm">
      <h1 className="font-bold text-[1.1rem] flex items-center gap-[10px] text-text whitespace-nowrap">
        <span className="text-accent text-[1.4rem]">🐟</span>
        <span>Salmon Allocation</span>
      </h1>

      <div className="ml-auto w-full max-w-[600px] flex justify-end gap-[14px]">
        <StatCard label="Total Supply" value={totalCapacity.toLocaleString()} />
        <StatCard label="Allocated" value={allocated.toLocaleString()} accentClass="text-accent" />
        <StatCard label="Remaining" value={currentStock.toLocaleString()} />
        <StatCard
          label="% Order Filled"
          value={`${percentOrderFilled.toFixed(1)}%`}
          accentClass={percentOrderFilled >= 80 ? 'text-success' : 'text-warning'}
        />
      </div>
    </header>
  )
}

function StatCard({ label, value, accentClass = "text-text" }: { label: string, value: string | number, accentClass?: string }) {
  return (
    <div className="bg-elevated border border-border rounded-[6px] px-3 py-1.5 flex flex-col justify-center min-w-[95px] shadow-sm transition-colors hover:bg-border/30">
      <span className="text-[10px] text-muted uppercase tracking-wide leading-none mb-1">{label}</span>
      <span className={`text-[15px] font-semibold font-mono leading-none ${accentClass}`}>{value}</span>
    </div>
  )
}
