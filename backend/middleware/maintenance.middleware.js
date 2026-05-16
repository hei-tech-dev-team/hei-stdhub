const maintenanceConfig = require('../config/maintenance');

const maintenanceMiddleware = (req, res, next) => {
  if (!maintenanceConfig.isMaintenanceMode) {
    return next();
  }

  // Allow specific paths even in maintenance mode
  if (maintenanceConfig.allowedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  res.status(503).json({
    success: false,
    error: "maintenance_mode",
    message: maintenanceConfig.message,
    estimatedTime: maintenanceConfig.estimatedTime,
    timestamp: new Date().toISOString()
  });
};

module.exports = maintenanceMiddleware;