import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Clock, CheckCircle2, XCircle, ChevronDown,
  Search, RefreshCw, Truck, Plus, Loader2, AlertTriangle, ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { orderService } from "../services/api";
import { EmptyState, ErrorState } from "../components/ui/EmptyState";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:          { label: "Pending",          badge: "badge-warning", icon: Clock,        bg: "border-yellow-500/30 bg-yellow-500/5" },
  CONFIRMED:        { label: "Accepted",         badge: "badge-info",    icon: CheckCircle2, bg: "border-blue-500/30 bg-blue-500/5"     },
  PREPARING:        { label: "Preparing",        badge: "badge-brand",   icon: RefreshCw,    bg: "border-brand-500/30 bg-brand-500/5"   },
  READY:            { label: "Ready for Pickup", badge: "badge-info",    icon: CheckCircle2, bg: "border-blue-500/30 bg-blue-500/5"     },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", badge: "badge-brand",   icon: Truck,        bg: "border-orange-500/30 bg-orange-500/5" },
  DELIVERED:        { label: "Delivered",        badge: "badge-success", icon: Truck,        bg: "border-green-500/30 bg-green-500/5"   },
  CANCELLED:        { label: "Cancelled",        badge: "badge-danger",  icon: XCircle,      bg: "border-red-500/30 bg-red-500/5"       },
};

const NEXT_STATUS = {
  PENDING:          "CONFIRMED",
  CONFIRMED:        "PREPARING",
  PREPARING:        "READY",
  READY:            "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

const STATUS_TABS = ["All", "PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

const ORDERS_QUERY_KEY = ["orders"];

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, isUpdating }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const next = NEXT_STATUS[order.status];
  const isOptimistic = order._optimistic;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isOptimistic ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`card border ${cfg.bg} overflow-hidden`}
    >
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
            <Icon size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-sm truncate">{order.customer?.name || "Guest"}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                {order.orderSource || "DIRECT"}
              </span>
            </div>
            <p className="text-gray-500 text-xs font-mono">{order.orderNumber} · {
              new Date(order.placedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="font-bold text-white">₹{order.total?.toFixed(0)}</p>
            <span className={`text-xs ${cfg.badge}`}>{cfg.label}</span>
          </div>
          <ChevronDown size={16} className={`text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 space-y-3">
              {/* Items list */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Order Items</p>
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.menuItem?.name || item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">×{item.quantity}</span>
                      <span className="text-gray-400 font-medium">₹{(item.priceAtOrder * item.quantity)?.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-2">
                {order.customer?.phone && <span>📞 {order.customer.phone}</span>}
                {order.notes && <span className="text-gray-400 italic truncate max-w-[60%]">"{order.notes}"</span>}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {next && (
                  <button
                    onClick={() => onStatusChange(order.id, next)}
                    disabled={isUpdating}
                    className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                    Move to {STATUS_CONFIG[next]?.label}
                  </button>
                )}
                {["PENDING", "CONFIRMED"].includes(order.status) && (
                  <button
                    onClick={() => onStatusChange(order.id, "CANCELLED")}
                    disabled={isUpdating}
                    className="btn-secondary w-full py-2 text-sm text-red-400 hover:text-red-300"
                  >
                    Cancel Order & Restock
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Orders() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // ─── Data fetching ───────────────────────────────────────────────────────
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await orderService.getAll();
      return Array.isArray(data) ? data : data?.orders || [];
    },
    staleTime: 15 * 1000,
  });

  // ─── Derived data ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    return STATUS_TABS.reduce((acc, tab) => {
      acc[tab] = tab === "All" ? orders.length : orders.filter(o => o.status === tab).length;
      return acc;
    }, {});
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchTab = activeTab === "All" || o.status === activeTab;
      const matchSearch = !search ||
        o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.orderNumber?.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [orders, activeTab, search]);

  const stats = useMemo(() => ({
    pending:   orders.filter(o => o.status === "PENDING").length,
    preparing: orders.filter(o => ["CONFIRMED", "PREPARING"].includes(o.status)).length,
    ready:     orders.filter(o => o.status === "READY").length,
    revenue:   orders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.total || 0), 0),
  }), [orders]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await orderService.updateStatus(id, status);
      return data;
    },
    onMutate: async ({ id, status }) => {
      setUpdatingId(id);
      await queryClient.cancelQueries({ queryKey: ORDERS_QUERY_KEY });
      const previous = queryClient.getQueryData(ORDERS_QUERY_KEY);
      queryClient.setQueryData(ORDERS_QUERY_KEY, (old) =>
        (old || []).map(o => o.id === id ? { ...o, status, _optimistic: true } : o)
      );
      return { previous };
    },
    onError: (err, vars, ctx) => {
      queryClient.setQueryData(ORDERS_QUERY_KEY, ctx.previous);
      toast.error(err.response?.data?.error || "Failed to update order status");
    },
    onSuccess: (data, { status }) => {
      toast.success(`Order status updated to ${STATUS_CONFIG[status]?.label}`);
    },
    onSettled: () => {
      setUpdatingId(null);
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries(["inventory"]);
    },
  });

  const handleStatusChange = (id, status) => {
    statusMutation.mutate({ id, status });
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-brand-400" /> Kitchen Order Queue
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Live order status progression & smart inventory consumption</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-secondary p-2" aria-label="Refresh orders">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => navigate("/order")} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Storefront POS
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending",   count: stats.pending,   color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5" },
          { label: "In Kitchen", count: stats.preparing, color: "text-brand-400 border-brand-500/20 bg-brand-500/5"   },
          { label: "Ready",     count: stats.ready,     color: "text-blue-400 border-blue-500/20 bg-blue-500/5"       },
          { label: "Delivered Gross", count: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "text-green-400 border-green-500/20 bg-green-500/5" },
        ].map(({ label, count, color }) => (
          <div key={label} className={`card border flex items-center justify-between px-4 py-3 ${color}`}>
            <span className="text-sm font-medium opacity-80">{label}</span>
            <span className="text-xl font-bold">{count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer or order ID..."
            className="input pl-9 text-sm h-9 w-full"
          />
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/5 overflow-x-auto flex-shrink-0">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${activeTab === tab
                  ? "bg-brand-500 text-white shadow-glow"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              {tab === "All" ? "All" : STATUS_CONFIG[tab]?.label} ({counts[tab] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3">
          <Loader2 size={24} className="animate-spin text-brand-500" />
          <p className="text-sm">Loading orders...</p>
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} className="card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={orders.length === 0 ? "No orders yet" : "No orders match your filter"}
          message={orders.length === 0 ? "Orders will appear here in real-time as they come in." : "Try a different status tab or clear your search."}
          secondaryLabel={orders.length > 0 ? "Clear Filters" : undefined}
          onSecondaryAction={() => { setSearch(""); setActiveTab("All"); }}
          className="card"
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={updatingId === order.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
