import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Flame, Package, ArrowRight, RefreshCw, Bell, Truck, Timer, UtensilsCrossed, Zap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { orderService } from "../services/api";

const STATUS_CONFIG = {
  PENDING:          { label: "New Orders",       color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30",  next: "CONFIRMED",        nextLabel: "Accept",     icon: Bell },
  CONFIRMED:        { label: "Accepted",          color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",      next: "PREPARING",        nextLabel: "Start Prep", icon: ChefHat },
  PREPARING:        { label: "Preparing",         color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30",  next: "READY",            nextLabel: "Mark Ready", icon: Flame },
  READY:            { label: "Ready for Pickup",  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",    next: "OUT_FOR_DELIVERY", nextLabel: "Dispatch",   icon: Package },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",  color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30",  next: "DELIVERED",        nextLabel: "Delivered",  icon: Truck },
};

const QUEUE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

function TimerBadge({ placedAt, status }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(placedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [placedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isLate = (mins >= 25 && status === "PREPARING") || (mins >= 15 && status === "PENDING");

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${isLate ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-gray-400"}`}>
      <Timer size={10} />
      {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
    </span>
  );
}

function OrderCard({ order, onAdvance, isAdvancing }) {
  const config = STATUS_CONFIG[order.status];
  const NextIcon = config?.icon || ChefHat;
  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const nextBtnColors = {
    CONFIRMED:        "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
    PREPARING:        "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
    READY:            "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30",
    OUT_FOR_DELIVERY: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
    DELIVERED:        "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30",
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
      className="card border border-white/10 p-4 space-y-3 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${config?.color?.replace("text-","bg-")}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">{order.orderNumber}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${config?.bg}`}>{order.orderSource}</span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{order.customer?.name || "Walk-in"}{order.customer?.phone ? ` • ${order.customer.phone}` : ""}</p>
          </div>
          <TimerBadge placedAt={order.placedAt} status={order.status} />
        </div>
        <div className="space-y-1 mt-2">
          {order.items?.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white bg-white/5 rounded px-1.5 py-0.5 min-w-[22px] text-center">{it.quantity}x</span>
              <span className="text-gray-300">{it.menuItem?.name || "Item"}</span>
              {it.notes && <span className="text-yellow-400 ml-auto">📝 {it.notes}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
          <div className="text-xs text-gray-400">
            <span className="font-semibold text-white">{totalItems}</span> items •{" "}
            <span className="font-semibold text-green-400">₹{order.total?.toFixed(0)}</span>
          </div>
          {config?.next && (
            <button onClick={() => onAdvance(order.id, config.next)} disabled={isAdvancing}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${isAdvancing ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"} ${nextBtnColors[config.next] || ""}`}>
              <NextIcon size={12} />
              {config.nextLabel}
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function KitchenOps() {
  const queryClient = useQueryClient();
  const [advancingId, setAdvancingId] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ["kitchenLiveQueue"],
    queryFn: async () => { const res = await orderService.getLiveQueue(); return res.data || []; },
    refetchInterval: 20000,
  });

  const advanceMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => orderService.updateStatus(orderId, newStatus),
    onMutate: ({ orderId }) => setAdvancingId(orderId),
    onSuccess: (_, { newStatus }) => {
      toast.success(`Order moved to ${newStatus.replace(/_/g," ")}`);
      queryClient.invalidateQueries(["kitchenLiveQueue"]);
      queryClient.invalidateQueries(["dashboardStats"]);
      setLastRefresh(new Date());
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to update status"),
    onSettled: () => setAdvancingId(null),
  });

  const handleAdvance = useCallback((orderId, newStatus) => {
    advanceMutation.mutate({ orderId, newStatus });
  }, [advanceMutation]);

  useEffect(() => {
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api","");
    const es = new EventSource(`${API_BASE}/api/stream/kitchen`);
    es.addEventListener("ORDER_CREATED", () => { refetch(); toast("New order arrived!", { icon: "🍽️" }); });
    es.addEventListener("ORDER_UPDATED", () => refetch());
    return () => es.close();
  }, [refetch]);

  const grouped = QUEUE_STATUSES.reduce((acc, s) => { acc[s] = queue.filter(o => o.status === s); return acc; }, {});
  const totalActive = queue.length;

  return (
    <div className="page-content space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <ChefHat size={18} className="text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Live Kitchen Queue</h1>
            {totalActive > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold animate-pulse">{totalActive}</span>
            )}
          </div>
          <p className="text-gray-400 text-xs">Real-time kanban board. Advance orders status with one click. Auto-refreshes every 20s. Last: {lastRefresh.toLocaleTimeString("en-IN")}</p>
        </div>
        <button onClick={() => { refetch(); setLastRefresh(new Date()); toast.success("Queue refreshed"); }} className="btn-secondary flex items-center gap-2 text-xs">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {QUEUE_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = grouped[s]?.length || 0;
          const StatusIcon = cfg.icon;
          return (
            <div key={s} className={`rounded-xl border p-3 text-center transition-all ${count > 0 ? cfg.bg : "bg-white/[0.02] border-white/5"}`}>
              <StatusIcon size={16} className={`mx-auto mb-1 ${count > 0 ? cfg.color : "text-gray-600"}`} />
              <p className={`text-2xl font-bold ${count > 0 ? cfg.color : "text-gray-600"}`}>{count}</p>
              <p className={`text-xs mt-0.5 ${count > 0 ? "text-gray-300" : "text-gray-600"}`}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {!isLoading && totalActive === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card border border-white/5 p-12 text-center">
          <UtensilsCrossed size={40} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-1">Kitchen is quiet right now</h3>
          <p className="text-gray-500 text-sm">No active orders. New orders from the storefront will appear here automatically.</p>
        </motion.div>
      )}

      {totalActive > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {QUEUE_STATUSES.map(status => {
            const cfg = STATUS_CONFIG[status];
            const orders = grouped[status] || [];
            return (
              <div key={status} className="space-y-3">
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cfg.bg}`}>
                  <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs font-bold bg-black/20 px-2 py-0.5 rounded-full text-white">{orders.length}</span>
                </div>
                <AnimatePresence>
                  {orders.map(order => (
                    <OrderCard key={order.id} order={order} onAdvance={handleAdvance} isAdvancing={advancingId === order.id} />
                  ))}
                </AnimatePresence>
                {orders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/5 p-6 text-center">
                    <p className="text-gray-600 text-xs">Empty</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-3 bg-white/5 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      <div className="card border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-white">Kitchen Environment (IoT Sensors)</h2>
          <span className="text-xs text-gray-500 ml-auto italic">Demo values — real IoT integration not connected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{l:"Cold Storage",v:"3.2°C",s:"Optimal",c:"text-green-400"},{l:"Freezer",v:"-18.5°C",s:"Optimal",c:"text-green-400"},{l:"Humidity",v:"45%",s:"Optimal",c:"text-green-400"},{l:"Prep Station",v:"22°C",s:"Normal",c:"text-blue-400"}].map(s => (
            <div key={s.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
              <p className="text-xs text-gray-500 mb-1">{s.l}</p>
              <p className={`font-bold text-lg ${s.c}`}>{s.v}</p>
              <p className={`text-xs ${s.c}`}>{s.s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
