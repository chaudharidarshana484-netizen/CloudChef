const express = require("express");
const router = express.Router();
const c = require("../controllers/customer.controller");
const { protect, protectAdmin, protectSelf } = require("../middleware/auth.middleware");

// Admin-only: list all customers, create, update, delete
router.get("/",           protectAdmin, c.getCustomers);
router.post("/",          protectAdmin, c.createCustomer);
router.put("/:id",        protectAdmin, c.updateCustomer);
router.delete("/:id",     protectAdmin, c.deleteCustomer);

// A customer can see their own orders; admin can see any customer orders
router.get("/:id/orders", protectSelf("id"), c.getCustomerOrders);

module.exports = router;
