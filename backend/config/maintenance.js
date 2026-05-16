const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';
const MAINTENANCE_MESSAGE = process.env.MAINTENANCE_MESSAGE || "The platform is under maintenance. We'll be back soon.";
const MAINTENANCE_ESTIMATED_TIME = process.env.MAINTENANCE_ESTIMATED_TIME || "30 minutes";

module.exports = {
  isMaintenanceMode: MAINTENANCE_MODE,
  message: MAINTENANCE_MESSAGE,
  estimatedTime: MAINTENANCE_ESTIMATED_TIME,
  allowedPaths: ['/api/auth', '/api/maintenance', '/api/health', '/socket.io']
};