import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import useAuth from "../hooks/useAuth.js";
import { supabase } from "../utils/supabaseClient.js";

const AlertContext = createContext();

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function AlertProvider({ children }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const {
        data: { session },
      } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = session?.access_token;
      if (!token) return;

      const res = await axios.get(`${SERVER_URL}/api/market/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(res.data.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 2 hours as per requirements
    const interval = setInterval(fetchAlerts, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, loading, refreshAlerts: fetchAlerts, dismissAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
}
