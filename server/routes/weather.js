import axios from "axios";
import express from "express";
import { getCache, getFreshCache, setCache } from "../utils/cache.js";

const router = express.Router();
const CACHE_TTL = 30 * 60 * 1000;
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

function normalizeLocation(location = "Theog") {
  return String(location || "Theog").trim();
}

function uniqueItems(items) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function locationCandidates(location) {
  const normalized = normalizeLocation(location);
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [normalized];
  }

  const [village, district] = parts;
  return uniqueItems([
    normalized,
    `${village},IN`,
    village,
    district ? `${district},IN` : "",
    district || "",
  ]);
}

function hasWeatherKey() {
  const key = process.env.OPENWEATHER_API_KEY;
  return Boolean(key && key !== "your_key");
}

function weatherLanguageCode(language = "hindi") {
  const normalized = String(language || "hindi").toLowerCase().trim();
  if (normalized === "english") return "en";
  return "hi";
}

function currentCacheKey(location, language) {
  return `weather:current:${weatherLanguageCode(language)}:${location.toLowerCase()}`;
}

function forecastCacheKey(location, language) {
  return `weather:forecast:${weatherLanguageCode(language)}:${location.toLowerCase()}`;
}

function mapCurrentWeather(data) {
  return {
    temperature: Math.round(data.main?.temp ?? 0),
    feels_like: Math.round(data.main?.feels_like ?? 0),
    humidity: data.main?.humidity ?? null,
    wind_speed: data.wind?.speed ? Number((data.wind.speed * 3.6).toFixed(1)) : 0,
    condition: data.weather?.[0]?.description || "Weather",
    condition_main: data.weather?.[0]?.main || "Clear",
    icon: data.weather?.[0]?.icon || "01d",
    city: data.name,
    country: data.sys?.country,
    visibility: data.visibility ? data.visibility / 1000 : null,
    sunrise: data.sys?.sunrise ? data.sys.sunrise * 1000 : null,
    sunset: data.sys?.sunset ? data.sys.sunset * 1000 : null,
    last_updated: new Date().toISOString(),
  };
}

function groupForecastByDay(list = []) {
  const grouped = new Map();

  list.forEach((item) => {
    const date = item.dt_txt?.slice(0, 10);
    if (!date) return;

    const current = grouped.get(date) || {
      date,
      max_temp: -Infinity,
      min_temp: Infinity,
      condition: item.weather?.[0]?.description || "Weather",
      condition_main: item.weather?.[0]?.main || "Clear",
      icon: item.weather?.[0]?.icon || "01d",
      pop: 0,
      rain_volume: 0,
      max_wind_speed: 0,
      entries: 0,
    };

    current.max_temp = Math.max(current.max_temp, item.main?.temp_max ?? item.main?.temp ?? 0);
    current.min_temp = Math.min(current.min_temp, item.main?.temp_min ?? item.main?.temp ?? 0);
    current.pop = Math.max(current.pop, item.pop || 0);
    current.rain_volume += item.rain?.["3h"] || 0;
    current.max_wind_speed = Math.max(
      current.max_wind_speed,
      item.wind?.speed ? item.wind.speed * 3.6 : 0
    );
    current.entries += 1;

    const hour = Number(item.dt_txt?.slice(11, 13));
    if (item.weather?.[0]?.main === "Thunderstorm" || (hour >= 9 && hour <= 15)) {
      current.condition = item.weather?.[0]?.description || current.condition;
      current.condition_main = item.weather?.[0]?.main || current.condition_main;
      current.icon = item.weather?.[0]?.icon || current.icon;
    }

    grouped.set(date, current);
  });

  return Array.from(grouped.values())
    .map((day) => ({
      date: day.date,
      max_temp: Math.round(day.max_temp),
      min_temp: Math.round(day.min_temp),
      condition: day.condition,
      condition_main: day.condition_main,
      icon: day.icon,
      rain_probability: Math.round(day.pop * 100),
      rain_volume: Number(day.rain_volume.toFixed(1)),
      max_wind_speed: Number(day.max_wind_speed.toFixed(1)),
    }));
}

