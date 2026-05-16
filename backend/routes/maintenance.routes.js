const express = require('express');
const router = express.Router();
const maintenanceConfig = require('../config/maintenance');

router.get('/status', (req, res) => {
  res.json({
    success: true,
    maintenance: maintenanceConfig.isMaintenanceMode,
    message: maintenanceConfig.message,
    estimatedTime: maintenanceConfig.estimatedTime,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;