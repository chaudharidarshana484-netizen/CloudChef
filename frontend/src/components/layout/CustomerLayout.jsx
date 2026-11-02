import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, ShoppingBag, ClipboardList, User, LogOut, Menu, X, Home, MapPin } from "lucide-react";
import { useCustomerStore } from "../../stores/customerStore";
import toast from "react-hot-toast";

export default function CustomerLayout({ children, cartCount = 0, onCartOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, isAuthenticated, logout } = useCustomerStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out. Come back soon!");
    navigate("/customer/login");
    setMobileMenuOpen(false);
  };

  const navItems = [
    { path: "/order", label: "Menu", icon: Home },
    ...(isAuthenticated ? [{ path: "/my-orders", label: "My Orders", icon: ClipboardList }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0d0d18]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d18]/95 backdrop-blur-md border-b border-white/5 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/order" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/30 transition-all">
              <ChefHat size={20} className="text-orange-400" />
            </div>
            <div>
              <span className="font-bold text-white text-lg leading-none">CloudChef</span>
              <span className="block text-xs text-orange-400 font-medium leading-none">Cloud Kitchen</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const ItemIcon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-orange-500/15 text-orange-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                  <ItemIcon size={15} />{item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Cart button */}
            {onCartOpen && (
              <button onClick={onCartOpen}
                className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/15 border border-orange-500/20 text-orange-400 hover:bg-orange-500/25 transition-all text-sm font-semibold">
                <ShoppingBag size={16} />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">{cartCount}</span>
                )}
              </button>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                  <div className="w-7 h-7 rounded-full bg-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm">
                    {customer?.name?.[0]?.toUpperCase() || "C"}
                  </div>
                  <span className="text-sm text-white font-medium max-w-[100px] truncate">{customer?.name}</span>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/customer/login"
                className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/20">
                <User size={15} /> Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-[#0d0d18] px-4 pb-4 overflow-hidden">
              <div className="pt-3 space-y-1">
                {navItems.map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                      <ItemIcon size={16} />{item.label}
                    </Link>
                  );
                })}
                {isAuthenticated ? (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400">
                      <div className="w-7 h-7 rounded-full bg-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm">
                        {customer?.name?.[0]?.toUpperCase() || "C"}
                      </div>
                      {customer?.name} ({customer?.phone})
                    </div>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                ) : (
                  <Link to="/customer/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-500/10 transition-all">
                    <User size={16} /> Sign In / Create Account
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
