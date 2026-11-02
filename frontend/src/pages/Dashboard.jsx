import { motion } from "framer-motion";
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, IndianRupee, Clock,
  Flame, Package, ChefHat, Star, RefreshCw, ExternalLink,
  ShieldCheck
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dashboardService, orderService, inventoryService } from "../services/api";

const statusColors = {
  PENDING:   "badge-warning",
  CONFIRMED: "badge-info",
  PREPARING: "badge-brand",
  READY:     "badge-info",
  OUT_FOR_DELIVERY: "badge-brand",
  DELIVERED: "badge-success",
  CANCELLED: "badge-danger",
};

export default function Dashboard() {
  const navigate = useNavigate();

  // 1. Fetch Live Stats
  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await dashboardService.getStats();
      return res.data;
    }
  });

  // 2. Fetch Live Revenue Trend
  const { data: revenueData } = useQuery({
    queryKey: ["dashboardRevenue"],
    queryFn: async () => {
      const res = await dashboardService.getRevenue({ days: 7 });
      return res.data || [];
    }
  });

  // 3. Fetch Top Dishes
  const { data: dishesData } = useQuery({
    queryKey: ["dashboardTopDishes"],
    queryFn: async () => {
      const res = await dashboardService.getTopDishes();
      return res.data;
    }
  });

  // 4. Fetch Recent Orders
  const { data: ordersData } = useQuery({
    queryKey: ["dashboardRecentOrders"],
    queryFn: async () => {
      const res = await orderService.getAll({ limit: 6 });
      return res.data?.orders || [];
    }
  });

  // 5. Fetch Low Stock Alerts
  const { data: lowStockData } = useQuery({
    queryKey: ["dashboardLowStock"],
    queryFn: async () => {
      const res = await inventoryService.getLowStock();
      return res.data?.lowStockOnly || [];
    }
  });

  const stats = statsData || {
    revenue: { total: 0, today: 0, month: 0 },
    orders: { total: 0, today: 0, pending: 0, preparing: 0, delivered: 0, cancelled: 0 },
    financials: { aov: 0, foodCostPercent: 32, totalCommissions: 0, estimatedNetProfit: 0, netMarginPercent: 0 }
  };

  const orderStatusPie = [
    { name: "Delivered", value: stats.orders.delivered || 0, color: "#22c55e" },
    { name: "Preparing / Active", value: stats.orders.preparing || 0, color: "#f97316" },
    { name: "Pending", value: stats.orders.pending || 0, color: "#eab308" },
    { name: "Cancelled", value: stats.orders.cancelled || 0, color: "#ef4444" },
  ];

  const topDishesList = dishesData?.topDishes || [];
  const recentOrdersList = Array.isArray(ordersData) ? ordersData : (ordersData?.orders || []);
  const lowStockList = Array.isArray(lowStockData) ? lowStockData : [];
  const maxDishOrders = topDishesList.length > 0 ? Math.max(...topDishesList.map(d => d.orders)) : 100;

  return (
    <div className="page-content space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>Kitchen Overview</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
              Live Operations
            </span>
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Real-time performance, smart inventory consumption, and order pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/order")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all"
          >
            <span>Customer Storefront</span>
            <ExternalLink size={13} />
          </button>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-4 border border-white/5 bg-[#151522]">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Total Revenue</span>
            <IndianRupee size={16} className="text-green-400" />
          </div>
          <p className="text-2xl font-black text-white">₹{stats.revenue.total.toLocaleString("en-IN")}</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <span className="text-green-400 font-bold">₹{stats.revenue.today.toLocaleString("en-IN")}</span> today
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-4 border border-white/5 bg-[#151522]">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Total Orders</span>
            <ShoppingBag size={16} className="text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.orders.total}</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <span className="text-orange-400 font-bold">{stats.orders.pending}</span> pending acceptance
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 border border-white/5 bg-[#151522]">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Average Order Value</span>
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">₹{stats.financials.aov}</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <span>Food cost:</span>
            <span className="text-blue-400 font-bold">{stats.financials.foodCostPercent}%</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4 border border-white/5 bg-[#151522]">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">Net Profit Margin</span>
            <ShieldCheck size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{stats.financials.netMarginPercent}%</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
            <span>Est. Net:</span>
            <span className="font-bold text-white">₹{stats.financials.estimatedNetProfit.toLocaleString("en-IN")}</span>
          </div>
        </motion.div>
      </div>

      {/* Middle Grid: Revenue Trend & Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2 border border-white/10 bg-[#151522] shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">7-Day Revenue & Channel Performance</h2>
              <p className="text-gray-400 text-xs">Direct vs Aggregator sales breakdown</p>
            </div>
            <span className="text-xs text-gray-500 font-mono">Live PostgreSQL Records</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#181826", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue (₹)" stroke="#f97316" fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="direct" name="Direct (₹)" stroke="#22c55e" fill="transparent" strokeWidth={1.5} />
                <Area type="monotone" dataKey="swiggy" name="Swiggy (₹)" stroke="#f59e0b" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card p-5 border border-white/10 bg-[#151522] shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Order Status Mix</h2>
            <p className="text-gray-400 text-xs mb-3">Lifecycle distribution</p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatusPie} innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value">
                    {orderStatusPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#181826", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
            {orderStatusPie.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="card lg:col-span-2 border border-white/10 bg-[#151522] shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-bold text-white text-base">Recent Kitchen Orders</h2>
            <button onClick={() => navigate("/orders")} className="text-orange-400 text-xs font-semibold hover:underline">
              View All Orders
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No recent orders found.
                    </td>
                  </tr>
                ) : (
                  recentOrdersList.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-mono text-orange-400 font-bold">{o.orderNumber}</td>
                      <td className="py-3 px-3 text-white font-medium">{o.customer?.name || "Guest"}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-300">
                          {o.orderSource}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">₹{o.total}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[o.status] || "badge-brand"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                        {o.placedAt ? new Date(o.placedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock & AI Alerts */}
        <div className="space-y-4">
          <div className="card p-5 border border-white/10 bg-[#151522] shadow-xl">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Package size={16} className="text-amber-400" /> Low Stock Alerts
            </h3>
            {lowStockList.length === 0 ? (
              <p className="text-gray-500 text-xs py-4 text-center">All inventory items are above safety threshold.</p>
            ) : (
              <div className="space-y-2">
                {lowStockList.slice(0, 4).map((ing) => (
                  <div key={ing.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{ing.name}</p>
                      <p className="text-[11px] text-gray-500">Stock: {ing.currentStock} {ing.unit} (Min {ing.reorderLevel})</p>
                    </div>
                    <span className="font-mono text-orange-400 font-bold text-xs">
                      Reorder {ing.suggestedPurchase || 10} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate("/inventory")}
              className="w-full mt-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
            >
              Open Inventory Management
            </button>
          </div>

          <div className="card p-5 border border-white/10 bg-[#151522] shadow-xl">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <Flame size={16} className="text-orange-400" /> Operational Insights
            </h3>
            <div className="space-y-2.5 text-xs text-gray-300">
              <p className="leading-relaxed">
                • <strong>Peak Lunch & Dinner Windows:</strong> 12–2 PM and 8–10 PM account for 85% of total volume.
              </p>
              <p className="leading-relaxed">
                • <strong>Direct Channel Margin:</strong> Orders via direct storefront yield +18.4% higher net contribution than aggregator channels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Dishes Bar */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <h3 className="font-bold text-white text-base mb-1">Top Selling Menu Items</h3>
        <p className="text-gray-400 text-xs mb-4">Ranked by actual cumulative order volume</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topDishesList.slice(0, 4).map((d, i) => (
            <div key={d.name} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-orange-400">#{i + 1} Best</span>
                <span className="text-xs font-mono font-bold text-white">₹{d.price}</span>
              </div>
              <p className="font-bold text-white text-sm mt-1">{d.name}</p>
              <div className="mt-3 flex justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
                <span>Orders: <strong className="text-white">{d.orders}</strong></span>
                <span>Revenue: <strong className="text-orange-400">₹{d.revenue}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