async function fetchCurrentWeather(location, language = "hindi") {
  const weatherLang = weatherLanguageCode(language);
  const cacheKey = currentCacheKey(location, language);
  const fresh = getFreshCache(cacheKey);
  if (fresh) return { ...fresh.data, cached: true, cache_updated_at: fresh.updatedAt };

  if (!hasWeatherKey()) {
    const stale = getCache(cacheKey);
    if (stale) return { ...stale.data, cached: true, stale: true, cache_updated_at: stale.updatedAt };
    return {
      source: "placeholder",
      message: "Add OPENWEATHER_API_KEY in server/.env to fetch live weather.",
      data: null,
    };
  }

  try {
    let data = null;
    let resolvedLocation = location;

    for (const query of locationCandidates(location)) {
      try {
        const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
          params: {
            q: query,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
            lang: weatherLang,
          },
          timeout: 10000,
        });
        data = response.data;
        resolvedLocation = query;
        break;
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }
    }

    if (!data) {
      throw new Error("Location not found.");
    }

    const payload = {
      source: "openweathermap",
      data: mapCurrentWeather(data),
      requested_location: location,
      resolved_location: resolvedLocation,
      language: weatherLang,
    };
    const cached = setCache(cacheKey, payload, CACHE_TTL);
    return { ...payload, cached: false, cache_updated_at: cached.updatedAt };
  } catch (error) {
    const stale = getCache(cacheKey);
    if (stale) return { ...stale.data, cached: true, stale: true, cache_updated_at: stale.updatedAt };
    return {
      source: "unavailable",
      message: "Weather data is not available right now.",
      data: null,
    };
  }
}

async function fetchForecast(location, language = "hindi") {
  const weatherLang = weatherLanguageCode(language);
  const cacheKey = forecastCacheKey(location, language);
  const fresh = getFreshCache(cacheKey);
  if (fresh) return { ...fresh.data, cached: true, cache_updated_at: fresh.updatedAt };

  if (!hasWeatherKey()) {
    const stale = getCache(cacheKey);
    if (stale) return { ...stale.data, cached: true, stale: true, cache_updated_at: stale.updatedAt };
    return {
      source: "placeholder",
      message: "Add OPENWEATHER_API_KEY in server/.env to fetch live forecast.",
      data: [],
    };
  }

  try {
    let data = null;
    let resolvedLocation = location;

    for (const query of locationCandidates(location)) {
      try {
        const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
          params: {
            q: query,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
            lang: weatherLang,
          },
          timeout: 10000,
        });
        data = response.data;
        resolvedLocation = query;
        break;
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }
    }

    if (!data) {
      throw new Error("Location not found.");
    }

    const payload = {
      source: "openweathermap",
      city: data.city?.name,
      requested_location: location,
      resolved_location: resolvedLocation,
      language: weatherLang,
      data: groupForecastByDay(data.list),
      hourly: data.list.slice(0, 8).map(item => ({
        time: item.dt * 1000,
        temp: Math.round(item.main?.temp ?? 0),
        condition_main: item.weather?.[0]?.main || "Clear",
        icon: item.weather?.[0]?.icon || "01d",
        rain_probability: Math.round((item.pop || 0) * 100)
      })),
    };
    const cached = setCache(cacheKey, payload, CACHE_TTL);
    return { ...payload, cached: false, cache_updated_at: cached.updatedAt };
  } catch (error) {
    const stale = getCache(cacheKey);
    if (stale) return { ...stale.data, cached: true, stale: true, cache_updated_at: stale.updatedAt };
    return {
      source: "unavailable",
      message: "Forecast data is not available right now.",
      data: [],
    };
  }
}

