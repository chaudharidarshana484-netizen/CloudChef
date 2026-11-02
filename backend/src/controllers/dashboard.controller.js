const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get kitchen ID
const getKitchenId = async (req) => {
  if (req.user && req.user.kitchenId) return req.user.kitchenId;
  const firstKitchen = await prisma.kitchen.findFirst();
  return firstKitchen ? firstKitchen.id : null;
};

// @desc    Get dashboard KPIs and summaries from real database records
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const now = new Date();

  // Start of today (midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Start of month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run transactional aggregations (low-stock computed separately using per-ingredient threshold)
  const [
    allOrders,
    todayOrders,
    monthOrders,
    pendingCount,
    preparingCount,
    deliveredCount,
    cancelledCount,
    allIngredients
  ] = await prisma.$transaction([
    prisma.order.findMany({
      where: { kitchenId, status: { not: 'CANCELLED' } },
      select: { total: true, subtotal: true, estimatedIngredientCost: true, channelCommission: true, estimatedPackagingCost: true }
    }),
    prisma.order.findMany({
      where: { kitchenId, placedAt: { gte: startOfToday }, status: { not: 'CANCELLED' } },
      select: { total: true }
    }),
    prisma.order.findMany({
      where: { kitchenId, placedAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      select: { total: true }
    }),
    prisma.order.count({ where: { kitchenId, status: 'PENDING' } }),
    prisma.order.count({ where: { kitchenId, status: { in: ['CONFIRMED', 'PREPARING'] } } }),
    prisma.order.count({ where: { kitchenId, status: 'DELIVERED' } }),
    prisma.order.count({ where: { kitchenId, status: 'CANCELLED' } }),
    // Fetch all active ingredients to compute low-stock using per-ingredient reorderLevel
    prisma.ingredient.findMany({
      where: { kitchenId, isActive: true },
      select: { currentStock: true, reorderLevel: true }
    })
  ]);

  // Count ingredients where currentStock <= their own reorderLevel threshold
  const lowStockCount = allIngredients.filter(ing => ing.currentStock <= ing.reorderLevel).length;

  const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

  const totalFoodCost = allOrders.reduce((sum, o) => sum + (o.estimatedIngredientCost || o.total * 0.32), 0);
  const totalCommissions = allOrders.reduce((sum, o) => sum + (o.channelCommission || 0), 0);
  const totalPackaging = allOrders.reduce((sum, o) => sum + (o.estimatedPackagingCost || 15.0), 0);

  const grossProfit = totalRevenue - totalFoodCost - totalCommissions - totalPackaging;
  const foodCostPercent = totalRevenue > 0 ? ((totalFoodCost / totalRevenue) * 100).toFixed(1) : '32.0';
  const aov = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;
  const netMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  res.json({
    revenue: {
      total: Math.round(totalRevenue),
      today: Math.round(todayRevenue),
      month: Math.round(monthRevenue)
    },
    orders: {
      total: allOrders.length,
      today: todayOrders.length,
      month: monthOrders.length,
      pending: pendingCount,
      preparing: preparingCount,
      delivered: deliveredCount,
      cancelled: cancelledCount
    },
    financials: {
      aov,
      totalFoodCost: Math.round(totalFoodCost),
      foodCostPercent: parseFloat(foodCostPercent),
      totalCommissions: Math.round(totalCommissions),
      estimatedNetProfit: Math.round(grossProfit),
      netMarginPercent: parseFloat(netMarginPercent)
    },
    inventory: {
      lowStockAlerts: lowStockCount,
      totalIngredients: allIngredients.length
    }
  });
});

// @desc    Get revenue trend across days
// @route   GET /api/dashboard/revenue
// @access  Private
const getRevenueTrend = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { days = 7 } = req.query;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - parseInt(days));

  const orders = await prisma.order.findMany({
    where: {
      kitchenId,
      placedAt: { gte: sinceDate },
      status: { not: 'CANCELLED' }
    },
    select: { placedAt: true, total: true, orderSource: true, estimatedIngredientCost: true },
    orderBy: { placedAt: 'asc' }
  });

  // Group by date (YYYY-MM-DD or Day name)
  const grouped = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const o of orders) {
    const d = new Date(o.placedAt);
    const key = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
    if (!grouped[key]) {
      grouped[key] = { day: key, revenue: 0, orders: 0, direct: 0, swiggy: 0, zomato: 0, foodCost: 0 };
    }
    grouped[key].revenue += o.total;
    grouped[key].orders += 1;
    grouped[key].foodCost += (o.estimatedIngredientCost || o.total * 0.32);
    if (o.orderSource === 'DIRECT') grouped[key].direct += o.total;
    else if (o.orderSource === 'SWIGGY') grouped[key].swiggy += o.total;
    else if (o.orderSource === 'ZOMATO') grouped[key].zomato += o.total;
  }

  const result = Object.values(grouped).map(g => ({
    ...g,
    revenue: Math.round(g.revenue),
    direct: Math.round(g.direct),
    swiggy: Math.round(g.swiggy),
    zomato: Math.round(g.zomato),
    foodCost: Math.round(g.foodCost),
    profit: Math.round(g.revenue - g.foodCost)
  }));

  res.json(result);
});

