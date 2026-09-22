import React, { useState } from 'react';
import {
  Package, ShoppingCart, AlertTriangle, Activity, Zap, RefreshCw,
  Wifi, WifiOff, Server, Cpu, Box
} from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { connected, inventory, orders, dlq } = useWebSocket();
  const [itemName, setItemName] = useState('Laptop');
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [surging, setSurging] = useState(false);

  const placeOrder = async () => {
    setPlacing(true);
    try {
      await fetch('http://localhost:8080/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, quantity: Number(quantity) }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPlacing(false);
    }
  };

  const simulateSurge = async () => {
    setSurging(true);
    try {
      await fetch(
        `http://localhost:8080/api/orders/simulate-surge?itemName=${encodeURIComponent(itemName)}&quantity=${quantity}&concurrentOrders=50`,
        { method: 'POST' }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSurging(false), 2000);
    }
  };

  const resetInventory = async () => {
    try {
      await fetch('http://localhost:8080/api/inventory/reset', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const statusColor = (status) => {
    if (status === 'COMPLETED') return 'text-cyber-green';
    if (status === 'FAILED_DLQ') return 'text-cyber-red';
    return 'text-cyber-yellow';
  };

  const statusBg = (status) => {
    if (status === 'COMPLETED') return 'bg-cyber-green/10 border-cyber-green/30';
    if (status === 'FAILED_DLQ') return 'bg-cyber-red/10 border-cyber-red/30';
    return 'bg-cyber-yellow/10 border-cyber-yellow/30';
  };

  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const failedCount = orders.filter((o) => o.status === 'FAILED_DLQ').length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-cyber-900 text-slate-200">
      {/* Header */}
      <header className="border-b border-cyber-600/50 bg-cyber-800/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-accent/10 border border-cyber-accent/30">
              <Server className="w-6 h-6 text-cyber-accent" />
            </div>
            <div>
              <h1 className="font-orbitron text-lg font-bold tracking-wider text-white">
                OPS<span className="text-cyber-accent">CENTER</span>
              </h1>
              <p className="text-xs text-slate-400">Real-Time Order Processing System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              connected
                ? 'bg-cyber-green/10 border-cyber-green/40 text-cyber-green'
                : 'bg-cyber-red/10 border-cyber-red/40 text-cyber-red'
            }`}>
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {connected ? 'LIVE' : 'OFFLINE'}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>Thread Pool · Pessimistic Lock · DLQ</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Package className="w-5 h-5" />} label="Inventory SKUs" value={inventory.length} color="accent" />
          <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Completed" value={completedCount} color="green" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Failed / DLQ" value={failedCount + dlq.length} color="red" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Pending" value={pendingCount} color="yellow" />
        </div>

        {/* Controls + Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Panel title="Place Order" icon={<ShoppingCart className="w-4 h-4 text-cyber-accent" />}>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Item</label>
                  <select
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-cyber-900 border border-cyber-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyber-accent"
                  >
                    {inventory.length > 0
                      ? inventory.map((i) => (
                          <option key={i.id} value={i.itemName}>
                            {i.itemName} (stock: {i.stockQuantity})
                          </option>
                        ))
                      : ['Laptop', 'Phone', 'Headphones', 'Tablet'].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-cyber-900 border border-cyber-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyber-accent"
                  />
                </div>
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full py-2.5 rounded-lg bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent font-medium text-sm hover:bg-cyber-accent/30 transition disabled:opacity-50"
                >
                  {placing ? 'Placing…' : 'Place Single Order'}
                </button>
                <button
                  onClick={simulateSurge}
                  disabled={surging}
                  className="w-full py-2.5 rounded-lg bg-cyber-red/20 border border-cyber-red/50 text-cyber-red font-medium text-sm hover:bg-cyber-red/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {surging ? 'Surging…' : '🚀 Simulate Flash Traffic (50 Threads)'}
                </button>
                <button
                  onClick={resetInventory}
                  className="w-full py-2 rounded-lg bg-cyber-600/30 border border-cyber-600 text-slate-300 text-xs hover:bg-cyber-600/50 transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Inventory to Defaults
                </button>
              </div>
            </Panel>
          </div>

          {/* Inventory Grid */}
          <div className="lg:col-span-2">
            <Panel title="Live Inventory" icon={<Box className="w-4 h-4 text-cyber-accent" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventory.length === 0 ? (
                  <p className="text-slate-500 text-sm col-span-2">Waiting for inventory data…</p>
                ) : (
                  inventory.map((item) => (
                    <div
                      key={item.id}
                      className={`relative p-4 rounded-xl border bg-cyber-800/50 border-cyber-600/60 transition-all duration-300 ${
                        item._flash ? 'card-flash ring-1 ring-cyber-accent/50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-orbitron text-sm font-semibold text-white">{item.itemName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">SKU #{item.id}</p>
                        </div>
                        <div className={`text-2xl font-bold font-orbitron ${
                          item.stockQuantity <= 10 ? 'text-cyber-red' :
                          item.stockQuantity <= 30 ? 'text-cyber-yellow' : 'text-cyber-green'
                        }`}>
                          {item.stockQuantity}
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-cyber-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.stockQuantity <= 10 ? 'bg-cyber-red' :
                            item.stockQuantity <= 30 ? 'bg-cyber-yellow' : 'bg-cyber-green'
                          }`}
                          style={{ width: `${Math.min(100, (item.stockQuantity / 200) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Orders + DLQ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Live Orders */}
          <div className="xl:col-span-2">
            <Panel title="Live Order Stream" icon={<Activity className="w-4 h-4 text-cyber-accent" />}>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-cyber-800 text-xs text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">Item</th>
                      <th className="text-left py-2 px-2">Qty</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500">
                          No orders yet. Place one or simulate a surge.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr
                          key={o.id}
                          className={`border-t border-cyber-700/50 hover:bg-cyber-700/20 transition ${statusBg(o.status)}`}
                        >
                          <td className="py-2 px-2 font-mono text-xs">#{o.id}</td>
                          <td className="py-2 px-2">{o.itemName}</td>
                          <td className="py-2 px-2">{o.quantityRequested}</td>
                          <td className={`py-2 px-2 font-semibold text-xs ${statusColor(o.status)}`}>
                            {o.status}
                          </td>
                          <td className="py-2 px-2 text-xs text-slate-400">
                            {o.timestamp ? new Date(o.timestamp).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* DLQ */}
          <div>
            <Panel title="Dead Letter Queue" icon={<AlertTriangle className="w-4 h-4 text-cyber-red" />}>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {dlq.length === 0 ? (
                  <p className="text-slate-500 text-sm py-6 text-center">DLQ empty ✓</p>
                ) : (
                  dlq.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-lg border border-cyber-red/30 bg-cyber-red/5"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-white">{d.itemName}</span>
                        <span className="text-xs text-cyber-red">×{d.quantityRequested}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{d.failureReason}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      </main>

      <footer className="border-t border-cyber-700/50 py-4 text-center text-xs text-slate-500">
        Spring Boot · WebSocket · Pessimistic Locking · Thread Pool · React + Tailwind
      </footer>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="rounded-xl border border-cyber-600/50 bg-cyber-800/40 backdrop-blur overflow-hidden">
      <div className="px-4 py-3 border-b border-cyber-600/40 flex items-center gap-2">
        {icon}
        <h2 className="font-orbitron text-sm font-semibold tracking-wide text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    accent: 'text-cyber-accent border-cyber-accent/30 bg-cyber-accent/5',
    green: 'text-cyber-green border-cyber-green/30 bg-cyber-green/5',
    red: 'text-cyber-red border-cyber-red/30 bg-cyber-red/5',
    yellow: 'text-cyber-yellow border-cyber-yellow/30 bg-cyber-yellow/5',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-80">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-2xl font-orbitron font-bold">{value}</p>
    </div>
  );
}

export default App;
