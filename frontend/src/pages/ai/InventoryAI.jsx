import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Package, AlertTriangle, TrendingDown,
  RefreshCw, CheckCircle2, ShieldCheck, ArrowRight, HelpCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { aiService } from "../../services/api";

export default function InventoryAI() {
  const [horizon, setHorizon] = useState(7);

  // Fetch real recipe-driven ingredient forecasts from FastAPI ML service
  const { data: invData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["inventoryAIForecast", horizon],
    queryFn: async () => {
      const res = await aiService.forecastInventory({ horizon_days: horizon });
      return res.data;
    }
  });

  const purchaseSuggestions = invData?.purchase_suggestions || [];
  const dishBreakdown = invData?.dish_ingredient_breakdown || [];

  const shortageCount = purchaseSuggestions.filter(p => p.estimated_shortage > 0).length;
  const totalSuggestedCost = purchaseSuggestions.reduce((acc, p) => acc + (p.estimated_cost || 0), 0);

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Brain size={18} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Ingredient Requirement Prediction</h1>
          </div>
          <p className="text-gray-400 text-xs">
            Automated Bills of Materials (BOM) explosion connecting ML demand forecasts with live ingredient inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 text-xs font-semibold">
            {[1, 7, 14, 30].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  horizon === h ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-white"
                }`}
              >
                {h}D Horizon
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            <span>Update Calculations</span>
          </button>
        </div>
      </div>

      {/* Assumptions Banner */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
        <HelpCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white">Policy Assumptions & Formula Transparency</p>
          <p className="mt-0.5 text-blue-300/90 leading-relaxed">
            {invData?.policy_assumptions || "Calculated using 2-day supplier lead time, Z=1.65 (95% service level) safety stock factor, and 15% buffer on suggested orders."}
          </p>
          <p className="text-[11px] text-blue-400/80 mt-1">
            Estimated Shortage = Max(0, Required Quantity + Safety Stock − Available Stock)
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 border border-white/5 bg-[#151522]">
          <p className="text-gray-400 text-xs font-medium">Ingredients Evaluated</p>
          <p className="text-2xl font-black text-white mt-1">{purchaseSuggestions.length}</p>
          <span className="text-[10px] text-gray-500 block mt-1">Active recipe raw materials</span>
        </div>
        <div className="card p-4 border border-white/5 bg-[#151522]">
          <p className="text-gray-400 text-xs font-medium">Stockout Risks</p>
          <p className={`text-2xl font-black mt-1 ${shortageCount > 0 ? "text-amber-400" : "text-green-400"}`}>
            {shortageCount} Items
          </p>
          <span className="text-[10px] text-gray-500 block mt-1">Shortage projected within {horizon} days</span>
        </div>
        <div className="card p-4 border border-white/5 bg-[#151522]">
          <p className="text-gray-400 text-xs font-medium">Estimated Purchase Capital</p>
          <p className="text-2xl font-black text-orange-400 mt-1">₹{Math.round(totalSuggestedCost)}</p>
          <span className="text-[10px] text-gray-500 block mt-1">Recommended procurement cost</span>
        </div>
        <div className="card p-4 border border-white/5 bg-[#151522]">
          <p className="text-gray-400 text-xs font-medium">Safety Stock Policy</p>
          <p className="text-xl font-bold text-blue-400 mt-1">Z = 1.65 (95%)</p>
          <span className="text-[10px] text-gray-500 block mt-1">Lead time: 2 days</span>
        </div>
      </div>

      {/* Suggested Purchase Recommendations Table (Requirement #5) */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Consolidated Ingredient Purchasing Recommendations</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Aggregated across all forecasted menu items for the next {horizon} days.
            </p>
          </div>
          {shortageCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle size={13} /> {shortageCount} Reorders Suggested
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="py-2.5 px-3">Ingredient</th>
                <th className="py-2.5 px-3">Required Qty</th>
                <th className="py-2.5 px-3">Available Stock</th>
                <th className="py-2.5 px-3">Safety Stock Buffer</th>
                <th className="py-2.5 px-3">Estimated Shortage</th>
                <th className="py-2.5 px-3">Suggested Purchase</th>
                <th className="py-2.5 px-3">Estimated Cost</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchaseSuggestions.map((p) => {
                const hasShortage = p.estimated_shortage > 0;
                return (
                  <tr key={p.ingredient} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">
                      {p.ingredient}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300">
                      {p.required_quantity} {p.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300">
                      {p.available_stock} {p.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-400">
                      +{p.safety_stock} {p.unit}
                    </td>
                    <td className={`py-3 px-3 font-mono font-bold ${hasShortage ? "text-red-400" : "text-green-400"}`}>
                      {p.estimated_shortage > 0 ? `${p.estimated_shortage} ${p.unit}` : "0"}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-orange-400">
                      {p.suggested_purchase > 0 ? `${p.suggested_purchase} ${p.unit}` : "None"}
                    </td>
                    <td className="py-3 px-3 font-mono text-white">
                      {p.estimated_cost > 0 ? `₹${p.estimated_cost}` : "₹0"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        hasShortage
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dish-by-Dish Recipe Breakdown Table (Explicit Requirement #5 format) */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <h3 className="text-base font-bold text-white mb-2">Recipe-Level BOM Breakdown Table</h3>
        <p className="text-gray-400 text-xs mb-4">
          Granular dish-to-ingredient consumption derived from recipes and predicted portions.
        </p>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#151522] z-10 border-b border-white/10 text-gray-400">
              <tr>
                <th className="py-2.5 px-3">Food Item</th>
                <th className="py-2.5 px-3">Predicted Orders</th>
                <th className="py-2.5 px-3">Ingredient</th>
                <th className="py-2.5 px-3">Portion Ratio</th>
                <th className="py-2.5 px-3">Required Quantity</th>
                <th className="py-2.5 px-3">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dishBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-semibold text-white">{row.food_item}</td>
                  <td className="py-2.5 px-3 font-mono text-orange-400 font-bold">{row.predicted_orders}</td>
                  <td className="py-2.5 px-3 text-gray-300">{row.ingredient}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">{row.quantity_per_portion}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{row.required_quantity}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-400">{row.available_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
