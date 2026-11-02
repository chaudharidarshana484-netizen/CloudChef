import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Package, CheckCircle2, Clock, XCircle,
  Truck, ChefHat, ArrowRight, Star, RefreshCw, ShoppingBag, MapPin
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCustomerStore } from "../../stores/customerStore";
import { api } from "../../services/api";
import CustomerLayout from "../../components/layout/CustomerLayout";

const STATUS_MAP = {
  PENDING:          { label: "Order Placed",       icon: Clock,         color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  CONFIRMED:        { label: "Accepted",            icon: CheckCircle2,  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  PREPARING:        { label: "Preparing",           icon: ChefHat,       color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20" },
  READY:            { label: "Ready for Pickup",    icon: Package,       color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",    icon: Truck,         color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  DELIVERED:        { label: "Delivered",           icon: CheckCircle2,  color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  CANCELLED:        { label: "Cancelled",           icon: XCircle,       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
};

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`transition-all ${s <= value ? "text-yellow-400 scale-110" : "text-gray-600 hover:text-yellow-400"}`}>
          <Star size={18} fill={s <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function OrderCard({ order, onCancel, onFeedback }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(order.rating || 0);
  const [comment, setComment] = useState(order.feedbackComment || "");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const cfg = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const StatusIcon = cfg.icon;
  const canCancel = ["PENDING", "CONFIRMED"].includes(order.status);
  const isDelivered = order.status === "DELIVERED";
  const hasRating = order.rating != null;

  const submitFeedback = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    try {
      setSubmittingFeedback(true);
      await api.post(`/orders/${order.id}/feedback`, { rating, comment });
      toast.success("Thank you for your feedback!");
      setFeedbackOpen(false);
      onFeedback?.();
    } catch {
      toast.error("Could not submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#13131f] border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">{order.orderNumber}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
              <StatusIcon size={11} /> {cfg.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">{order.orderSource}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(order.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-white text-lg">₹{order.total?.toFixed(0)}</p>
          <p className="text-xs text-gray-500">{order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid Online"}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-3 space-y-1.5">
        {order.items?.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-xs bg-white/5 rounded px-1.5 py-0.5">{it.quantity}×</span>
              <span className="text-gray-300">{it.menuItem?.name || "Item"}</span>
            </div>
            <span className="text-gray-400 font-medium">₹{(it.quantity * it.priceAtOrder).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Address */}
      {order.deliveryAddress && (
        <div className="px-5 pb-3 flex items-start gap-1.5 text-xs text-gray-500">
          <MapPin size={12} className="mt-0.5 flex-shrink-0" />
          <span>{order.deliveryAddress}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
        <Link to={`/track/${order.orderNumber}`}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-gray-300 hover:text-white hover:bg-white/10 transition-all">
          Track Order <ArrowRight size={11} />
        </Link>

        {canCancel && (
          <button onClick={() => onCancel(order.id)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
            <XCircle size={11} /> Cancel Order
          </button>
        )}

        {isDelivered && !hasRating && (
          <button onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all">
            <Star size={11} /> Rate &amp; Review
          </button>
        )}

        {isDelivered && hasRating && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            You rated: {order.rating}/5
          </div>
        )}
      </div>

      {/* Feedback modal */}
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-4 border-t border-white/5 overflow-hidden">
            <div className="pt-3 space-y-3">
              <p className="text-sm font-semibold text-white">Rate your experience</p>
              <StarRating value={rating} onChange={setRating} />
              <textarea className="input w-full text-sm resize-none h-20"
                placeholder="Tell us about your experience (optional)..."
                value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={submitFeedback} disabled={submittingFeedback}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                  <Star size={12} /> {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </button>
                <button onClick={() => setFeedbackOpen(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customer, isAuthenticated, token } = useCustomerStore();

  if (!isAuthenticated) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardList size={48} className="text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign in to view your orders</h2>
          <p className="text-gray-500 mb-6">Track your deliveries and rate your experience after signing in.</p>
          <Link to="/customer/login" className="btn-primary px-6 py-3 flex items-center gap-2">
            Sign In / Register <ArrowRight size={16} />
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["myOrders", customer?.id],
    queryFn: async () => {
      const res = await api.get(`/customers/${customer.id}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: !!customer?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId) => api.patch(`/orders/${orderId}/cancel`, { reason: "Cancelled by customer" }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    onSuccess: () => {
      toast.success("Order cancelled successfully");
      queryClient.invalidateQueries(["myOrders"]);
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not cancel this order"),
  });

  const fetchedOrders = ordersData?.orders || (Array.isArray(ordersData) ? ordersData : []);
  const localOrder = (() => {
    try {
      const saved = localStorage.getItem("cloudchef_latest_order");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const orders = useMemo(() => {
    const list = [...fetchedOrders];
    if (localOrder && !list.some(o => o.orderNumber === localOrder.orderNumber || o.id === localOrder.id)) {
      list.unshift(localOrder);
    }
    return list;
  }, [fetchedOrders, localOrder]);

  return (
    <CustomerLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <ClipboardList size={18} className="text-orange-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">My Orders</h1>
            </div>
            <p className="text-gray-400 text-xs">
              Hello, {customer?.name}! Here are all your orders.
            </p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-[#13131f] border border-white/5 rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && orders.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-[#13131f] border border-white/5 rounded-2xl">
            <ShoppingBag size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No orders yet</h3>
            <p className="text-gray-500 text-sm mb-6">Start by exploring our delicious menu.</p>
            <Link to="/order" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              Browse Menu <ArrowRight size={16} />
            </Link>
          </motion.div>
        )}

        {/* Orders list */}
        {!isLoading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={(id) => cancelMutation.mutate(id)}
                onFeedback={() => queryClient.invalidateQueries(["myOrders"])}
              />
            ))}
          </div>
        )}

        {/* Back to menu */}
        <div className="text-center pt-4">
          <Link to="/order" className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            <ShoppingBag size={15} /> Order again
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
