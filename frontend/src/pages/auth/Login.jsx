import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowRight, Zap, Shield, TrendingUp,
  ChefHat, User, Phone, MapPin, Mail, LogIn, UserPlus,
  Utensils, Sparkles
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore";
import { useCustomerStore } from "../../stores/customerStore";
import { authService } from "../../services/api";
import { Logo } from "../../components/brand/Logo";
import { usePageTitle } from "../../components/brand/PageTitle";

const DEMO_ADMIN_EMAIL = "owner@cloudkitchen.ai";
const DEMO_ADMIN_PASSWORD = "password123";
const DEMO_CUSTOMER_PHONE = "9876543210";

const FEATURES = [
  { icon: Zap, text: "AI demand forecasting & dynamic pricing" },
  { icon: TrendingUp, text: "Automated recipe ingredient deduction" },
  { icon: Shield, text: "Dual-role JWT authentication" },
];

export default function Login() {
  usePageTitle("Sign In — CloudChef");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role: "kitchen" | "customer" (defaults to "kitchen" unless ?role=customer is passed)
  const [role, setRole] = useState(
    searchParams.get("role") === "customer" ? "customer" : "kitchen"
  );

  // Customer sub-mode: "login" | "register"
  const [customerMode, setCustomerMode] = useState("login");

  // Stores
  const adminLogin = useAuthStore((s) => s.login);
  const customerLogin = useCustomerStore((s) => s.login);

  // Kitchen State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const [kitchenError, setKitchenError] = useState("");

  // Customer State
  const [customerPhone, setCustomerPhone] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  // ─── Kitchen Login Handler ───
  const handleKitchenSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setKitchenError("Please enter both email and password.");
      return;
    }
    setKitchenLoading(true);
    setKitchenError("");
    try {
      const res = await authService.login({ email, password });
      const { user, token } = res.data;
      adminLogin(
        { id: user.id, name: user.name, email: user.email, role: user.role, kitchenId: user.kitchenId },
        token
      );
      toast.success(`Welcome back, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || "Invalid email or password.";
      setKitchenError(msg);
      toast.error(msg);
    } finally {
      setKitchenLoading(false);
    }
  };

  const fillKitchenDemo = () => {
    setEmail(DEMO_ADMIN_EMAIL);
    setPassword(DEMO_ADMIN_PASSWORD);
    setKitchenError("");
  };

  // ─── Customer Login Handler ───
  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setCustomerLoading(true);
    try {
      const res = await authService.customerLogin({ phone: cleanPhone });
      const { customer, token } = res.data;
      customerLogin(customer, token);
      toast.success(`Welcome, ${customer.name || "Valued Guest"}!`);
      navigate("/order");
    } catch (err) {
      toast.error(err.response?.data?.error || "Customer sign-in failed.");
    } finally {
      setCustomerLoading(false);
    }
  };

  // ─── Customer Registration Handler ───
  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    const cleanPhone = regPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setCustomerLoading(true);
    try {
      const res = await authService.customerRegister({
        name: regName.trim(),
        phone: cleanPhone,
        email: regEmail.trim() || undefined,
        address: regAddress.trim() || undefined,
      });
      const { customer, token } = res.data;
      customerLogin(customer, token);
      toast.success(`Account created! Welcome, ${customer.name}!`);
      navigate("/order");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed. Try again.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const fillCustomerDemo = () => {
    setCustomerPhone(DEMO_CUSTOMER_PHONE);
  };

  return (
    <div className="min-h-screen bg-surface-900 flex overflow-hidden" role="main">
      {/* ─── Left Panel — Branding & Visuals (Desktop) ─── */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-800 via-surface-900 to-surface-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <Logo size={44} />
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold mb-4">
              <Sparkles size={13} /> MCA Major Research Project
            </span>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Cloud Kitchen Management &amp; Optimization
            </h2>
            <p className="text-gray-400 text-base mt-4 leading-relaxed">
              Unified platform featuring AI-powered demand forecasting, smart dynamic pricing,
              and live customer storefront ordering.
            </p>
          </div>

          <div className="space-y-3.5 pt-4 border-t border-white/5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-brand-400">
                  <Icon size={16} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 pt-6 border-t border-white/5">
          <span>CloudChef Platform v1.0</span>
          <span>Role-Based Access Control</span>
        </div>
      </div>

      {/* ─── Right Panel — Interactive Role-Based Auth Form ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-surface-950 lg:bg-surface-900 relative overflow-y-auto max-h-screen">
        <div className="lg:hidden absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] relative z-10 py-6"
        >
          {/* Mobile Logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <Logo size={38} />
          </div>

          {/* Heading */}
          <div className="mb-6 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {role === "kitchen" ? "Kitchen Portal Sign In" : "Customer Sign In"}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              {role === "kitchen"
                ? "Manage recipes, orders, inventory & AI analytics"
                : "Order your favorite meals & track live orders"}
            </p>
          </div>

          {/* ─── Primary Role Tabs ─── */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 mb-6 gap-1">
            <button
              type="button"
              onClick={() => { setRole("kitchen"); setKitchenError(""); }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                role === "kitchen"
                  ? "bg-brand-500 text-white shadow-glow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ChefHat size={15} />
              <span>Cloud Kitchen</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                role === "customer"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User size={15} />
              <span>Customer Portal</span>
            </button>
          </div>

          {/* ─── 1. Cloud Kitchen Form ─── */}
          {role === "kitchen" && (
            <motion.div
              key="kitchen-panel"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Demo button */}
              <button
                type="button"
                onClick={fillKitchenDemo}
                className="w-full flex items-center justify-between px-3.5 py-2.5 mb-5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-left group hover:bg-brand-500/15 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center text-brand-400">
                    <Zap size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-400">Click to fill Demo Kitchen Login</p>
                    <p className="text-[10px] text-gray-500">{DEMO_ADMIN_EMAIL}</p>
                  </div>
                </div>
                <ArrowRight size={13} className="text-brand-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {kitchenError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {kitchenError}
                </div>
              )}

              <form onSubmit={handleKitchenSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 block">Staff / Owner Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@cloudkitchen.ai"
                    className="input w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">Password</label>
                    <span className="text-[11px] text-brand-400">Default: password123</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={kitchenLoading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-glow"
                >
                  {kitchenLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <>
                      <span>Sign In to Kitchen Dashboard</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <p className="text-xs text-gray-500">
                  Are you a customer wanting to place an order?{" "}
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className="text-orange-400 font-bold hover:underline"
                  >
                    Switch to Customer Sign In
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── 2. Customer Portal Form ─── */}
          {role === "customer" && (
            <motion.div
              key="customer-panel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Customer sub-modes: Sign In vs Register */}
              <div className="flex border-b border-white/10 mb-5">
                <button
                  type="button"
                  onClick={() => setCustomerMode("login")}
                  className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    customerMode === "login"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <LogIn size={13} />
                  <span>Returning Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("register")}
                  className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    customerMode === "register"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <UserPlus size={13} />
                  <span>New Customer Registration</span>
                </button>
              </div>

              {customerMode === "login" ? (
                <>
                  {/* Quick Fill Customer */}
                  <button
                    type="button"
                    onClick={fillCustomerDemo}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-left group hover:bg-orange-500/15 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-orange-500/20 flex items-center justify-center text-orange-400">
                        <Phone size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-orange-400">Click to fill Demo Customer Phone</p>
                        <p className="text-[10px] text-gray-500">+91 {DEMO_CUSTOMER_PHONE}</p>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <form onSubmit={handleCustomerLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300 block">Mobile Phone Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="9876543210"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="input w-full pl-11 font-mono text-sm"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">Instant sign-in with your registered mobile number.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={customerLoading}
                      className="btn-primary w-full py-3 bg-orange-500 hover:bg-orange-600 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-orange-500/20"
                    >
                      {customerLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Logging in...
                        </span>
                      ) : (
                        <>
                          <Utensils size={15} />
                          <span>Sign In &amp; Browse Menu</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleCustomerRegister} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300 block">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarthak Chaudhari"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="input w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300 block">Phone *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="input w-full text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300 block">Email (optional)</label>
                      <input
                        type="email"
                        placeholder="sarthak@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300 block">Delivery Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Flat 402, High Street Towers, Baner, Pune"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="input w-full text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={customerLoading}
                    className="btn-primary w-full py-2.5 bg-orange-500 hover:bg-orange-600 flex items-center justify-center gap-2 text-xs font-bold shadow-lg shadow-orange-500/20 mt-1"
                  >
                    {customerLoading ? (
                      <span>Creating Account...</span>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Register &amp; Start Ordering</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => navigate("/order")}
                  className="text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Utensils size={13} />
                  <span>Guest Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("kitchen")}
                  className="text-brand-400 font-semibold hover:underline"
                >
                  Kitchen Staff Login
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
