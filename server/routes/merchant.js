const express = require("express");
const router = express.Router();
const merchantController = require("../controllers/merchantController");
const { isDev } = require("../middleware/dev");
const authMiddleware = require('../middleware/auth');

router.post("/create-merchant",authMiddleware,isDev, merchantController.createMerchant);
router.get("/merchants", authMiddleware,isDev, merchantController.getAllMerchants);
router.get("/merchant/:id",authMiddleware, isDev, merchantController.getMerchantById);
router.put("/merchant/:id",authMiddleware, isDev, merchantController.updateMerchant);
router.delete("/merchant/:id",authMiddleware, isDev, merchantController.deleteMerchant);


module.exports = router;