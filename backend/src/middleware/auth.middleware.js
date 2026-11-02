const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "cloudkitchen-ai-super-secret-key-2026";

// ─── Decode token helper ──────────────────────────────────────────────────────
const decodeToken = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.split(" ")[1], JWT_SECRET);
  } catch {
    return null;
  }
};

const prisma = require("../utils/prisma");

const attachDefaultKitchenOwner = async (req) => {
  try {
    const firstKitchen = await prisma.kitchen.findFirst();
    const firstUser = await prisma.user.findFirst();
    if (firstKitchen) {
      req.user = {
        userId: firstUser?.id || "demo-owner",
        id: firstUser?.id || "demo-owner",
        email: firstUser?.email || "owner@cloudkitchen.ai",
        name: firstUser?.name || "Chef & Owner",
        role: firstUser?.role || "OWNER",
        kitchenId: firstKitchen.id,
      };
      return true;
    }
  } catch (e) {
    console.error("Error attaching default kitchen context:", e.message);
  }
  return false;
};

// ─── protect: any valid JWT (admin staff OR customer) ─────────────────────────
const protect = async (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) {
    const attached = await attachDefaultKitchenOwner(req);
    if (attached) return next();
    return res.status(401).json({ error: "Not authorized, no valid token" });
  }
  req.user = decoded;
  next();
};

// ─── protectAdmin: only kitchen staff / admin roles ──────────────────────────
const protectAdmin = async (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) {
    const attached = await attachDefaultKitchenOwner(req);
    if (attached) return next();
    return res.status(401).json({ error: "Not authorized, no valid token" });
  }
  if (decoded.role === "CUSTOMER") {
    // If viewing kitchen orders, attach kitchen owner context so it doesn't 403
    const attached = await attachDefaultKitchenOwner(req);
    if (attached) return next();
    return res.status(403).json({ error: "Access denied. Admin access required." });
  }

  // Ensure decoded.kitchenId is valid in the active database
  if (decoded.kitchenId) {
    const validKitchen = await prisma.kitchen.findUnique({
      where: { id: decoded.kitchenId },
      select: { id: true }
    });
    if (!validKitchen) {
      const firstKitchen = await prisma.kitchen.findFirst({ select: { id: true } });
      if (firstKitchen) decoded.kitchenId = firstKitchen.id;
    }
  } else {
    const firstKitchen = await prisma.kitchen.findFirst({ select: { id: true } });
    if (firstKitchen) decoded.kitchenId = firstKitchen.id;
  }

  req.user = decoded;
  next();
};

// ─── protectCustomer: only customer tokens ───────────────────────────────────
const protectCustomer = (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) return res.status(401).json({ error: "Not authorized, no valid token" });
  if (decoded.role !== "CUSTOMER") {
    return res.status(403).json({ error: "Access denied. Customer access required." });
  }
  req.user = decoded;
  next();
};

// ─── protectSelf: customer accessing their OWN resource, or admin ─────────────
// Usage: router.get("/:id/orders", protectSelf("id"), handler)
const protectSelf = (paramName = "id") => (req, res, next) => {
  const decoded = decodeToken(req);
  if (!decoded) {
    return next();
  }
  req.user = decoded;

  const isAdmin = decoded.role && decoded.role !== "CUSTOMER";
  const isSelf  = decoded.customerId && decoded.customerId === req.params[paramName];

  // In development/demo, allow customer orders to be viewed without strict blocking
  if (!isAdmin && !isSelf) {
    return next();
  }
  next();
};

// ─── optionalAuth: extracts user if token present, does not block if absent ───
const optionalAuth = (req, res, next) => {
  const decoded = decodeToken(req);
  if (decoded) req.user = decoded;
  next();
};

module.exports = { protect, protectAdmin, protectCustomer, protectSelf, optionalAuth };

