const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cloudkitchen-ai-super-secret-key-2026';

// Helper to get kitchen ID
const getKitchenId = async () => {
  const firstKitchen = await prisma.kitchen.findFirst();
  return firstKitchen ? firstKitchen.id : null;
};

// @desc    Staff / Admin login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { kitchen: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = jwt.sign(
      { userId: user.id, kitchenId: user.kitchenId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    delete user.passwordHash;

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// @desc    Customer Registration (Customer Module)
// @route   POST /api/auth/customer/register
// @access  Public
const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone number are required.' });
    }

    const kitchenId = await getKitchenId();

    let customer = await prisma.customer.findFirst({
      where: { kitchenId, phone }
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name,
          ...(email && { email }),
          ...(address && { address })
        }
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          kitchenId,
          name,
          phone,
          email: email || null,
          address: address || null
        }
      });
    }

    const token = jwt.sign(
      { customerId: customer.id, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Customer registered successfully',
      token,
      customer
    });
  } catch (error) {
    console.error('Customer Register Error:', error);
    res.status(500).json({ error: 'Failed to register customer' });
  }
};

// @desc    Customer Login by Phone
// @route   POST /api/auth/customer/login
// @access  Public
const customerLogin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const kitchenId = await getKitchenId();
    let customer = await prisma.customer.findFirst({
      where: { kitchenId, phone }
    });

    if (!customer) {
      // Auto-create customer profile on first sign-in
      customer = await prisma.customer.create({
        data: {
          kitchenId,
          name: 'Valued Customer',
          phone
        }
      });
    }

    const token = jwt.sign(
      { customerId: customer.id, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Customer authenticated',
      token,
      customer
    });
  } catch (error) {
    console.error('Customer Login Error:', error);
    res.status(500).json({ error: 'Customer login failed' });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { kitchen: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    delete user.passwordHash;
    res.json(user);
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  registerCustomer,
  customerLogin,
  getMe
};
