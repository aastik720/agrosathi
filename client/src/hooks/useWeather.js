import axios from "axios";
import { useCallback, useEffect, useState } from "react";

const REFRESH_INTERVAL = 30 * 60 * 1000;
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function cacheKey(location, language) {
  return `agrosathi_weather_${language || "hindi"}_${location || "Theog"}`;
}

function readCachedWeather(key) {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export default function useWeather(location, language = "hindi") {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = useCallback(async () => {
    const resolvedLocation = location || "Theog";
    const key = cacheKey(resolvedLocation, language);
    setLoading(true);
    setError(false);

    try {
      const [currentResponse, forecastResponse, alertsResponse] = await Promise.all([
        axios.get(`${SERVER_URL}/api/weather/current`, {
          params: { location: resolvedLocation, language },
        }),
        axios.get(`${SERVER_URL}/api/weather/forecast`, {
          params: { location: resolvedLocation, language },
        }),
        axios.get(`${SERVER_URL}/api/weather/alerts`, {
          params: { location: resolvedLocation, language },
        }),
      ]);

      const payload = {
        weather: currentResponse.data?.data || null,
        forecast: forecastResponse.data?.data || [],
        alerts: alertsResponse.data?.alerts || [],
        savedAt: new Date().toISOString(),
      };

      setWeather(payload.weather);
      setForecast(payload.forecast);
      setAlerts(payload.alerts);
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      const payload = readCachedWeather(key);
      if (payload) {
        setWeather(payload.weather || null);
        setForecast(payload.forecast || []);
        setAlerts(payload.alerts || []);
      } else {
        setWeather(null);
        setForecast([]);
        setAlerts([]);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [language, location]);

  useEffect(() => {
    const resolvedLocation = location || "Theog";
    const cached = readCachedWeather(cacheKey(resolvedLocation, language));

    if (cached) {
      setWeather(cached.weather || null);
      setForecast(cached.forecast || []);
      setAlerts(cached.alerts || []);
      setLoading(false);
    }

    fetchWeather();
    const timer = window.setInterval(fetchWeather, REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [fetchWeather]);

  return {
    weather,
    forecast,
    alerts,
    loading,
    error,
    refresh: fetchWeather,
  };
}
