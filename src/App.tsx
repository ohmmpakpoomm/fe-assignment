import { useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useStore } from './store'
import mockData from './data/mockData.json'
import { Header } from './components/layout/Header'
import { LeftSidebar } from './components/layout/LeftSidebar'
import { RightSidebar } from './components/layout/RightSidebar'
import { FilterRow } from './components/layout/FilterRow'
import { OrderTable } from './components/orders/OrderTable'

function App() {
  const handleAutoAllocate = () => {
    useStore.getState().runAutoAllocation(
      (result) => { useStore.getState().commitAllocation(result); toast.success('Re-allocation complete'); },
      () => toast.error('Re-allocation failed')
    );
  };

  useEffect(() => {
    const store = useStore.getState();
    store.setCustomers(mockData.customers as any);
    store.setWarehouseStock(mockData.warehouseStock as any);
    store.setPriceTiers(mockData.priceTiers as any);
    store.setOrders(mockData.orders as any);

    const timer = setTimeout(() => {
      useStore.getState().runAutoAllocation(
        (result) => { useStore.getState().commitAllocation(result); toast.success('Auto allocation complete'); },
        () => toast.error('Auto allocation failed')
      );
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-hidden flex flex-col p-4 min-w-0">
          <div className="flex w-full items-center mb-4 gap-2">
            <h2 className="text-sm font-bold text-text mr-auto">Order Allocation Dashboard</h2>
            <button
              onClick={handleAutoAllocate}
              className="bg-accent text-[#000] font-medium px-4 py-2 rounded-[6px] border border-accent hover:brightness-110 transition-all text-xs font-semibold shadow-sm cursor-pointer">
              Re-Allocation
            </button>
          </div>

          <FilterRow />

          <div className="flex-1 bg-surface border border-border rounded-[8px] overflow-hidden shadow-sm flex flex-col min-h-0 relative">
            <OrderTable />
          </div>
        </main>

        <RightSidebar />
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar
        theme="dark"
        toastClassName="!bg-elevated !text-text !border !border-border !rounded-[8px] !shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      />
    </div>
  )
}

export default App
