import { useMemo } from 'react'
import { useStore } from '../../store'

export function FilterRow() {
  const filters = useStore(state => state.filters);
  const setFilters = useStore(state => state.setFilters);
  const clearFilters = useStore(state => state.clearFilters);
  const warehouseStock = useStore(state => state.warehouseStock);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(warehouseStock.map(s => s.warehouseId))).sort();
  }, [warehouseStock]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(warehouseStock.map(s => s.supplierId))).sort();
  }, [warehouseStock]);

  const uniqueItems = useMemo(() => {
    return Array.from(new Set(warehouseStock.map(s => s.itemId))).sort();
  }, [warehouseStock]);

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap bg-elevated border border-border p-2 rounded-[8px] shadow-sm">
      <FilterSelect
        label="Order Type"
        value={filters.typeFilter}
        options={['EMERGENCY', 'OVERDUE', 'DAILY']}
        onChange={v => setFilters({ typeFilter: v })}
      />
      <FilterSelect
        label="Item"
        value={filters.itemFilter}
        options={uniqueItems}
        onChange={v => setFilters({ itemFilter: v })}
      />
      <FilterSelect
        label="Warehouse"
        value={filters.warehouseFilter}
        options={uniqueWarehouses}
        onChange={v => setFilters({ warehouseFilter: v })}
      />
      <FilterSelect
        label="Supplier"
        value={filters.supplierFilter}
        options={uniqueSuppliers}
        onChange={v => setFilters({ supplierFilter: v })}
      />
      <div className="bg-surface border border-border rounded-[6px] flex items-center px-3 py-1.5 ml-2 shadow-inner focus-within:border-accent/60 transition-colors hover:border-muted">
        <span className="opacity-50 text-xs">🔍</span>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={e => setFilters({ searchQuery: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="Search Order, Sub Order, Customer"
          className="bg-transparent border-none outline-none text-xs text-text ml-2 w-[240px] placeholder-muted/70"
        />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <SortToggle
          label="Sort by Type"
          checked={filters.sortByType}
          onChange={v => setFilters({ sortByType: v })}
        />
        <SortToggle
          label="FIFO"
          checked={filters.sortByFifo}
          onChange={v => setFilters({ sortByFifo: v })}
        />
        <button onClick={clearFilters} className="text-xs text-muted hover:text-danger hover:underline transition-colors px-2 cursor-pointer">
          Clear Filters
        </button>
      </div>
    </div>
  )
}

function SortToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <div className={`absolute top-[2px] w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </div>
      <span className={`transition-colors ${checked ? 'text-text' : 'text-muted'}`}>{label}</span>
    </label>
  )
}

function FilterSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted text-xs">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-surface border border-border rounded-[6px] px-2 py-1 text-xs text-accent font-semibold outline-none cursor-pointer hover:border-muted transition-colors"
      >
        <option value="">All</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