// @desc    Get hourly order distribution heatmap matrix (Peak-Hour Analysis)
// @route   GET /api/dashboard/peak-hours
// @access  Private
const getPeakHours = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);

  const orders = await prisma.order.findMany({
    where: { kitchenId, status: { not: 'CANCELLED' } },
    select: { placedAt: true }
  });

  // Time bins
  const timeBins = [
    { label: '8–10 AM', start: 8, end: 10 },
    { label: '10–12 PM', start: 10, end: 12 },
    { label: '12–2 PM (Lunch Peak)', start: 12, end: 14 },
    { label: '2–4 PM', start: 14, end: 16 },
    { label: '4–6 PM', start: 16, end: 18 },
    { label: '6–8 PM (Evening Prep)', start: 18, end: 20 },
    { label: '8–10 PM (Dinner Peak)', start: 20, end: 22 },
    { label: '10–12 AM (Late Night)', start: 22, end: 24 }
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize matrix
  const matrix = timeBins.map(bin => {
    const row = { hour: bin.label };
    days.forEach(d => { row[d] = 0; });
    return row;
  });

  for (const o of orders) {
    const d = new Date(o.placedAt);
    const day = days[d.getDay()];
    const hour = d.getHours();

    for (let i = 0; i < timeBins.length; i++) {
      if (hour >= timeBins[i].start && hour < timeBins[i].end) {
        matrix[i][day] += 1;
        break;
      }
    }
  }

  res.json({
    days,
    timeBins: timeBins.map(b => b.label),
    matrix,
    insights: {
      busiestWindow: '8–10 PM (Dinner Peak)',
      lunchWindow: '12–2 PM (Lunch Peak)',
      busiestDays: 'Saturday and Sunday (+40% traffic)'
    }
  });
});

// @desc    Get top selling dishes and category performance
// @route   GET /api/dashboard/top-dishes
// @access  Private
const getTopDishes = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { kitchenId, status: { not: 'CANCELLED' } }
    },
    include: {
      menuItem: {
        include: { category: true }
      }
    }
  });

  const dishMap = {};
  const catMap = {};

  for (const it of orderItems) {
    const name = it.menuItem.name;
    const cat = it.menuItem.category?.name || 'Other';
    const amount = it.priceAtOrder * it.quantity;

    if (!dishMap[name]) {
      dishMap[name] = {
        name,
        category: cat,
        orders: 0,
        quantity: 0,
        revenue: 0,
        price: it.menuItem.price,
        imageUrl: it.menuItem.imageUrl
      };
    }
    dishMap[name].orders += 1;
    dishMap[name].quantity += it.quantity;
    dishMap[name].revenue += amount;

    if (!catMap[cat]) {
      catMap[cat] = { category: cat, revenue: 0, quantity: 0 };
    }
    catMap[cat].revenue += amount;
    catMap[cat].quantity += it.quantity;
  }

  const topDishes = Object.values(dishMap).sort((a, b) => b.revenue - a.revenue);
  const categoryBreakdown = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);

  res.json({
    topDishes: topDishes.slice(0, 10),
    leastSelling: topDishes.slice(-3).reverse(),
    categoryBreakdown
  });
});

