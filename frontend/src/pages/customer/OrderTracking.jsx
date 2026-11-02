import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Search, Clock, CheckCircle2,
  AlertCircle, ArrowLeft, Star, Send, XCircle, ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { orderService } from "../../services/api";

const STATUS_STEPS = [
  { key: "PENDING", label: "Order Placed", desc: "Received by kitchen" },
  { key: "CONFIRMED", label: "Accepted", desc: "Chef confirmed receipt" },
  { key: "PREPARING", label: "Preparing", desc: "Cooking fresh in cloud kitchen" },
  { key: "READY", label: "Ready for Pickup", desc: "Packed & awaiting driver" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "On the way to your door" },
  { key: "DELIVERED", label: "Delivered", desc: "Enjoy your meal!" },
];

export default function OrderTracking() {
  const { orderNumber: paramOrderNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputOrderNumber, setInputOrderNumber] = useState(paramOrderNumber || "");
  const [activeOrderNum, setActiveOrderNum] = useState(paramOrderNumber || "");

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Poll active order every 5 seconds for live status updates
  const { data: trackData, isLoading, isError, refetch } = useQuery({
    queryKey: ["orderTracking", activeOrderNum],
    queryFn: async () => {
      if (!activeOrderNum) return null;
      const res = await orderService.track(activeOrderNum);
      return res.data;
    },
    enabled: Boolean(activeOrderNum),
    refetchInterval: 5000,
  });

  const order = trackData?.order;
  const isCancelled = order?.status === "CANCELLED";

  // Step determination
  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (isCancelled) return -1;
    const idx = STATUS_STEPS.findIndex(s => s.key === order.status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: async (reason) => {
      return orderService.cancel(order.id, reason);
    },
    onSuccess: () => {
      toast.success("Order cancelled successfully.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Could not cancel order.");
    }
  });

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      cancelMutation.mutate("Cancelled by customer request");
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!order) return;
    try {
      setIsSubmittingFeedback(true);
      await orderService.submitFeedback(order.id, {
        rating,
        comment: feedbackComment
      });
      setFeedbackSuccess(true);
      toast.success("Thank you for your rating!");
      refetch();
    } catch (err) {
      toast.error("Failed to submit feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#12121a]/95 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/order")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ChefHat size={22} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                CloudChef
              </span>
              <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                Live Order Tracker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/order")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Menu
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold hover:bg-orange-500/25 transition-colors"
            >
              <span>Admin Portal</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8 flex-1">
        {/* Search bar for Order Number */}
        <div className="bg-[#151522] border border-white/10 rounded-2xl p-4 mb-8 shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputOrderNumber.trim()) {
                setActiveOrderNum(inputOrderNumber.trim());
                navigate(`/track/${inputOrderNumber.trim()}`, { replace: true });
              }
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Enter order number (e.g. CC-202610-0012 or ID)..."
                value={inputOrderNumber}
                onChange={(e) => setInputOrderNumber(e.target.value)}
                className="w-full bg-[#1a1a2a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              Track Order
            </button>
          </form>
        </div>

        {/* Content based on tracking query */}
        {!activeOrderNum ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl">
            <Clock size={40} className="mx-auto mb-3 text-orange-400 opacity-60" />
            <h3 className="font-bold text-white text-lg">Track Any Live Order</h3>
            <p className="text-gray-400 text-xs max-w-md mx-auto mt-1">
              Enter your CloudChef order number above to view real-time kitchen preparation, driver pickup, and delivery milestones.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-400 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-sm">Fetching live kitchen status...</p>
          </div>
        ) : isError || !order ? (
          <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-3xl">
            <AlertCircle size={36} className="mx-auto mb-2 text-red-400" />
            <h3 className="font-bold text-white text-base">Order Not Found</h3>
            <p className="text-gray-400 text-xs mt-1">
              Could not find order "{activeOrderNum}". Please check the number or verify with your confirmation SMS.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Order Status Header Card */}
            <div className="bg-[#151522] border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-bold block mb-1">
                    Order Reference: {order.orderNumber}
                  </span>
                  <h2 className="text-2xl font-black text-white">
                    {isCancelled ? "Order Cancelled" : `Status: ${STATUS_STEPS[currentStepIdx]?.label || order.status}`}
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Placed at {new Date(order.placedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    isCancelled ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    order.status === "DELIVERED" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    "bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse"
                  }`}>
                    {order.status}
                  </span>
                  <p className="text-xl font-black text-white mt-1">₹{order.total}</p>
                </div>
              </div>

              {/* Progress Pipeline */}
              {isCancelled ? (
                <div className="my-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                  <XCircle size={32} className="mx-auto text-red-400 mb-1" />
                  <p className="font-bold text-red-300 text-sm">This order was cancelled.</p>
                  <p className="text-gray-400 text-xs mt-0.5">{order.cancellationReason || "Cancelled by customer request."}</p>
                </div>
              ) : (
                <div className="my-8">
                  <div className="relative">
                    {/* Background line */}
                    <div className="absolute top-5 left-4 right-4 h-1 bg-white/10 -z-0" />
                    {/* Active line */}
                    <div
                      className="absolute top-5 left-4 h-1 bg-gradient-to-r from-orange-500 to-green-500 -z-0 transition-all duration-700"
                      style={{ width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 95}%` }}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                          <div key={step.key} className="flex flex-col items-center text-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              isCurrent
                                ? "bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/30"
                                : isDone
                                ? "bg-green-500 text-white"
                                : "bg-[#1c1c2b] border border-white/10 text-gray-500"
                            }`}>
                              {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                            </div>
                            <p className={`text-xs font-bold mt-2.5 ${isCurrent ? "text-orange-400" : isDone ? "text-white" : "text-gray-500"}`}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight hidden md:block">
                              {step.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation Option */}
              {trackData.canCancel && !isCancelled && (
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Changed your mind? You can cancel while the order is pending.</span>
                  <button
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs transition-colors"
                  >
                    {cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
                  </button>
                </div>
              )}
            </div>

            {/* Order Details & Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items Card */}
              <div className="bg-[#151522] border border-white/10 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                  <ChefHat size={18} className="text-orange-400" /> Items in this Order
                </h3>
                <div className="space-y-3">
                  {order.items?.map((it) => (
                    <div key={it.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center">
                          {it.quantity}x
                        </span>
                        <div>
                          <p className="font-semibold text-white text-xs">{it.menuItem?.name || "Dish"}</p>
                          <p className="text-[10px] text-gray-500">₹{it.priceAtOrder} each</p>
                        </div>
                      </div>
                      <span className="font-bold text-white text-xs">
                        ₹{it.priceAtOrder * it.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (5% GST)</span>
                    <span>₹{order.tax}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-sm pt-2 border-t border-white/5">
                    <span>Total Amount</span>
                    <span className="text-orange-400">₹{order.total}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Details Card */}
              <div className="bg-[#151522] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-base mb-4">Delivery Information</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-gray-500 text-[11px]">Customer Name</p>
                      <p className="font-semibold text-white mt-0.5">{order.customer?.name || "Guest"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">Mobile Phone</p>
                      <p className="font-semibold text-white mt-0.5">{order.customer?.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">Delivery Address</p>
                      <p className="font-semibold text-white mt-0.5 leading-relaxed">
                        {order.deliveryAddress || order.customer?.address || "Pickup / Dine-in"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[11px]">Payment Mode</p>
                      <p className="font-bold text-green-400 mt-0.5">{order.paymentMethod} ({order.paymentStatus})</p>
                    </div>
                  </div>
                </div>

                {/* Rating & Review Section (Active when DELIVERED) */}
                {order.status === "DELIVERED" && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider text-orange-400 mb-2">
                      Customer Feedback
                    </h4>
                    {order.rating || feedbackSuccess ? (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <div className="flex items-center gap-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map(st => (
                            <Star key={st} size={14} className={st <= (order.rating || rating) ? "fill-amber-400" : "text-gray-600"} />
                          ))}
                        </div>
                        <p className="text-gray-300 text-xs mt-1.5 italic">
                          "{order.feedbackComment || feedbackComment || "Piping hot and delicious!"}"
                        </p>
                        <span className="text-[10px] text-green-400 font-bold block mt-1">✓ Review recorded</span>
                      </div>
                    ) : (
                      <form onSubmit={handleFeedbackSubmit} className="space-y-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(st => (
                            <button
                              type="button"
                              key={st}
                              onClick={() => setRating(st)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star size={18} className={st <= rating ? "text-amber-400 fill-amber-400" : "text-gray-600"} />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-amber-400 ml-2">{rating} Stars</span>
                        </div>
                        <input
                          type="text"
                          placeholder="How was the taste, packaging, and delivery?"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingFeedback}
                          className="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
                        >
                          <Send size={12} /> {isSubmittingFeedback ? "Saving..." : "Submit Review"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
