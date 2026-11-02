const prisma = require('../utils/prisma');
const sseService = require('../services/sse.service');
const asyncHandler = require('../utils/asyncHandler');

// Helper to get kitchen ID safely
const getKitchenId = async (req) => {
  if (req.user && req.user.kitchenId) return req.user.kitchenId;
  const firstKitchen = await prisma.kitchen.findFirst();
  return firstKitchen ? firstKitchen.id : null;
};

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { search } = req.query;

  const rawSuppliers = await prisma.supplier.findMany({
    where: {
      kitchenId,
      isActive: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
    },
    include: {
      purchaseOrders: {
        where: { status: { in: ['DRAFT', 'SENT', 'CONFIRMED'] } },
        select: { id: true, status: true, total: true, expectedAt: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Map to frontend-friendly fields
  const suppliers = rawSuppliers.map(s => ({
    ...s,
    purchaseOrders: s.purchaseOrders?.map(po => ({
      ...po,
      totalAmount: po.total,
      expectedDelivery: po.expectedAt
    })) || []
  }));

  res.json(suppliers);
});

// @desc    Create a supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { name, contactPerson, contactName, email, phone, address } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Supplier name is required');
  }

  // Duplicate check
  const existing = await prisma.supplier.findFirst({
    where: { kitchenId, name: { equals: name, mode: 'insensitive' }, isActive: true }
  });
  if (existing) {
    res.status(409);
    throw new Error(`Supplier '${name}' already exists`);
  }

  const supplier = await prisma.supplier.create({
    data: {
      kitchenId,
      name,
      contactPerson: contactPerson || contactName || null,
      email: email || null,
      phone: phone || null,
      address: address || null
    }
  });

  sseService.broadcast('SUPPLIER_UPDATED', { action: 'CREATED', data: supplier }, kitchenId);
  res.status(201).json(supplier);
});

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { id } = req.params;
  const updates = req.body;

  // Normalize contactPerson if sent as contactName
  if (updates.contactName && !updates.contactPerson) {
    updates.contactPerson = updates.contactName;
    delete updates.contactName;
  }

  const supplier = await prisma.supplier.update({
    where: { id, kitchenId },
    data: updates
  });

  sseService.broadcast('SUPPLIER_UPDATED', { action: 'UPDATED', data: supplier }, kitchenId);
  res.json(supplier);
});

// @desc    Soft delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplier = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { id } = req.params;

  await prisma.supplier.update({
    where: { id, kitchenId },
    data: { isActive: false }
  });

  sseService.broadcast('SUPPLIER_UPDATED', { action: 'DELETED', id }, kitchenId);
  res.json({ message: 'Supplier deactivated', id });
});

// @desc    Get purchase orders
// @route   GET /api/suppliers/purchase-orders
// @access  Private
const getPurchaseOrders = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      supplier: { kitchenId }
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true
    },
    orderBy: { orderedAt: 'desc' },
    take: 50,
  });

  const formatted = pos.map(p => ({
    ...p,
    totalAmount: p.total,
    expectedDelivery: p.expectedAt
  }));

  res.json(formatted);
});

// @desc    Create a purchase order
// @route   POST /api/suppliers/purchase-orders
// @access  Private
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const kitchenId = await getKitchenId(req);
  const { supplierId, items, expectedDelivery, notes } = req.body;

  if (!supplierId || !items?.length) {
    res.status(400);
    throw new Error('Supplier and at least one item are required');
  }

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.pricePerUnit || i.unitPrice || 0) * parseFloat(i.quantity || 1)), 0);
  const count = await prisma.purchaseOrder.count();
  const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      orderNumber,
      total: parseFloat(totalAmount.toFixed(2)),
      expectedAt: expectedDelivery ? new Date(expectedDelivery) : null,
      notes: notes || null,
      status: 'SENT',
      items: {
        create: items.map(i => ({
          ingredientName: i.ingredientName || i.name || 'Raw Ingredient',
          quantity:     parseFloat(i.quantity || 1),
          unit:         i.unit || 'kg',
          pricePerUnit: parseFloat(i.pricePerUnit || i.unitPrice || 0),
          total:        parseFloat(((parseFloat(i.pricePerUnit || i.unitPrice || 0)) * (parseFloat(i.quantity || 1))).toFixed(2)),
        }))
      }
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true
    }
  });

  sseService.broadcast('SUPPLIER_UPDATED', { action: 'PO_CREATED', data: po }, kitchenId);
  res.status(201).json({
    ...po,
    totalAmount: po.total,
    expectedDelivery: po.expectedAt
  });
});

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder
};
