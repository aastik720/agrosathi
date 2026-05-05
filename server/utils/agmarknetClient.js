import axios from "axios";

const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const AGMARKNET_ENDPOINT = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;
const REQUEST_TIMEOUT_MS = 12000;

function getApiKey() {
  return process.env.DATA_GOV_API_KEY || process.env.AGMARKNET_API_KEY || "";
}

function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toKgPrice(value) {
  const price = parsePrice(value);
  if (price === null) return null;

  // Agmarknet website/API prices are rupees per quintal.
  // Convert to rupees per kg for farmer-facing UI cards.
  const normalized = price >= 100 ? price / 100 : price;
  return Number(normalized.toFixed(normalized >= 100 ? 0 : 2));
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

export function normalizeMarketRecord(record, source = "agmarknet") {
  const minPrice = toKgPrice(record.min_price);
  const maxPrice = toKgPrice(record.max_price);
  const modalPrice = toKgPrice(record.modal_price);

  return {
    commodity: cleanText(record.commodity, "Unknown"),
    state: cleanText(record.state, "Himachal Pradesh"),
    district: cleanText(record.district),
    market: cleanText(record.market, "Mandi"),
    min_price: minPrice ?? 0,
    max_price: maxPrice ?? 0,
    modal_price: modalPrice ?? 0,
    raw_min_price: parsePrice(record.min_price),
    raw_max_price: parsePrice(record.max_price),
    raw_modal_price: parsePrice(record.modal_price),
    price_unit: "kg",
    raw_price_unit: "quintal",
    arrival_date: cleanText(record.arrival_date, new Date().toLocaleDateString("en-GB")),
    variety: cleanText(record.variety),
    grade: cleanText(record.grade),
    source,
    approximate: source === "fallback",
  };
}

export async function fetchAgmarknetPrices({
  commodity,
  state,
  market,
  limit = 100,
  offset = 0,
} = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("DATA_GOV_API_KEY or AGMARKNET_API_KEY is missing.");
  }

  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(limit),
    offset: String(offset),
  });

  if (state && state !== "All India") params.set("filters[state]", state);
  if (commodity) params.set("filters[commodity]", commodity);
  if (market) params.set("filters[market]", market);

  const { data } = await axios.get(AGMARKNET_ENDPOINT, {
    params,
    timeout: REQUEST_TIMEOUT_MS,
  });

  const records = Array.isArray(data?.records) ? data.records : [];
  const normalized = records
    .map((record) => normalizeMarketRecord(record, "agmarknet"))
    .filter((record) => record.commodity && record.modal_price > 0);

  if (normalized.length === 0) {
    throw new Error("Agmarknet returned no usable price records.");
  }

  return normalized;
}
