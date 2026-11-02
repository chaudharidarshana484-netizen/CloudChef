import { useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Package,
  Users, Truck, ChefHat, BarChart3, Settings, LogOut,
  TrendingUp, Brain, Trash2, Tag, Star, ChevronRight, X,
  IndianRupee, GraduationCap, ExternalLink, Compass
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { Logo } from "../brand/Logo";

const NAV_ITEMS = [
  { label: "Dashboard",       path: "/dashboard",     icon: LayoutDashboard },
  { label: "Orders",          path: "/orders",        icon: ShoppingBag },
  { label: "Menu",            path: "/menu",          icon: UtensilsCrossed },
  { label: "Inventory",       path: "/inventory",     icon: Package },
  { label: "Customers",       path: "/customers",     icon: Users },
  { label: "Suppliers",       path: "/suppliers",     icon: Truck },
  { label: "Kitchen Ops",     path: "/kitchen",       icon: ChefHat },
  { label: "Sales & Heatmap", path: "/reports",       icon: BarChart3 },
  { label: "Profitability",   path: "/profitability", icon: IndianRupee },
];

const AI_ITEMS = [
  { label: "Demand Forecast", path: "/ai/demand",          icon: TrendingUp },
  { label: "Inventory AI",    path: "/ai/inventory",       icon: Brain },
  { label: "Waste Predictor", path: "/ai/waste",           icon: Trash2 },
  { label: "Dynamic Pricing", path: "/ai/pricing",         icon: Tag },
  { label: "Recommendations", path: "/ai/recommendations", icon: Star },
];

const RESEARCH_ITEMS = [
  { label: "Research Evaluation", path: "/research", icon: GraduationCap },
];

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? "active" : ""}`
      }
      aria-current={({ isActive }) => isActive ? "page" : undefined}
    >
      <item.icon size={17} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (window.innerWidth < 768) onClose();
  }, [location.pathname]); // eslint-disable-line

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const avatar = user?.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <>
      {/* Backdrop — mobile only */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-40 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="
              fixed md:relative inset-y-0 left-0
              w-[260px] h-full
              flex flex-col
              bg-surface-800 border-r border-white/[0.06]
              shrink-0 z-50 md:z-auto
              shadow-2xl md:shadow-none
            "
            aria-label="Main navigation"
            role="navigation"
          >
            {/* ─── Logo ─── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <Logo size={36} />
              <button
                className="btn-icon md:hidden"
                onClick={onClose}
                aria-label="Close navigation menu"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* ─── Customer Storefront Quick-Switch Button ─── */}
            <div className="px-3 pt-3">
              <button
                onClick={() => navigate("/order")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-all text-xs font-bold shadow-md shadow-orange-500/10"
              >
                <span className="flex items-center gap-2">
                  <Compass size={15} /> Customer Storefront
                </span>
                <ExternalLink size={13} />
              </button>
            </div>

            {/* ─── Nav Links ─── */}
            <nav
              className="flex-1 overflow-y-auto scrollbar-none px-3 py-3 space-y-0.5"
              aria-label="Main menu"
            >
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.path} item={item} onClick={() => window.innerWidth < 768 && onClose()} />
              ))}

              {/* AI Section */}
              <div className="pt-4 pb-2 px-2" aria-label="AI modules section">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Brain size={11} aria-hidden="true" className="text-orange-400" /> AI & Optimization
                </p>
              </div>
              {AI_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? "active" : ""}`
                  }
                >
                  <item.icon size={16} aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <ChevronRight size={13} className="opacity-30 flex-shrink-0" aria-hidden="true" />
                </NavLink>
              ))}

              {/* Research Section */}
              <div className="pt-4 pb-2 px-2" aria-label="Research section">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <GraduationCap size={11} aria-hidden="true" className="text-purple-400" /> MCA Research
                </p>
              </div>
              {RESEARCH_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? "active" : ""}`
                  }
                >
                  <item.icon size={16} aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <ChevronRight size={13} className="opacity-30 flex-shrink-0" aria-hidden="true" />
                </NavLink>
              ))}
            </nav>

            {/* ─── Bottom: Settings + User ─── */}
            <div className="p-3 border-t border-white/[0.06] space-y-1 pb-safe">
              <NavLink
                to="/settings"
                className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
              >
                <Settings size={16} aria-hidden="true" />
                <span>Settings</span>
              </NavLink>

              {/* User Info Row */}
              <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div
                  className="w-8 h-8 rounded-lg bg-orange-500/25 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0"
                  aria-hidden="true"
                >
                  {avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {user?.name || "Kitchen Admin"}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate capitalize">
                    {user?.role?.toLowerCase() || "owner"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-icon text-gray-500 hover:text-red-400 flex-shrink-0"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
