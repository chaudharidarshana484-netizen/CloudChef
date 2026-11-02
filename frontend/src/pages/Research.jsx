import { motion } from "framer-motion";
import {
  GraduationCap, BookOpen, BarChart2, ShieldCheck,
  AlertTriangle, Award, CheckCircle2, FileText, ArrowRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { researchService } from "../services/api";

export default function Research() {
  const { data: resData, isLoading } = useQuery({
    queryKey: ["researchEvaluation"],
    queryFn: async () => {
      const res = await researchService.getEvaluation();
      return res.data;
    }
  });

  const benchmarks = resData?.modelBenchmarks || [];

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <GraduationCap size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">MCA Major Research Evaluation</h1>
          </div>
          <p className="text-gray-400 text-xs">
            "CloudChef: Intelligent Cloud Kitchen Optimization using Machine Learning and Data Analytics"
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs">
          Academic Research Edition
        </span>
      </div>

      {/* Research Abstract & Objectives */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen size={18} className="text-purple-400" /> Abstract & Research Objectives
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed">
          Cloud kitchens operate exclusively through digital ordering platforms without physical storefronts, making demand predictability, automated inventory replenishment, and platform commission management critical determinants of operational viability. This MCA research project develops an integrated operational optimization platform leveraging empirical Machine Learning demand forecasting to dynamically drive recipe-based Bills of Materials (BOM) inventory deductions, minimize food waste, and evaluate aggregator unit economics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {resData?.objectives?.map((obj, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300">
              <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <span>{obj}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Description & Preprocessing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl space-y-3">
          <h3 className="text-base font-bold text-white">Dataset Characterization</h3>
          <p className="text-xs text-gray-400">
            Validated transactional time series from CloudKitchen AI India prototype.
          </p>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Total Order Records:</span>
              <span className="font-mono font-bold text-white">{resData?.datasetSummary?.totalOrderRecords || 623}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Catalog Menu Items:</span>
              <span className="font-mono font-bold text-white">{resData?.datasetSummary?.totalMenuItems || 8}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-400">Sampling Granularity:</span>
              <span className="text-gray-300">{resData?.datasetSummary?.granularity || "Daily and hourly buckets"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Data Leakage Guard:</span>
              <span className="font-bold text-green-400">Strict Chronological Holdout (80/20)</span>
            </div>
          </div>
        </div>

        <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl space-y-3">
          <h3 className="text-base font-bold text-white">Engineered Feature Space</h3>
          <p className="text-xs text-gray-400">
            Predictive features synthesized to capture temporal mealtime dynamics.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {resData?.datasetSummary?.featuresUsed?.map((feat, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-mono">
                {feat}
              </span>
            ))}
          </div>

          <div className="pt-2 text-xs text-gray-400 leading-relaxed">
            Temporal lag features (Lag-7 day volume and rolling 7-day moving averages) are constructed sequentially prior to training splits to ensure past data never references future periods.
          </div>
        </div>
      </div>

      {/* Model Benchmark Table */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-white">Empirical Model Comparison (Held-out Test Evaluation)</h3>
          <span className="text-xs text-gray-500 font-mono">Test Sample N = 125</span>
        </div>
        <p className="text-gray-400 text-xs mb-4">
          Experimental comparison across Seasonal-Naive Baseline, Random Forest Regressor, and Gradient Boosting Regressor.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3">MAE (Portions)</th>
                <th className="py-2.5 px-3">RMSE</th>
                <th className="py-2.5 px-3">MAPE (%)</th>
                <th className="py-2.5 px-3">R² Score</th>
                <th className="py-2.5 px-3">Hyperparameters</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {benchmarks.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-white">{m.modelName}</td>
                  <td className="py-3 px-3 font-mono font-bold text-orange-400">{m.mae}</td>
                  <td className="py-3 px-3 font-mono text-gray-300">{m.rmse}</td>
                  <td className="py-3 px-3 font-mono text-gray-300">{m.mape}%</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">{m.r2}</td>
                  <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">
                    {JSON.stringify(m.parameters)}
                  </td>
                  <td className="py-3 px-3">
                    {m.isBestModel ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold text-[10px] border border-green-500/30">
                        <Award size={12} /> Optimal (R²: {m.r2})
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[11px]">Baseline Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Research Limitations & Future Scope */}
      <div className="card p-6 border border-white/10 bg-[#151522] shadow-xl space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-400" /> Research Limitations & Future Scope
        </h3>
        <div className="space-y-2 text-xs text-gray-300">
          {resData?.limitations?.map((lim, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>{lim}</span>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>
              Future research will extend this model to multi-brand shared ghost kitchens, exploring cross-kitchen batching and deep LSTM/Transformer sequential forecasting architectures.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
