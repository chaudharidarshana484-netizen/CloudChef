const express = require("express");
const router = express.Router();
const c = require("../controllers/order.controller");
const { protectAdmin, optionalAuth } = require("../middleware/auth.middleware");

// ─── Specific Routes (MUST BE BEFORE /:id) ────────────────────────────────────
router.get("/live-queue",          protectAdmin, c.getLiveQueue);         // Live kitchen order queue
router.get("/track/:orderNumber",  c.trackOrder);                         // Public order tracking by order number
router.get("/",                    protectAdmin, c.getOrders);            // Full admin order list
router.post("/",                   optionalAuth, c.createOrder);          // Customer or staff places order

// ─── Parameterized Routes ─────────────────────────────────────────────────────
router.post("/:id/feedback",       optionalAuth, c.submitFeedback);       // Post-delivery rating and feedback
router.patch("/:id/cancel",        optionalAuth, c.cancelOrder);          // Customer or staff cancellation
router.patch("/:id/status",        protectAdmin, c.updateOrderStatus);    // Admin status transitions
router.get("/:id",                 c.getOrderById);                       // Single order details (public tracking)

module.exports = router;