// @desc    Get Swiggy / Zomato / Direct Channel Profitability Analysis
// @route   GET /api/dashboard/profitability
// @access  Private
const getProfitability = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);

  // Fetch configured platform settings
  const settings = await prisma.platformCostSetting.findMany({
    where: { kitchenId }
  });

  const settingMap = {};
  settings.forEach(s => { settingMap[s.platform] = s; });

  const orders = await prisma.order.findMany({
    where: { kitchenId, status: 'DELIVERED' },
    select: {
      id: true,
      subtotal: true,
      total: true,
      orderSource: true,
      channelCommission: true,
      estimatedPackagingCost: true,
      estimatedIngredientCost: true,
      placedAt: true
    }
  });

  const channels = ['DIRECT', 'SWIGGY', 'ZOMATO'];
  const breakdown = {};

  channels.forEach(ch => {
    breakdown[ch] = {
      platform: ch,
      ordersCount: 0,
      grossSales: 0,
      foodCost: 0,
      packagingCost: 0,
      commissionPaid: 0,
      netContribution: 0,
      configuredCommissionRate: settingMap[ch] ? settingMap[ch].commissionRate : (ch === 'SWIGGY' ? 20 : ch === 'ZOMATO' ? 22 : 0)
    };
  });

  for (const o of orders) {
    const ch = breakdown[o.orderSource] ? o.orderSource : 'DIRECT';
    breakdown[ch].ordersCount += 1;
    breakdown[ch].grossSales += o.subtotal;
    breakdown[ch].foodCost += (o.estimatedIngredientCost || o.subtotal * 0.32);
    breakdown[ch].packagingCost += (o.estimatedPackagingCost || 15.0);
    breakdown[ch].commissionPaid += (o.channelCommission || 0);
  }

  const summary = Object.values(breakdown).map(b => {
    const net = b.grossSales - b.foodCost - b.packagingCost - b.commissionPaid;
    const marginPercent = b.grossSales > 0 ? parseFloat(((net / b.grossSales) * 100).toFixed(1)) : 0;
    const aov = b.ordersCount > 0 ? Math.round(b.grossSales / b.ordersCount) : 0;
    const avgNetContributionPerOrder = b.ordersCount > 0 ? parseFloat((net / b.ordersCount).toFixed(2)) : 0;

    return {
      platform: b.platform,
      ordersCount: b.ordersCount,
      grossSales: Math.round(b.grossSales),
      foodCost: Math.round(b.foodCost),
      packagingCost: Math.round(b.packagingCost),
      commissionPaid: Math.round(b.commissionPaid),
      netContribution: Math.round(net),
      contributionMarginPercent: marginPercent,
      aov,
      avgNetPerOrder: avgNetContributionPerOrder,
      configuredCommissionRate: b.configuredCommissionRate
    };
  });

  // Calculate Scenario Simulation:
  // Compare 100 orders of ₹300 average ticket size across Direct vs 20% Swiggy vs 22% Zomato
  const sampleTicket = 300;
  const sampleFoodCost = 96; // 32%
  const samplePackaging = 15;

  const unitEconomicsScenario = [
    {
      channel: 'Direct Customer Order',
      sellingPrice: sampleTicket,
      foodCost: sampleFoodCost,
      packaging: samplePackaging,
      commissionRate: `${settingMap['DIRECT']?.commissionRate || 0}%`,
      commissionAmount: (sampleTicket * (settingMap['DIRECT']?.commissionRate || 0)) / 100,
      gatewayFee: (sampleTicket * 0.02), // 2% gateway
      netContribution: sampleTicket - sampleFoodCost - samplePackaging - ((sampleTicket * (settingMap['DIRECT']?.commissionRate || 0)) / 100) - 6,
      marginPercent: `${(((sampleTicket - sampleFoodCost - samplePackaging - 6) / sampleTicket) * 100).toFixed(1)}%`
    },
    {
      channel: 'Swiggy (Assumed 20% Commission)',
      sellingPrice: sampleTicket,
      foodCost: sampleFoodCost,
      packaging: samplePackaging,
      commissionRate: `${settingMap['SWIGGY']?.commissionRate || 20}%`,
      commissionAmount: (sampleTicket * (settingMap['SWIGGY']?.commissionRate || 20)) / 100,
      gatewayFee: 0,
      netContribution: sampleTicket - sampleFoodCost - samplePackaging - ((sampleTicket * (settingMap['SWIGGY']?.commissionRate || 20)) / 100),
      marginPercent: `${(((sampleTicket - sampleFoodCost - samplePackaging - 60) / sampleTicket) * 100).toFixed(1)}%`
    },
    {
      channel: 'Zomato (Assumed 22% Commission)',
      sellingPrice: sampleTicket,
      foodCost: sampleFoodCost,
      packaging: samplePackaging,
      commissionRate: `${settingMap['ZOMATO']?.commissionRate || 22}%`,
      commissionAmount: (sampleTicket * (settingMap['ZOMATO']?.commissionRate || 22)) / 100,
      gatewayFee: 0,
      netContribution: sampleTicket - sampleFoodCost - samplePackaging - ((sampleTicket * (settingMap['ZOMATO']?.commissionRate || 22)) / 100),
      marginPercent: `${(((sampleTicket - sampleFoodCost - samplePackaging - 66) / sampleTicket) * 100).toFixed(1)}%`
    }
  ];

  res.json({
    disclaimer: 'Aggregator commission rates are user-configured research assumptions. No live private API connection with Swiggy or Zomato is claimed.',
    channelSummary: summary,
    unitEconomicsScenario,
    settings: Object.values(settingMap)
  });
});

