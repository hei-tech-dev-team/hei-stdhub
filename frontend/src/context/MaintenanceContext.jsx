import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const MaintenanceContext = createContext();

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenance must be used within a MaintenanceProvider");
  }
  return context;
};

/**
 * Maintenance Provider
 * Checks maintenance status on app startup and provides global state
 */
export const MaintenanceProvider = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkMaintenanceStatus = async () => {
    try {
      // TODO: We'll create this endpoint in backend later
      const res = await api.get("/status");

      const { maintenance, message, estimatedTime: time } = res.data;

      setIsMaintenance(maintenance || false);
      setMaintenanceMessage(message || "");
      setEstimatedTime(time || null);

      // If maintenance is active and user is not on maintenance page, redirect
      if (maintenance && !window.location.pathname.includes("/maintenance")) {
        window.location.href = "/maintenance";
      }
    } catch (err) {
      // If endpoint doesn't exist yet, we assume no maintenance
      console.warn("Could not fetch maintenance status");
      setIsMaintenance(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMaintenanceStatus();

    // Optional: refresh status every 5 minutes
    const interval = setInterval(checkMaintenanceStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MaintenanceContext.Provider
      value={{
        isMaintenance,
        maintenanceMessage,
        estimatedTime,
        checkMaintenanceStatus,
        loading,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};