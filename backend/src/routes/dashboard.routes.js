const express = require("express");
const router = express.Router();
const c = require("../controllers/dashboard.controller");
const { protectAdmin } = require("../middleware/auth.middleware");

router.get("/stats",               protectAdmin, c.getStats);
router.get("/revenue",             protectAdmin, c.getRevenueTrend);
router.get("/peak-hours",          protectAdmin, c.getPeakHours);
router.get("/top-dishes",          protectAdmin, c.getTopDishes);
router.get("/profitability",       protectAdmin, c.getProfitability);
router.get("/reports",             protectAdmin, c.getReportData);
router.post("/platform-settings",  protectAdmin, c.updatePlatformSettings);

module.exports = router;