function buildAlerts(forecastPayload, currentPayload) {
  const days = forecastPayload?.data || [];
  const current = currentPayload?.data;
  const alerts = [];
  const lowestTemp = Math.min(...days.map((day) => day.min_temp), current?.temperature ?? Infinity);
  const highestTemp = Math.max(...days.map((day) => day.max_temp), current?.temperature ?? -Infinity);
  const rainChance = Math.max(...days.map((day) => day.rain_probability || 0), 0);
  const heavyRainVolume = Math.max(...days.map((day) => day.rain_volume || 0), 0);
  const strongestWind = Math.max(...days.map((day) => day.max_wind_speed || 0), current?.wind_speed || 0);
  const thunderstormExpected = days.some((day) => day.condition_main === "Thunderstorm");

  if (lowestTemp < 4) {
    alerts.push({
      type: "frost",
      severity: "high",
      color: "red",
      message: "Pala Alert! Aaj raat pala girne ki sambhavna hai. Apni fasal dhakein.",
    });
  }

  if (thunderstormExpected) {
    alerts.push({
      type: "storm",
      severity: "high",
      color: "purple",
      message: "Aandhi-Toofan Alert! Tez bijli aur aandhi ki sambhavna hai. Khet mein kaam sambhal kar karein.",
    });
  }

  if (heavyRainVolume >= 20) {
    alerts.push({
      type: "heavy_rain",
      severity: "high",
      color: "blue",
      message: "Bhari Barish Alert! Paani jama ho sakta hai. Nali aur drainage saaf rakhein.",
    });
  }

  if (rainChance > 70) {
    alerts.push({
      type: "rain",
      severity: "medium",
      color: "blue",
      message: "Barish Alert! Kal barish ho sakti hai. Harvesting rokein.",
    });
  }

  if (strongestWind > 40) {
    alerts.push({
      type: "wind",
      severity: "medium",
      color: "slate",
      message: "Tez Hawa Alert! Fasal, polyhouse aur support structure check karein.",
    });
  }

  if (highestTemp > 40) {
    alerts.push({
      type: "heat",
      severity: "high",
      color: "orange",
      message: "Garmi Alert! Fasal ko zyada paani dein.",
    });
  }

  return alerts;
}

router.get("/", async (req, res, next) => {
  try {
    const location = normalizeLocation(req.query.location || req.query.city);
    res.json(await fetchCurrentWeather(location, req.query.language || req.query.lang));
  } catch (error) {
    next(error);
  }
});

router.get("/current", async (req, res, next) => {
  try {
    const location = normalizeLocation(req.query.location);
    res.json(await fetchCurrentWeather(location, req.query.language || req.query.lang));
  } catch (error) {
    next(error);
  }
});

router.get("/forecast", async (req, res, next) => {
  try {
    const location = normalizeLocation(req.query.location);
    res.json(await fetchForecast(location, req.query.language || req.query.lang));
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) return res.json({ suggestions: [] });

    if (!hasWeatherKey()) {
      return res.json({ 
        suggestions: [
          { name: "Shimla", state: "Himachal Pradesh", country: "IN" },
          { name: "Theog", state: "Himachal Pradesh", country: "IN" },
          { name: "Solan", state: "Himachal Pradesh", country: "IN" }
        ] 
      });
    }

    const response = await axios.get("https://api.openweathermap.org/geo/1.0/direct", {
      params: {
        q: query,
        limit: 5,
        appid: process.env.OPENWEATHER_API_KEY,
      },
      timeout: 5000,
    });

    const suggestions = response.data.map(item => ({
      name: item.name,
      state: item.state,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
      label: `${item.name}${item.state ? `, ${item.state}` : ""}${item.country ? `, ${item.country}` : ""}`
    }));

    res.json({ suggestions });
  } catch (error) {
    res.json({ suggestions: [] });
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const location = normalizeLocation(req.query.location);
    const language = req.query.language || req.query.lang;
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(location, language),
      fetchForecast(location, language),
    ]);

    res.json({
      source: current.source === "openweathermap" || forecast.source === "openweathermap"
        ? "openweathermap"
        : "placeholder",
      alerts: buildAlerts(forecast, current),
      cached: Boolean(current.cached && forecast.cached),
      cache_updated_at: current.cache_updated_at || forecast.cache_updated_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
