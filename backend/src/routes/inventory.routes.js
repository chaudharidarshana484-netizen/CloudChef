const express = require("express");
const router = express.Router();
const c = require("../controllers/inventory.controller");
const { protectAdmin } = require("../middleware/auth.middleware");

router.get("/low-stock",         protectAdmin, c.getLowStockAlerts);
router.get("/waste-analytics",   protectAdmin, c.getWasteAnalytics);
router.get("/waste-simulation",  protectAdmin, c.getWasteSimulation);
router.get("/transactions",      protectAdmin, c.getTransactions);
router.post("/waste-log",        protectAdmin, c.logWaste);

router.route("/")
  .get(protectAdmin, c.getInventory)
  .post(protectAdmin, c.createIngredient);

router.route("/:id")
  .put(protectAdmin, c.updateIngredient)
  .delete(protectAdmin, c.deleteIngredient);

router.post("/:id/stock",        protectAdmin, c.addStock);

module.exports = router;
