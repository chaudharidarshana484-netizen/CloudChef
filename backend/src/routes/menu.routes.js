const express = require("express");
const router = express.Router();
const c = require("../controllers/menu.controller");
const { protectAdmin } = require("../middleware/auth.middleware");

// Public reads — customer storefront uses these
router.get("/",              c.getMenu);
router.get("/recipes",       c.getRecipes);
router.get("/:id",           c.getMenuItem);

// Admin write operations
router.post("/",             protectAdmin, c.createMenuItem);
router.put("/:id",           protectAdmin, c.updateMenuItem);
router.delete("/:id",        protectAdmin, c.deleteMenuItem);
router.patch("/:id/availability", protectAdmin, c.toggleAvailability);
router.post("/recipes",      protectAdmin, c.saveRecipe);

module.exports = router;
