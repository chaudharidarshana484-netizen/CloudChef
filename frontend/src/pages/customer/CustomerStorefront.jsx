import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Search, Clock, CheckCircle2,
  ChevronRight, ArrowRight, X, Plus, Minus,
  ShieldCheck, CreditCard, Banknote, Sparkles, AlertCircle, ChefHat, ExternalLink,
  User, ClipboardList, LogOut, LogIn
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { menuService, orderService, aiService } from "../../services/api";
import { useCustomerStore } from "../../stores/customerStore";

export default function CustomerStorefront() {
  const navigate = useNavigate();

  // Customer auth state
  const { customer, isAuthenticated: isCustomerLoggedIn, logout: customerLogout } = useCustomerStore();

  // State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState({}); // { [itemId]: { item, quantity } }
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Customer Form Details — auto-fill for logged-in customers
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ONLINE_SIMULATED"); // ONLINE_SIMULATED or COD
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Active Live Order persistence (Swiggy / Zomato style)
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("cloudchef_latest_order");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auto-fill form when customer logs in
  useEffect(() => {
    if (customer) {
      setCustomerName(customer.name || "");
      setCustomerPhone(customer.phone || "");
      setCustomerEmail(customer.email || "");
      setDeliveryAddress(customer.address || "");
    }
  }, [customer]);

  // Live polling for active order status
  const { data: liveTrackData } = useQuery({
    queryKey: ["activeOrderLiveStatus", activeOrder?.orderNumber],
    queryFn: async () => {
      if (!activeOrder?.orderNumber) return null;
      try {
        const res = await orderService.track(activeOrder.orderNumber);
        return res.data?.order || null;
      } catch {
        return null;
      }
    },
    enabled: !!activeOrder?.orderNumber,
    refetchInterval: 8000,
  });

  const currentActiveOrder = liveTrackData || activeOrder;

  // Fetch Menu from live backend
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ["customerMenu"],
    queryFn: async () => {
      const res = await menuService.getAll();
      return res.data;
    }
  });

  // Fetch Recommended dishes from AI
  const { data: recommendedData } = useQuery({
    queryKey: ["customerRecommendations"],
    queryFn: async () => {
      try {
        const res = await aiService.getRecommendations("guest");
        return res.data?.recommended_items || [];
      } catch (e) {
        return [];
      }
    }
  });

  const categories = useMemo(() => {
    if (!menuData?.categories) return ["All"];
    return ["All", ...menuData.categories.map(c => c.name)];
  }, [menuData]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!menuData?.items) return [];
    return menuData.items.filter(item => {
      if (selectedCategory !== "All" && item.category?.name !== selectedCategory) return false;
      if (vegOnly && !item.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [menuData, selectedCategory, vegOnly, searchQuery]);

  // Cart operations
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return { ...prev, [item.id]: { item, quantity: newQty } };
    });
    toast.success(`Added ${item.name} to cart!`, { duration: 1500 });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: { ...existing, quantity: newQty } };
    });
  };

  const cartList = Object.values(cart);
  const cartItemCount = cartList.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = cartList.reduce((acc, it) => acc + (it.item.price * it.quantity), 0);
  const packagingFee = cartItemCount > 0 ? 15 : 0;
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 30;
  const gstTax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + packagingFee + deliveryFee + gstTax;

  // Checkout submission
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      toast.error("Please enter your name, phone number, and delivery address.");
      return;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setIsPlacingOrder(true);
      const payload = {
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        notes: deliveryNotes,
        orderSource: "DIRECT",
        paymentMethod,
        items: cartList.map(it => ({
          menuItemId: it.item.id,
          quantity: it.quantity,
          notes: ""
        }))
      };

      const res = await orderService.create(payload);
      const order = res.data.order;
      setPlacedOrder(order);
      setActiveOrder(order);
      setCart({});
      setIsCartOpen(false);
      setIsCheckingOut(false);
      toast.success("Order Placed Successfully!");

      // Sync customer store with returned customer record so My Orders displays it
      if (order?.customer) {
        useCustomerStore.getState().login(order.customer, useCustomerStore.getState().token || "customer-session");
      }
      try {
        localStorage.setItem("cloudchef_latest_order", JSON.stringify(order));
      } catch (e) {}
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to place order.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-gray-100 flex flex-col font-sans">
      {/* ─── Top Navbar ─── */}
      <header className="sticky top-0 z-30 bg-[#12121a]/95 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ChefHat size={22} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                CloudChef
              </span>
              <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                Kitchen Storefront
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Customer Authentication & My Orders */}
            {isCustomerLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/my-orders"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 text-xs font-semibold transition-all"
                >
                  <ClipboardList size={14} />
                  <span className="hidden sm:inline">My Orders</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200">
                  <User size={13} className="text-orange-400" />
                  <span className="font-semibold max-w-[100px] truncate">{customer?.name?.split(" ")[0]}</span>
                  <button
                    onClick={() => {
                      customerLogout();
                      toast.success("Logged out of customer account");
                    }}
                    title="Sign Out"
                    className="text-gray-400 hover:text-red-400 transition-colors ml-1"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login?role=customer"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-200 transition-all"
              >
                <LogIn size={13} className="text-orange-400" />
                <span className="hidden sm:inline">Customer Login</span>
                <span className="sm:hidden">Login</span>
              </Link>
            )}

            <button
              onClick={() => navigate("/track")}
              className="text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="hidden sm:inline">Track Order</span>
              <span className="sm:hidden">Track</span>
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
            >
              <span>Kitchen Staff</span>
              <ExternalLink size={12} className="text-orange-400" />
            </button>

            {/* Cart trigger button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold text-xs md:text-sm transition-all shadow-lg shadow-orange-500/20"
            >
              <ShoppingBag size={16} />
              <span className="hidden md:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-orange-600 font-bold text-xs flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Banner ─── */}
      <div className="bg-gradient-to-b from-orange-500/10 via-[#12121a]/50 to-transparent border-b border-white/[0.04] py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold mb-3">
              <Sparkles size={13} /> Cloud Kitchen Optimization Demo
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Fresh Gourmet Bowls & Curries
            </h1>
            <p className="text-gray-400 text-sm md:text-base mt-2 max-w-xl">
              Freshly prepared meals cooked to perfection on demand with zero unnecessary food waste.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 shadow-glass">
            <div>
              <p className="text-gray-500 text-[11px]">Delivery SLA</p>
              <p className="font-bold text-white text-base">25–35 Mins</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-gray-500 text-[11px]">Hygiene Certified</p>
              <p className="font-bold text-green-400 text-base">5★ Kitchen</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-gray-500 text-[11px]">Free Delivery</p>
              <p className="font-bold text-orange-400 text-base">Above ₹500</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Storefront Content ─── */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-1">
        {/* Search & Veg Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search dishes (e.g. Butter Chicken, Biryani)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161622] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                vegOnly
                  ? "bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/10"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <span className={`w-3 h-3 rounded-full border-2 ${vegOnly ? "border-green-400 bg-green-400" : "border-gray-500"}`} />
              Pure Veg Only
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                  : "bg-[#181824] border border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {menuLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="card p-4 h-80 animate-pulse bg-white/5 rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl">
            <p className="text-gray-400 text-base font-semibold">No food items found matching your filters.</p>
            <button onClick={() => { setSelectedCategory("All"); setSearchQuery(""); setVegOnly(false); }} className="mt-3 text-orange-400 text-sm font-medium hover:underline">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const inCart = cart[item.id]?.quantity || 0;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group bg-[#151520] hover:bg-[#1a1a28] border border-white/[0.06] hover:border-orange-500/30 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl"
                >
                  <div>
                    {/* Item Image */}
                    <div className="relative h-44 w-full bg-surface-900 overflow-hidden">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-[10px] font-bold uppercase text-gray-200">{item.isVeg ? "Veg" : "Non-Veg"}</span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[11px] font-semibold text-gray-300">
                        <Clock size={12} className="text-orange-400" /> {item.prepTimeMinutes || 15}m
                      </div>
                    </div>

                    {/* Item Body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-orange-400 transition-colors">
                          {item.name}
                        </h3>
                        <span className="font-black text-white text-lg flex-shrink-0">
                          ₹{item.price}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description || "Freshly cooked cloud kitchen delicacy crafted with premium ingredients."}
                      </p>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {item.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-gray-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add to cart footer */}
                  <div className="p-4 pt-0">
                    {inCart > 0 ? (
                      <div className="flex items-center justify-between bg-orange-500/15 border border-orange-500/40 rounded-xl px-3 py-1.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-orange-400 hover:text-white transition-colors">
                          <Minus size={15} />
                        </button>
                        <span className="font-black text-orange-400 text-sm">{inCart} in Cart</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-orange-400 hover:text-white transition-colors">
                          <Plus size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-orange-500 active:scale-98 text-gray-200 hover:text-white font-semibold text-xs border border-white/10 hover:border-orange-500 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Add to Cart
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Cart Drawer Modal ─── */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-[#13131c] border-l border-white/10 h-full flex flex-col z-10 shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-orange-400" />
                  <h2 className="font-bold text-white text-base">Your Order Cart</h2>
                  <span className="text-xs text-gray-400">({cartItemCount} items)</span>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
                  <X size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartList.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <ShoppingBag size={42} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm">Your cart is currently empty.</p>
                    <p className="text-xs mt-1">Explore our chef special menu and add delicious food!</p>
                  </div>
                ) : (
                  cartList.map(({ item, quantity }) => (
                    <div key={item.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-white text-sm">₹{item.price * quantity}</span>
                        <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1 border border-white/10">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 text-gray-400 hover:text-white">
                            <Minus size={13} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-white">{quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 text-gray-400 hover:text-white">
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Checkout Form */}
                {cartList.length > 0 && isCheckingOut && (
                  <form id="checkout-form" onSubmit={handlePlaceOrder} className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider text-orange-400">
                        Delivery & Contact Details
                      </h3>
                      {isCustomerLoggedIn && (
                        <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-semibold">
                          Profile Synced
                        </span>
                      )}
                    </div>

                    {!isCustomerLoggedIn && (
                      <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs">
                        <span className="text-gray-300">Already registered?</span>
                        <Link to="/customer/login" className="text-orange-400 font-bold hover:underline flex items-center gap-1">
                          Sign In for faster checkout <ChevronRight size={12} />
                        </Link>
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1 font-medium">Your Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarthak Chaudhari"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1 font-medium">Mobile Phone (10 digits) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1 font-medium">Delivery Address *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Flat No, Building, Street, Landmark, Pune"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1 font-medium">Special Instructions (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Less spicy, ring the bell"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1 font-medium">Payment Method *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("ONLINE_SIMULATED")}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                            paymentMethod === "ONLINE_SIMULATED"
                              ? "bg-orange-500/20 border-orange-500 text-orange-400"
                              : "bg-[#181824] border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <CreditCard size={15} />
                          <div>
                            <p>Instant UPI / Card</p>
                            <span className="text-[10px] opacity-70">Simulated Demo</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("COD")}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                            paymentMethod === "COD"
                              ? "bg-orange-500/20 border-orange-500 text-orange-400"
                              : "bg-[#181824] border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <Banknote size={15} />
                          <div>
                            <p>Cash on Delivery</p>
                            <span className="text-[10px] opacity-70">Pay on arrival</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Bill Details & Place Order */}
              {cartList.length > 0 && (
                <div className="p-4 border-t border-white/10 bg-[#101018] space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Packaging Charges</span>
                    <span>₹{packagingFee}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Delivery Fee {subtotal >= 500 && <span className="text-green-400">(FREE)</span>}</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>GST Taxes (5%)</span>
                    <span>₹{gstTax}</span>
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex justify-between font-black text-white text-base">
                    <span>Grand Total</span>
                    <span className="text-orange-400">₹{grandTotal}</span>
                  </div>

                  {!isCheckingOut ? (
                    <button
                      onClick={() => setIsCheckingOut(true)}
                      className="w-full mt-3 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <span>Proceed to Delivery & Payment</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      form="checkout-form"
                      type="submit"
                      disabled={isPlacingOrder}
                      className="w-full mt-3 py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-98 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <ShieldCheck size={18} />
                      {isPlacingOrder ? "Placing Order..." : `Confirm & Pay ₹${grandTotal}`}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Order Placed Modal ─── */}
      <AnimatePresence>
        {placedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161622] border border-orange-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4 text-green-400">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black text-white">Order Confirmed!</h2>
              <p className="text-gray-400 text-xs mt-1">
                Your order has been transmitted directly to the kitchen display queue.
              </p>

              <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/5 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Number:</span>
                  <span className="font-mono font-bold text-orange-400">{placedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="font-bold text-white">₹{placedOrder.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="font-bold text-green-400">{placedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Delivery:</span>
                  <span className="font-bold text-white">25–35 mins</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/track/${placedOrder.orderNumber}`)}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                >
                  <span>Track Live Order Status</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setPlacedOrder(null)}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Live Active Order Bar (Swiggy / Zomato style) ─── */}
      {currentActiveOrder && !['DELIVERED', 'CANCELLED'].includes(currentActiveOrder.status) && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#191924]/95 border border-orange-500/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 uppercase">Live Order</span>
                <span className="text-xs font-mono font-bold text-white truncate">{currentActiveOrder.orderNumber}</span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                ₹{currentActiveOrder.total} • Status: <span className="text-orange-400 font-semibold">{currentActiveOrder.status}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate(`/track/${currentActiveOrder.orderNumber}`)}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
            >
              Track <ArrowRight size={12} />
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("cloudchef_latest_order");
                setActiveOrder(null);
              }}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
