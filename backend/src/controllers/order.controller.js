const prisma = require('../utils/prisma');
const sseService = require('../services/sse.service');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get kitchen ID (validates that kitchenId exists in active DB)
const getKitchenId = async (req) => {
  if (req?.user?.kitchenId) {
    const exists = await prisma.kitchen.findUnique({
      where: { id: req.user.kitchenId },
      select: { id: true }
    });
    if (exists) return exists.id;
  }
  const firstKitchen = await prisma.kitchen.findFirst({ select: { id: true } });
  return firstKitchen ? firstKitchen.id : null;
};

// @desc    Get all orders with filtering and pagination
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { status, channel, search, startDate, endDate, limit = 50, page = 1 } = req.query;

  const where = {
    kitchenId,
    ...(status && status !== 'All' ? { status } : {}),
    ...(channel && channel !== 'All' ? { orderSource: channel } : {}),
    ...(startDate && endDate ? {
      placedAt: {
        gte: new Date(startDate),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    } : {}),
    ...(search ? {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ]
    } : {})
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: {
          include: { menuItem: { select: { id: true, name: true, price: true, imageUrl: true } } }
        }
      },
      orderBy: { placedAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    }),
    prisma.order.count({ where })
  ]);

  res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
});

// @desc    Get live order queue (Pending + Confirmed + Preparing + Ready)
// @route   GET /api/orders/live-queue
// @access  Private
const getLiveQueue = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const orders = await prisma.order.findMany({
    where: {
      kitchenId,
      status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true } },
      items: {
        include: { menuItem: { select: { id: true, name: true, prepTimeMinutes: true } } }
      }
    },
    orderBy: { placedAt: 'asc' },
  });
  res.json(orders);
});

