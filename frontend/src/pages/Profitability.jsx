import { useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee, TrendingUp, Sliders, ShieldCheck,
  HelpCircle, ArrowUpRight, BarChart2, PieChart as PieIcon, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dashboardService } from "../services/api";

export default function Profitability() {
  const queryClient = useQueryClient();

  // Settings State for interactive simulator
  const [swiggyRate, setSwiggyRate] = useState("20.0");
  const [zomatoRate, setZomatoRate] = useState("22.0");
  const [packagingCost, setPackagingCost] = useState("15.0");

  const { data: profData, isLoading, refetch } = useQuery({
    queryKey: ["profitabilityAnalytics"],
    queryFn: async () => {
      const res = await dashboardService.getProfitability();
      return res.data;
    }
  });

  // Mutation to update platform settings
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ platform, commissionRate, packagingCharge }) => {
      return dashboardService.updatePlatformSettings({ platform, commissionRate, packagingCharge });
    },
    onSuccess: () => {
      toast.success("Platform commission assumptions updated!");
      queryClient.invalidateQueries(["profitabilityAnalytics"]);
      queryClient.invalidateQueries(["dashboardStats"]);
    },
    onError: () => {
      toast.error("Failed to update settings.");
    }
  });

  const handleSaveAssumptions = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ platform: "SWIGGY", commissionRate: parseFloat(swiggyRate), packagingCharge: parseFloat(packagingCost) });
    updateSettingsMutation.mutate({ platform: "ZOMATO", commissionRate: parseFloat(zomatoRate), packagingCharge: parseFloat(packagingCost) });
  };

  const channelSummary = profData?.channelSummary || [];
  const unitEconomics = profData?.unitEconomicsScenario || [];

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
              <IndianRupee size={18} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Aggregator Commission & Profitability Analysis</h1>
          </div>
          <p className="text-gray-400 text-xs">
            Unit economics and contribution margin comparison across Direct Orders, Swiggy, and Zomato.
          </p>
        </div>

        <button onClick={() => refetch()} className="btn-primary flex items-center gap-2 text-xs">
          <RefreshCw size={14} /> Refresh Financials
        </button>
      </div>

      {/* Transparency Disclaimer (Requirement #7) */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
        <HelpCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white">Academic Research & Demonstration Transparency Notice</p>
          <p className="mt-0.5 text-amber-300/90 leading-relaxed">
            {profData?.disclaimer || "Aggregator commission rates are user-configured research assumptions based on typical Indian market contracts (18%-24%). No live private API connection with Swiggy or Zomato is claimed."}
          </p>
        </div>
      </div>

      {/* Configurable Assumption Simulator Form */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Sliders size={18} className="text-orange-400" /> Configurable Cost Assumptions
        </h2>
        <p className="text-gray-400 text-xs mb-4">
          Adjust assumed aggregator take-rates and packaging overheads to simulate margin impact dynamically.
        </p>

        <form onSubmit={handleSaveAssumptions} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Swiggy Commission (%)</label>
            <input
              type="number"
              step="0.5"
              value={swiggyRate}
              onChange={(e) => setSwiggyRate(e.target.value)}
              className="w-full bg-[#1b1b2a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Zomato Commission (%)</label>
            <input
              type="number"
              step="0.5"
              value={zomatoRate}
              onChange={(e) => setZomatoRate(e.target.value)}
              className="w-full bg-[#1b1b2a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Packaging Cost Per Order (₹)</label>
            <input
              type="number"
              step="1"
              value={packagingCost}
              onChange={(e) => setPackagingCost(e.target.value)}
              className="w-full bg-[#1b1b2a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-md shadow-orange-500/20"
            >
              {updateSettingsMutation.isPending ? "Applying..." : "Update Assumptions"}
            </button>
          </div>
        </form>
      </div>

      {/* Multi-Channel Historical Breakdown Table */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">Channel-by-Channel Order Economics</h3>
        <p className="text-gray-400 text-xs mb-4">Calculated from actual database order records</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="py-2.5 px-3">Sales Channel</th>
                <th className="py-2.5 px-3">Delivered Orders</th>
                <th className="py-2.5 px-3">Gross Sales</th>
                <th className="py-2.5 px-3">Ingredient Cost</th>
                <th className="py-2.5 px-3">Packaging</th>
                <th className="py-2.5 px-3">Commissions Paid</th>
                <th className="py-2.5 px-3">Net Contribution</th>
                <th className="py-2.5 px-3">Margin %</th>
                <th className="py-2.5 px-3">Avg Net / Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {channelSummary.map((ch) => (
                <tr key={ch.platform} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      ch.platform === "DIRECT" ? "bg-green-500" : ch.platform === "SWIGGY" ? "bg-orange-500" : "bg-red-500"
                    }`} />
                    {ch.platform} ({ch.configuredCommissionRate}%)
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-300">{ch.ordersCount}</td>
                  <td className="py-3 px-3 font-mono font-bold text-white">₹{ch.grossSales}</td>
                  <td className="py-3 px-3 font-mono text-gray-400">₹{ch.foodCost}</td>
                  <td className="py-3 px-3 font-mono text-gray-400">₹{ch.packagingCost}</td>
                  <td className="py-3 px-3 font-mono text-red-400">₹{ch.commissionPaid}</td>
                  <td className="py-3 px-3 font-mono font-bold text-green-400">₹{ch.netContribution}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      ch.contributionMarginPercent > 50
                        ? "bg-green-500/20 text-green-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {ch.contributionMarginPercent}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">₹{ch.avgNetPerOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Unit Economics Comparison */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">Standardized ₹300 Order Unit Economics Scenario</h3>
        <p className="text-gray-400 text-xs mb-4">
          Direct order vs 20% Swiggy commission vs 22% Zomato commission on an identical customer basket.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {unitEconomics.map((u, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{u.channel}</span>
                <span className="text-xs font-mono font-bold text-orange-400">{u.marginPercent}</span>
              </div>
              <div className="space-y-1.5 text-xs text-gray-400 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span>Selling Price:</span>
                  <span className="text-white font-medium">₹{u.sellingPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Food / Ingredient Cost (32%):</span>
                  <span>-₹{u.foodCost}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging Box & Cutlery:</span>
                  <span>-₹{u.packaging}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Commission ({u.commissionRate}):</span>
                  <span className="text-red-400">-₹{u.commissionAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway / Fixed:</span>
                  <span>-₹{u.gatewayFee || 0}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5 font-black text-white text-sm">
                  <span>Net Contribution:</span>
                  <span className="text-green-400">₹{u.netContribution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
