const prisma = require('../utils/prisma');
const sseService = require('../services/sse.service');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
  const kitchenId = req.user.kitchenId;
  const { search, segment, limit = 50, page = 1 } = req.query;

  const where = {
    kitchenId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    } : {})
  };

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { totalSpent: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    }),
    prisma.customer.count({ where })
  ]);

  // Compute segment dynamically
  const enriched = customers.map(c => ({
    ...c,
    segment: c.totalOrders === 0 ? 'New'
      : c.totalOrders >= 20 ? 'Loyal'
      : c.totalOrders >= 5  ? 'Regular'
      : 'At Risk',
  }));

  res.json({ customers: enriched, total });
});

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const kitchenId = req.user.kitchenId;
  const { name, email, phone, address } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Customer name is required');
  }

  // Duplicate phone check
  if (phone) {
    const existing = await prisma.customer.findFirst({ where: { kitchenId, phone } });
    if (existing) {
      res.status(409);
      throw new Error(`A customer with phone ${phone} already exists`);
    }
  }

  // Duplicate email check
  if (email) {
    const existing = await prisma.customer.findFirst({ where: { kitchenId, email: { equals: email, mode: 'insensitive' } } });
    if (existing) {
      res.status(409);
      throw new Error(`A customer with email ${email} already exists`);
    }
  }

  const customer = await prisma.customer.create({
    data: { kitchenId, name, email, phone, address }
  });

  sseService.broadcast('CUSTOMER_UPDATED', { action: 'CREATED', data: customer }, kitchenId);
  res.status(201).json(customer);
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  const kitchenId = req.user.kitchenId;
  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  const customer = await prisma.customer.update({
    where: { id, kitchenId },
    data: {
      ...(name    !== undefined && { name }),
      ...(email   !== undefined && { email }),
      ...(phone   !== undefined && { phone }),
      ...(address !== undefined && { address }),
    }
  });

  sseService.broadcast('CUSTOMER_UPDATED', { action: 'UPDATED', data: customer }, kitchenId);
  res.json(customer);
});

// @desc    Delete a customer (soft delete — anonymize data)
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = asyncHandler(async (req, res) => {
  const kitchenId = req.user.kitchenId;
  const { id } = req.params;

  // Soft delete — anonymize instead of permanent deletion to preserve order history integrity
  const customer = await prisma.customer.update({
    where: { id, kitchenId },
    data: {
      name:  '[Deleted Customer]',
      email: null,
      phone: null,
    }
  });

  sseService.broadcast('CUSTOMER_UPDATED', { action: 'DELETED', id }, kitchenId);
  res.json({ message: 'Customer data anonymized successfully', id: customer.id });
});

// @desc    Get orders for a specific customer (admin OR the customer themselves)
// @route   GET /api/customers/:id/orders
// @access  Admin or the owning Customer (via protectSelf)
const getCustomerOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 30, page = 1 } = req.query;

  // Lookup customer to get phone/email if possible
  let customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer && req.user?.customerId) {
    customer = await prisma.customer.findUnique({ where: { id: req.user.customerId } });
  }

  const where = {
    OR: [
      { customerId: id },
      ...(customer ? [{ customerId: customer.id }] : []),
      ...(customer?.phone ? [
        { customer: { phone: customer.phone } },
        { customer: { phone: customer.phone.replace(/^\+91\s*/, '') } }
      ] : [])
    ]
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, imageUrl: true } }
          }
        }
      },
      orderBy: { placedAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerOrders };

