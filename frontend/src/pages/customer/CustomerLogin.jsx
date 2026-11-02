import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Phone, User, MapPin, Mail,
  ArrowRight, Eye, EyeOff, LogIn, UserPlus, ShoppingBag
} from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "../../services/api";
import { useCustomerStore } from "../../stores/customerStore";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { login } = useCustomerStore();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginPhone, setLoginPhone] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const phone = loginPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      setLoading(true);
      const res = await authService.customerLogin({ phone });
      login(res.data.customer, res.data.token);
      toast.success(`Welcome back, ${res.data.customer.name || "Guest"}!`);
      navigate("/order");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim()) { toast.error("Please enter your full name."); return; }
    const phone = regPhone.replace(/\D/g, "");
    if (phone.length < 10) { toast.error("Please enter a valid 10-digit mobile number."); return; }
    try {
      setLoading(true);
      const res = await authService.customerRegister({
        name: regName,
        phone: regPhone,
        email: regEmail || undefined,
        address: regAddress || undefined,
      });
      login(res.data.customer, res.data.token);
      toast.success(`Welcome to CloudChef, ${res.data.customer.name}!`);
      navigate("/order");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 mb-4">
            <ChefHat size={32} className="text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">CloudChef</h1>
          <p className="text-gray-400 text-sm mt-1">Order fresh food, delivered to your door</p>
        </div>

        {/* Card */}
        <div className="bg-[#13131f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Tab switcher */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === "login" ? "text-orange-400 border-b-2 border-orange-500 bg-orange-500/5" : "text-gray-500 hover:text-gray-300"}`}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === "register" ? "text-orange-400 border-b-2 border-orange-500 bg-orange-500/5" : "text-gray-500 hover:text-gray-300"}`}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <p className="text-gray-400 text-xs mb-4">
                    Sign in with your registered mobile number to access your orders and profile.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Phone size={13} /> Mobile Number
                    </label>
                    <input
                      type="tel"
                      className="input w-full text-sm"
                      placeholder="+91 98765 43210"
                      value={loginPhone}
                      onChange={e => setLoginPhone(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-gray-600">We use your phone number as your login ID.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 font-bold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                    ) : (
                      <><LogIn size={16} /> Sign In &amp; Order<ArrowRight size={14} /></>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-600 mt-2">
                    New here?{" "}
                    <button type="button" onClick={() => setMode("register")} className="text-orange-400 hover:text-orange-300 font-semibold">
                      Create a free account
                    </button>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleRegister}
                  className="space-y-3.5"
                >
                  <p className="text-gray-400 text-xs mb-2">
                    Create your account to save your address, track orders, and get personalised recommendations.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <User size={13} /> Full Name <span className="text-red-400">*</span>
                    </label>
                    <input type="text" className="input w-full text-sm" placeholder="Darshana Chaudhari"
                      value={regName} onChange={e => setRegName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Phone size={13} /> Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <input type="tel" className="input w-full text-sm" placeholder="+91 98765 43210"
                      value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Mail size={13} /> Email <span className="text-gray-600 text-xs">(optional)</span>
                    </label>
                    <input type="email" className="input w-full text-sm" placeholder="you@email.com"
                      value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <MapPin size={13} /> Delivery Address <span className="text-gray-600 text-xs">(optional)</span>
                    </label>
                    <textarea className="input w-full text-sm resize-none h-16" placeholder="Flat 201, Sunshine Apartments, Baner, Pune - 411045"
                      value={regAddress} onChange={e => setRegAddress(e.target.value)} />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 font-bold mt-1"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</span>
                    ) : (
                      <><UserPlus size={16} /> Create Account &amp; Order</>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-600 mt-2">
                    Already registered?{" "}
                    <button type="button" onClick={() => setMode("login")} className="text-orange-400 hover:text-orange-300 font-semibold">
                      Sign in
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Skip auth */}
        <div className="text-center mt-6 space-y-2">
          <Link to="/order" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            <ShoppingBag size={14} />
            Browse menu without signing in
            <ArrowRight size={12} />
          </Link>
          <div className="border-t border-white/5 pt-4">
            <Link to="/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Kitchen Staff / Admin Login →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
