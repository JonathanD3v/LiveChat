const express = require("express");
const router = express.Router();
const IntegrationController = require("../controllers/integrationController");

router.post("/auth-from-merchant", IntegrationController.authFromMerchant);

module.exports = router;
