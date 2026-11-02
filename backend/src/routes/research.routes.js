const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { protectAdmin } = require('../middleware/auth.middleware');

// @desc    Get Research & Experimental Evaluation benchmarks
// @route   GET /api/research/evaluation
// @access  Private
router.get('/evaluation', protectAdmin, asyncHandler(async (req, res) => {
  const kitchen = await prisma.kitchen.findFirst();
  const kitchenId = req.user?.kitchenId || (kitchen ? kitchen.id : null);

  const evaluations = await prisma.modelEvaluation.findMany({
    where: { kitchenId },
    orderBy: { mae: 'asc' }
  });

  const totalOrders = await prisma.order.count({ where: { kitchenId } });
  const totalItems = await prisma.menuItem.count({ where: { kitchenId } });

  res.json({
    researchTitle: 'CloudChef: Intelligent Cloud Kitchen Optimization using ML and Data Analytics',
    objectives: [
      'Empirical comparison of ML demand forecasting algorithms against historical moving average baseline',
      'Recipe-driven Bills of Materials (BOM) automated ingredient depletion and stockout mitigation',
      'Quantitative food waste reduction through dynamic demand alignment',
      'Unit economics and platform commission sensitivity analysis (Direct vs Aggregators)'
    ],
    datasetSummary: {
      totalOrderRecords: totalOrders,
      totalMenuItems: totalItems,
      granularity: 'Hourly and Daily aggregations',
      featuresUsed: ['Day of week', 'Hour of day', 'Is weekend flag', 'Is peak meal hour', 'Rolling 7-day average', 'Historical item velocity'],
      trainTestSplit: '80% Chronological Train, 20% Chronological Held-out Test (no data leakage)'
    },
    modelBenchmarks: evaluations,
    limitations: [
      'Weather and extreme local event data are simulated and require live API integration for production deployment',
      'Supplier delivery lead times assume deterministic 2-day SLA; stochastic variance is approximated using safety stock Z=1.65',
      'Aggregator commission rates are user-configured research assumptions based on typical Indian market contracts (18%-24%)'
    ]
  });
}));

module.exports = router;

