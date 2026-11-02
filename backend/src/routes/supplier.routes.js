const express = require("express");
const router = express.Router();
const c = require("../controllers/supplier.controller");
const { protectAdmin } = require("../middleware/auth.middleware");

router.get("/",           protectAdmin, c.getSuppliers);
router.post("/",          protectAdmin, c.createSupplier);
router.put("/:id",        protectAdmin, c.updateSupplier);
router.delete("/:id",     protectAdmin, c.deleteSupplier);

module.exports = router;