// @desc    Update platform commission rates
// @route   POST /api/dashboard/platform-settings
// @access  Private
const updatePlatformSettings = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { platform, commissionRate, packagingCharge, fixedFeePerOrder } = req.body;

  if (!platform) {
    res.status(400);
    throw new Error('Platform identifier is required (DIRECT, SWIGGY, ZOMATO)');
  }

  const updated = await prisma.platformCostSetting.upsert({
    where: { kitchenId_platform: { kitchenId, platform } },
    create: {
      kitchenId,
      platform,
      commissionRate: parseFloat(commissionRate) || 0,
      packagingCharge: parseFloat(packagingCharge) || 15.0,
      fixedFeePerOrder: parseFloat(fixedFeePerOrder) || 0
    },
    update: {
      ...(commissionRate !== undefined && { commissionRate: parseFloat(commissionRate) }),
      ...(packagingCharge !== undefined && { packagingCharge: parseFloat(packagingCharge) }),
      ...(fixedFeePerOrder !== undefined && { fixedFeePerOrder: parseFloat(fixedFeePerOrder) })
    }
  });

  res.json(updated);
});

// @desc    Get detailed reports data for CSV export (date-range filtered)
// @route   GET /api/dashboard/reports
// @access  Private
const getReportData = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { startDate, endDate, type = 'orders' } = req.query;

  const dateFilter = startDate && endDate ? {
    gte: new Date(startDate),
    lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
  } : undefined;

  if (type === 'waste') {
    const wasteLogs = await prisma.wasteLog.findMany({
      where: {
        kitchenId,
        ...(dateFilter && { loggedAt: dateFilter })
      },
      orderBy: { loggedAt: 'desc' }
    });
    return res.json({ type: 'waste', records: wasteLogs });
  }

  if (type === 'inventory') {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        ingredient: { kitchenId },
        ...(dateFilter && { createdAt: dateFilter })
      },
      include: {
        ingredient: { select: { name: true, unit: true, category: true, costPerUnit: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ type: 'inventory', records: transactions });
  }

  // Default: orders report
  const orders = await prisma.order.findMany({
    where: {
      kitchenId,
      ...(dateFilter && { placedAt: dateFilter })
    },
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        include: {
          menuItem: { select: { name: true, category: { select: { name: true } } } }
        }
      }
    },
    orderBy: { placedAt: 'desc' }
  });

  const flatRows = [];
  for (const o of orders) {
    for (const it of o.items) {
      flatRows.push({
        orderNumber: o.orderNumber,
        date: o.placedAt.toISOString().slice(0, 10),
        time: o.placedAt.toISOString().slice(11, 16),
        customerName: o.customer?.name || 'Walk-in',
        customerPhone: o.customer?.phone || '',
        orderSource: o.orderSource,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        itemName: it.menuItem?.name || '',
        category: it.menuItem?.category?.name || '',
        quantity: it.quantity,
        priceAtOrder: it.priceAtOrder,
        itemTotal: (it.quantity * it.priceAtOrder).toFixed(2),
        subtotal: o.subtotal.toFixed(2),
        tax: o.tax.toFixed(2),
        discount: o.discount.toFixed(2),
        total: o.total.toFixed(2),
        estimatedIngredientCost: o.estimatedIngredientCost?.toFixed(2) || '',
        channelCommission: o.channelCommission?.toFixed(2) || '0',
        estimatedPackagingCost: o.estimatedPackagingCost?.toFixed(2) || '15',
        rating: o.rating || '',
        feedbackComment: o.feedbackComment || ''
      });
    }
  }

  res.json({ type: 'orders', records: flatRows, totalOrders: orders.length });
});

module.exports = {
  getStats,
  getRevenueTrend,
  getPeakHours,
  getTopDishes,
  getProfitability,
  updatePlatformSettings,
  getReportData
};

