import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Database, IndianRupee, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dashboardService } from "../services/api";
import { useAuthStore } from "../stores/authStore";

const PLATFORMS = [
  { id: "DIRECT",  label: "Direct Orders",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  { id: "SWIGGY",  label: "Swiggy",               color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { id: "ZOMATO",  label: "Zomato",               color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profitData } = useQuery({
    queryKey: ["profitability"],
    queryFn: async () => { const r = await dashboardService.getProfitability(); return r.data; },
  });

  const settings = profitData?.settings || [];
  const getSettingFor = (platform) => settings.find(s => s.platform === platform) || {};

  const [platformForms, setPlatformForms] = useState({});
  const getForm = (platform) => platformForms[platform] || {
    commissionRate: getSettingFor(platform).commissionRate ?? (platform === "SWIGGY" ? 20 : platform === "ZOMATO" ? 22 : 0),
    packagingCharge: getSettingFor(platform).packagingCharge ?? 15,
    fixedFeePerOrder: getSettingFor(platform).fixedFeePerOrder ?? 0,
  };
  const setForm = (platform, key, value) => setPlatformForms(prev => ({
    ...prev,
    [platform]: { ...getForm(platform), [key]: value }
  }));

  const saveMutation = useMutation({
    mutationFn: ({ platform, data }) => dashboardService.updatePlatformSettings({ platform, ...data }),
    onSuccess: (_, { platform }) => {
      toast.success(`${platform} settings saved`);
      queryClient.invalidateQueries(["profitability"]);
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const TABS = [
    { id: "profile", label: "Profile & Account", icon: User },
    { id: "platform", label: "Platform Costs", icon: IndianRupee },
    { id: "kitchen", label: "Kitchen Details", icon: Database },
  ];

  return (
    <div className="page-content max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand-500/15 flex items-center justify-center">
            <SettingsIcon size={18} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-gray-500 text-sm">Manage your account, kitchen details, and platform cost assumptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1 text-sm">
          {TABS.map(t => {
            const TIcon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2.5 p-3 rounded-xl font-medium transition-all text-left ${activeTab === t.id ? "bg-brand-500/15 text-brand-400 border border-brand-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <TIcon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <motion.div className="md:col-span-3 space-y-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} key={activeTab}>
          {activeTab === "profile" && (
            <div className="card border border-white/10 p-6 space-y-5">
              <h2 className="text-base font-bold text-white border-b border-white/5 pb-3">Profile Information</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-2xl">
                  {user?.name?.[0]?.toUpperCase() || "A"}
                </div>
                <div>
                  <p className="font-bold text-white">{user?.name || "Admin User"}</p>
                  <p className="text-gray-400 text-sm">{user?.email || "admin@cloudkitchen.ai"}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 mt-1 inline-block">{user?.role || "OWNER"}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400">Full Name</label>
                  <input type="text" className="input" defaultValue={user?.name || ""} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400">Email (readonly)</label>
                  <input type="email" className="input" value={user?.email || ""} disabled readOnly />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400">Phone</label>
                  <input type="text" className="input" defaultValue={user?.phone || ""} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400">Role</label>
                  <input type="text" className="input" value={user?.role || ""} disabled readOnly />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => toast.success("Profile updated (UI demo — API coming soon)")}>
                  <Save size={14} /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "platform" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-2.5 text-xs text-yellow-300">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>These commission rates and fees are <strong>user-configured research assumptions</strong> and do not represent live Swiggy or Zomato API data. Clearly labelled as assumptions in all reports and research sections.</span>
              </div>

              {PLATFORMS.map(platform => {
                const form = getForm(platform.id);
                const isSaving = saveMutation.isPending && saveMutation.variables?.platform === platform.id;
                return (
                  <div key={platform.id} className={`card border p-5 space-y-4 ${platform.bg}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`font-bold text-base ${platform.color}`}>{platform.label}</h3>
                      {getSettingFor(platform.id).commissionRate !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} /> Configured</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Commission Rate (%)</label>
                        <input type="number" min="0" max="50" step="0.5" className="input text-sm"
                          value={form.commissionRate}
                          onChange={e => setForm(platform.id, "commissionRate", e.target.value)}
                          placeholder="e.g. 20" />
                        <p className="text-xs text-gray-600">Assumed % on gross sales</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Packaging Cost (₹)</label>
                        <input type="number" min="0" step="1" className="input text-sm"
                          value={form.packagingCharge}
                          onChange={e => setForm(platform.id, "packagingCharge", e.target.value)}
                          placeholder="15" />
                        <p className="text-xs text-gray-600">Per order packaging cost</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Fixed Fee/Order (₹)</label>
                        <input type="number" min="0" step="1" className="input text-sm"
                          value={form.fixedFeePerOrder}
                          onChange={e => setForm(platform.id, "fixedFeePerOrder", e.target.value)}
                          placeholder="0" />
                        <p className="text-xs text-gray-600">Per-order flat fee (if applicable)</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        disabled={isSaving}
                        onClick={() => saveMutation.mutate({ platform: platform.id, data: { commissionRate: parseFloat(form.commissionRate) || 0, packagingCharge: parseFloat(form.packagingCharge) || 15, fixedFeePerOrder: parseFloat(form.fixedFeePerOrder) || 0 } })}
                        className={`btn-primary text-xs flex items-center gap-1.5 ${isSaving ? "opacity-60 cursor-not-allowed" : ""}`}>
                        <Save size={12} /> {isSaving ? "Saving..." : `Save ${platform.label} Settings`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "kitchen" && (
            <div className="card border border-white/10 p-6 space-y-5">
              <h2 className="text-base font-bold text-white border-b border-white/5 pb-3">Kitchen Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Kitchen Name", val: "CloudKitchen AI India" },
                  { label: "City", val: "Pune" },
                  { label: "Phone", val: "+91 98765 43210" },
                  { label: "Email", val: "contact@cloudchef.kitchen" },
                  { label: "GST (%)", val: "5" },
                  { label: "Timezone", val: "Asia/Kolkata" },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-sm text-gray-400">{f.label}</label>
                    <input type="text" className="input" defaultValue={f.val} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-400">Address</label>
                <textarea className="input resize-none h-20" defaultValue="Shop 14, Baner High Street, Pune, Maharashtra 411045" />
              </div>
              <div className="flex justify-end">
                <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => toast.success("Kitchen details updated (UI demo)")}>
                  <Save size={14} /> Save Kitchen Info
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
