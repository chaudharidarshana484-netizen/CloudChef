import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Plus, Mail, Phone, Star, 
  TrendingUp, Loader2, Edit2, Trash2, X, ChevronDown,
  ShoppingBag, Eye, Clock, CheckCircle2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { customerService } from "../services/api";
import { EmptyState, ErrorState } from "../components/ui/EmptyState";

const CUSTOMERS_QUERY_KEY = ["customers"];

const SEGMENT_CONFIG = {
  Loyal:    { badge: "badge-success", minOrders: 20 },
  Regular:  { badge: "badge-info",    minOrders: 5 },
  "At Risk":{ badge: "badge-warning", minOrders: 1 },
  New:      { badge: "badge-brand",   minOrders: 0 },
};

const SEGMENTS = ["All", "Loyal", "Regular", "At Risk", "New"];

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

// ─── Add/Edit Customer Modal ──────────────────────────────────────────────────
function CustomerModal({ open, onClose, initial = EMPTY_FORM, onSave, isSaving }) {
  const [form, setForm] = useState(initial);
  const f = (key) => e => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const valid = form.name.trim().length >= 2;

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card p-6 w-full max-w-md space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-bold text-white text-lg">{initial.id ? "Edit Customer" : "Add Customer"}</h3>
          <button onClick={onClose} disabled={isSaving} className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Full Name *</label>
            <input value={form.name} onChange={f("name")} placeholder="Customer name" className="input w-full" autoFocus disabled={isSaving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Phone</label>
              <input value={form.phone} onChange={f("phone")} placeholder="+91 98765..." className="input w-full" disabled={isSaving} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input value={form.email} onChange={f("email")} type="email" placeholder="email@..." className="input w-full" disabled={isSaving} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Address</label>
            <input value={form.address} onChange={f("address")} placeholder="Delivery address" className="input w-full" disabled={isSaving} />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/5">
          <button onClick={onClose} disabled={isSaving} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!valid || isSaving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : (initial.id ? "Save Changes" : "Add Customer")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────
function ConfirmDelete({ customer, onClose, onConfirm, isDeleting }) {
  if (!customer) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-6 w-full max-w-sm space-y-4 shadow-2xl border border-red-500/20"
      >
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-white text-lg">Remove Customer?</h3>
          <p className="text-gray-400 text-sm">
            Are you sure you want to remove <span className="text-white font-medium">{customer.name}</span>? Their order history will be preserved but personal data will be anonymized.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isDeleting} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="btn-primary flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 flex items-center justify-center gap-2">
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── View Customer Orders Modal ──────────────────────────────────────────────
function CustomerOrdersModal({ customer, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customerOrders", customer?.id],
    queryFn: () => customerService.getOrders(customer.id),
    enabled: !!customer?.id
  });

  if (!customer) return null;
  const orders = data?.data?.orders || [];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card p-6 w-full max-w-2xl max-h-[85vh] flex flex-col space-y-4 shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-500" />
              Orders by {customer.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Phone: {customer.phone || "—"} • {customer.address || "No address saved"}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block">Total Orders</span>
            <span className="text-lg font-bold text-white">{customer.totalOrders || orders.length}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block">Total Spent</span>
            <span className="text-lg font-bold text-brand-400">₹{(customer.totalSpent || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <span className="text-[11px] text-gray-400 block">Loyalty Points</span>
            <span className="text-lg font-bold text-yellow-400">{customer.loyaltyPoints || 0} pts</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[45vh]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <p className="text-xs">Fetching order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No orders found for this customer yet.
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm font-mono">{order.orderNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {order.status}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                      {order.orderSource}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {order.items?.map(it => `${it.quantity}× ${it.menuItem?.name || 'Dish'}`).join(", ")}
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {new Date(order.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <div className="text-right sm:flex-shrink-0">
                  <span className="text-base font-bold text-white">₹{order.total?.toFixed(0)}</span>
                  <span className="text-[11px] text-gray-400 block capitalize">{order.paymentMethod?.toLowerCase()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="btn-secondary px-5">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────
export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState("");
  const [segment, setSegment]     = useState("All");
  const [addOpen, setAddOpen]     = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewOrdersCustomer, setViewOrdersCustomer] = useState(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: CUSTOMERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await customerService.getAll();
      return data?.customers || data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawCustomers = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    return rawCustomers.filter(c => {
      const matchSeg = segment === "All" || c.segment === segment;
      const matchSearch = !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      return matchSeg && matchSearch;
    });
  }, [rawCustomers, search, segment]);

  const stats = useMemo(() => ({
    total:   rawCustomers.length,
    loyal:   rawCustomers.filter(c => c.segment === "Loyal").length,
    avgSpent: rawCustomers.length
      ? Math.round(rawCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0) / rawCustomers.length)
      : 0,
    newThisMonth: rawCustomers.filter(c => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  }), [rawCustomers]);

  // ─── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => customerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      toast.success("Customer added successfully");
      setAddOpen(false);
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        toast.error(err.response.data.error || "Customer already exists");
      } else {
        toast.error("Failed to add customer");
      }
    },
    onSettled: () => setIsSaving(false),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      toast.success("Customer updated");
      setEditItem(null);
    },
    onError: () => toast.error("Failed to update customer"),
    onSettled: () => setIsSaving(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customerService.delete ? customerService.delete(id) : customerService.update(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      toast.success("Customer removed");
      setDeleteItem(null);
    },
    onError: () => toast.error("Failed to remove customer"),
    onSettled: () => setIsDeleting(false),
  });

  const handleSave = (form) => {
    setIsSaving(true);
    if (editItem?.id) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    deleteMutation.mutate(deleteItem.id);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-brand-400" /> Customer Directory
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage customer relationships and segments</p>
        </div>
        <button onClick={() => { setEditItem(null); setAddOpen(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Customers",  value: rawCustomers.length, icon: Users,      color: "text-blue-400 bg-blue-500/10" },
          { label: "Loyal Customers",  value: stats.loyal,         icon: Star,       color: "text-yellow-400 bg-yellow-500/10" },
          { label: "Avg. Spent",       value: `₹${stats.avgSpent.toLocaleString()}`, icon: TrendingUp, color: "text-green-400 bg-green-500/10" },
          { label: "New This Month",   value: stats.newThisMonth,  icon: Plus,       color: "text-brand-400 bg-brand-500/10" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{isLoading ? "—" : value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="input pl-8 text-sm h-10 w-full"
          />
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/5 overflow-x-auto">
          {SEGMENTS.map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${segment === s ? "bg-brand-500 text-white shadow-glow" : "text-gray-400 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3">
          <Loader2 size={24} className="animate-spin text-brand-500" />
          <p className="text-sm">Loading customers...</p>
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} className="card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={rawCustomers.length === 0 ? "No customers yet" : "No customers match your filter"}
          message={rawCustomers.length === 0 ? "Add your first customer to start tracking loyalty and order history." : "Try adjusting your search or segment filter."}
          actionLabel={rawCustomers.length === 0 ? "Add Customer" : undefined}
          onAction={() => setAddOpen(true)}
          secondaryLabel={rawCustomers.length > 0 ? "Clear Filters" : undefined}
          onSecondaryAction={() => { setSearch(""); setSegment("All"); }}
          className="card"
        />
      ) : (
        <motion.div className="card overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Customers table">
              <thead>
                <tr className="table-head">
                  <th className="table-cell" scope="col">Customer</th>
                  <th className="table-cell hidden sm:table-cell" scope="col">Contact</th>
                  <th className="table-cell" scope="col">Orders</th>
                  <th className="table-cell hidden md:table-cell" scope="col">Total Spent</th>
                  <th className="table-cell hidden lg:table-cell" scope="col">Last Order</th>
                  <th className="table-cell" scope="col">Segment</th>
                  <th className="table-cell" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((c, i) => (
                    <motion.tr key={c.id} className="table-row"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {c.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{c.name}</p>
                            <p className="text-xs text-gray-500 font-mono">#{c.id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell hidden sm:table-cell">
                        <div className="space-y-1">
                          {c.phone && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Phone size={11} />{c.phone}</div>}
                          {c.email && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Mail size={11} />{c.email}</div>}
                        </div>
                      </td>
                      <td className="table-cell font-medium text-white">{c.totalOrders || 0}</td>
                      <td className="table-cell hidden md:table-cell font-semibold text-white">₹{(c.totalSpent || 0).toLocaleString("en-IN")}</td>
                      <td className="table-cell hidden lg:table-cell text-gray-400 text-sm">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${SEGMENT_CONFIG[c.segment]?.badge || "badge-info"}`}>{c.segment || "New"}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewOrdersCustomer(c)}
                            className="btn-ghost p-1.5 rounded-lg text-brand-400 hover:text-brand-300"
                            title="View Customer Orders"
                            aria-label={`View ${c.name}'s orders`}
                          >
                            <ShoppingBag size={14} />
                          </button>
                          <button
                            onClick={() => { setEditItem(c); setAddOpen(true); }}
                            className="btn-ghost p-1.5 rounded-lg"
                            title="Edit Customer"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteItem(c)}
                            className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-300"
                            title="Delete Customer"
                            aria-label={`Delete ${c.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {addOpen && (
          <CustomerModal
            open={addOpen}
            onClose={() => { setAddOpen(false); setEditItem(null); }}
            initial={editItem || EMPTY_FORM}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewOrdersCustomer && (
          <CustomerOrdersModal
            customer={viewOrdersCustomer}
            onClose={() => setViewOrdersCustomer(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmDelete
        customer={deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