// @desc    Get order by ID or orderNumber
// @route   GET /api/orders/:id
// @access  Public / Private
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id },
        { orderNumber: id }
      ]
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: {
            include: {
              recipe: {
                include: {
                  items: { include: { ingredient: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json(order);
});

// @desc    Track order live (public customer endpoint)
// @route   GET /api/orders/track/:orderNumber
// @access  Public
const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber },
        { id: orderNumber }
      ]
    },
    include: {
      customer: { select: { name: true, phone: true, address: true } },
      items: {
        include: {
          menuItem: { select: { name: true, price: true, imageUrl: true } }
        }
      }
    }
  });

  if (!order) {
    res.status(404);
    throw new Error(`Order ${orderNumber} not found.`);
  }

  // Construct status progression pipeline
  const workflow = [
    { status: 'PENDING', label: 'Order Placed', timestamp: order.placedAt, done: true },
    { status: 'CONFIRMED', label: 'Accepted by Kitchen', timestamp: order.confirmedAt, done: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
    { status: 'PREPARING', label: 'Preparing Food', timestamp: order.confirmedAt, done: ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
    { status: 'READY', label: 'Ready for Pickup', timestamp: order.preparedAt, done: ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', timestamp: order.preparedAt, done: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
    { status: 'DELIVERED', label: 'Delivered', timestamp: order.deliveredAt, done: order.status === 'DELIVERED' },
  ];

  res.json({
    order,
    workflow,
    isCancelled: order.status === 'CANCELLED',
    canCancel: ['PENDING', 'CONFIRMED'].includes(order.status)
  });
});

// @desc    Create new order (Customer Storefront or Admin POS)
// @route   POST /api/orders
// @access  Public (Customer) / Private (Staff)
const createOrder = asyncHandler(async (req, res) => {
  const kitchenId = req.user?.kitchenId || (await getKitchenId(req));
  const {
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    items, // [{ menuItemId, quantity, notes }]
    orderSource = 'DIRECT',
    paymentMethod = 'COD',
    notes
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  // 1. Fetch menu items to calculate accurate prices
  const menuItemIds = items.map(it => it.menuItemId);
  const dbMenuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, kitchenId },
    include: {
      recipe: {
        include: { items: { include: { ingredient: true } } }
      }
    }
  });

  const menuItemMap = {};
  dbMenuItems.forEach(m => { menuItemMap[m.id] = m; });

  let subtotal = 0;
  let estimatedIngredientCost = 0;
  const orderItemsData = [];

  for (const item of items) {
    const dbItem = menuItemMap[item.menuItemId];
    if (!dbItem) {
      res.status(400);
      throw new Error(`Menu item not found: ${item.menuItemId}`);
    }
    if (!dbItem.isAvailable) {
      res.status(400);
      throw new Error(`Item '${dbItem.name}' is currently unavailable`);
    }

    const qty = parseInt(item.quantity) || 1;
    const priceAtOrder = dbItem.price;
    subtotal += priceAtOrder * qty;

    // Calculate recipe ingredient cost
    if (dbItem.recipe && dbItem.recipe.items) {
      for (const rItem of dbItem.recipe.items) {
        estimatedIngredientCost += (rItem.quantity * qty) * (rItem.ingredient.costPerUnit || 0);
      }
    } else {
      estimatedIngredientCost += priceAtOrder * qty * 0.30;
    }

    orderItemsData.push({
      menuItemId: dbItem.id,
      quantity: qty,
      priceAtOrder,
      notes: item.notes || null
    });
  }

  // 2. Lookup or create customer (with strict FK existence check)
  let customerId = null;
  if (req.user?.customerId) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { id: req.user.customerId, kitchenId }
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (customerName || customerEmail || deliveryAddress) {
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            ...(customerName ? { name: customerName } : {}),
            ...(customerEmail ? { email: customerEmail } : {}),
            ...(deliveryAddress ? { address: deliveryAddress } : {})
          }
        }).catch(() => {});
      }
    }
  }

  // If customer not found via token or token was stale, lookup/create by phone
  if (!customerId && customerPhone) {
    const rawPhone = String(customerPhone).trim();
    const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10); // last 10 digits
    let customer = await prisma.customer.findFirst({
      where: {
        kitchenId,
        OR: [
          { phone: rawPhone },
          ...(cleanDigits ? [
            { phone: cleanDigits },
            { phone: `+91 ${cleanDigits}` },
            { phone: { contains: cleanDigits } }
          ] : [])
        ]
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          kitchenId,
          name: customerName || 'Valued Customer',
          phone: rawPhone,
          email: customerEmail || null,
          address: deliveryAddress || null,
        }
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...(customerName && customerName !== 'Valued Customer' ? { name: customerName } : {}),
          ...(deliveryAddress ? { address: deliveryAddress } : {}),
          ...(customerEmail ? { email: customerEmail } : {})
        }
      }).catch(() => {});
    }
    customerId = customer.id;
  }

  // 3. Financial calculations
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const deliveryFee = orderSource === 'DIRECT' ? 30 : 0;
  const total = subtotal + tax + deliveryFee;

  // Platform commission
  const platformSetting = await prisma.platformCostSetting.findUnique({
    where: { kitchenId_platform: { kitchenId, platform: orderSource } }
  });
  const commissionRate = platformSetting ? platformSetting.commissionRate : (orderSource === 'SWIGGY' ? 20 : orderSource === 'ZOMATO' ? 22 : 0);
  const channelCommission = parseFloat(((subtotal * commissionRate) / 100).toFixed(2));
  const estimatedPackagingCost = 15.0;

  // 4. Safely verify createdById (only set if user exists in DB to prevent P2003 FK error)
  let createdById = null;
  if (req.user?.userId) {
    const validUser = await prisma.user.findFirst({
      where: { id: req.user.userId, kitchenId }
    });
    if (validUser) createdById = validUser.id;
  }

  // 5. Generate collision-proof unique order number
  const totalOrdersCount = await prisma.order.count({ where: { kitchenId } });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let orderNumber = `CC-${dateStr}-${String(totalOrdersCount + 1).padStart(4, '0')}`;
  let attempt = 1;
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    orderNumber = `CC-${dateStr}-${String(totalOrdersCount + attempt).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    attempt++;
  }

  // 6. Create Order transactionally
  const newOrder = await prisma.order.create({
    data: {
      kitchenId,
      customerId,
      createdById,
      orderNumber,
      status: 'PENDING',
      orderSource,
      paymentMethod,
      paymentStatus: paymentMethod === 'ONLINE_SIMULATED' ? 'COMPLETED' : 'PENDING',
      subtotal,
      tax,
      total,
      deliveryAddress,
      notes,
      estimatedTime: 25,
      stockDeducted: false,
      channelCommission,
      estimatedPackagingCost,
      estimatedIngredientCost: parseFloat(estimatedIngredientCost.toFixed(2)),
      items: {
        create: orderItemsData
      }
    },
    include: {
      customer: true,
      items: {
        include: { menuItem: true }
      }
    }
  });

  // Increment customer stats (CRM)
  if (customerId) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total },
        loyaltyPoints: { increment: Math.max(1, Math.floor(total / 50)) }
      }
    }).catch(err => console.error('Error updating customer metrics:', err));
  }

  // Broadcast live SSE notification to kitchen dashboard
  sseService.broadcast('ORDER_CREATED', { action: 'CREATED', data: newOrder }, kitchenId);

  res.status(201).json({
    message: 'Order placed successfully',
    order: newOrder
  });
});

// @desc    Update order status with Recipe-based Smart Inventory Deduction
// @route   PATCH /api/orders/:id/status
// @access  Private (Staff/Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Fetch current order with its items and recipes
  const currentOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: {
            include: {
              recipe: {
                include: { items: { include: { ingredient: true } } }
              }
            }
          }
        }
      }
    }
  });

  if (!currentOrder) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (req.user?.kitchenId && currentOrder.kitchenId !== req.user.kitchenId) {
    res.status(403);
    throw new Error('Unauthorized to update order for another kitchen');
  }

  const kitchenId = currentOrder.kitchenId;

  // Cancellation rule enforcement: Cannot cancel once out for delivery or delivered
  if (status === 'CANCELLED') {
    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(currentOrder.status)) {
      res.status(400);
      throw new Error(`Cannot cancel order once it is '${currentOrder.status}'.`);
    }
  }

  const now = new Date();
  const updateData = { status };

  // Set workflow timestamps
  if (status === 'CONFIRMED' && !currentOrder.confirmedAt) updateData.confirmedAt = now;
  if (status === 'PREPARING' && !currentOrder.confirmedAt) updateData.confirmedAt = now;
  if (status === 'READY') updateData.preparedAt = now;
  if (status === 'DELIVERED') updateData.deliveredAt = now;
  if (status === 'CANCELLED') {
    updateData.cancelledAt = now;
    if (cancellationReason) updateData.cancellationReason = cancellationReason;
    if (currentOrder.paymentStatus === 'COMPLETED' && currentOrder.paymentMethod === 'ONLINE_SIMULATED') {
      updateData.paymentStatus = 'REFUNDED';
    }
  }

  // ─── SMART INVENTORY DEDUCTION (Requirement #3) ───
  // Deduct stock when order is accepted/preparing, preventing duplicate deduction
  if (['CONFIRMED', 'PREPARING', 'READY'].includes(status) && !currentOrder.stockDeducted) {
    console.log(`🍳 Processing recipe-based stock deduction for order ${currentOrder.orderNumber}...`);
    for (const item of currentOrder.items) {
      const recipe = item.menuItem.recipe;
      if (recipe && recipe.items && recipe.items.length > 0) {
        for (const rItem of recipe.items) {
          const qtyRequired = rItem.quantity * item.quantity;
          // Decrement ingredient currentStock
          await prisma.ingredient.update({
            where: { id: rItem.ingredientId },
            data: {
              currentStock: { decrement: qtyRequired }
            }
          });
          // Log audit inventory transaction
          await prisma.inventoryTransaction.create({
            data: {
              ingredientId: rItem.ingredientId,
              type: 'CONSUMPTION',
              quantity: -qtyRequired,
              notes: `Order ${currentOrder.orderNumber} - ${item.quantity}x ${item.menuItem.name}`
            }
          });
        }
      }
    }
    updateData.stockDeducted = true;
  }

  // ─── RESTOCK ON CANCELLATION ───
  // If order was cancelled after stock was deducted, safely restore ingredient stock
  if (status === 'CANCELLED' && currentOrder.stockDeducted) {
    console.log(`🔄 Restocking ingredients for cancelled order ${currentOrder.orderNumber}...`);
    for (const item of currentOrder.items) {
      const recipe = item.menuItem.recipe;
      if (recipe && recipe.items && recipe.items.length > 0) {
        for (const rItem of recipe.items) {
          const qtyToRestore = rItem.quantity * item.quantity;
          await prisma.ingredient.update({
            where: { id: rItem.ingredientId },
            data: {
              currentStock: { increment: qtyToRestore }
            }
          });
          await prisma.inventoryTransaction.create({
            data: {
              ingredientId: rItem.ingredientId,
              type: 'ADJUSTMENT',
              quantity: qtyToRestore,
              notes: `Restocked from cancelled order ${currentOrder.orderNumber}`
            }
          });
        }
      }
    }
    updateData.stockDeducted = false;
  }

  // Update order record
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      items: {
        include: { menuItem: true }
      }
    }
  });

  sseService.broadcast('ORDER_UPDATED', { action: 'STATUS_CHANGED', data: updatedOrder }, kitchenId);
  res.json(updatedOrder);
});

// @desc    Cancel order shorthand
// @route   PATCH /api/orders/:id/cancel
// @access  Public / Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = 'Cancelled by customer' } = req.body;
  req.body = { status: 'CANCELLED', cancellationReason: reason };
  return updateOrderStatus(req, res);
});

// @desc    Submit customer feedback and rating
// @route   POST /api/orders/:id/feedback
// @access  Public
const submitFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5 stars');
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true }
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      rating: parseInt(rating),
      feedbackComment: comment || null
    }
  });

  if (order.customerId) {
    await prisma.feedback.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        rating: parseInt(rating),
        comment: comment || null
      }
    });
  }

  res.json({ message: 'Thank you for your feedback!', order: updatedOrder });
});

module.exports = {
  getOrders,
  getLiveQueue,
  getOrderById,
  trackOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  submitFeedback
};
