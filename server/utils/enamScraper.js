import axios from "axios";
import { normalizeMarketRecord } from "./agmarknetClient.js";

const AGMARKNET_WEB_API = "https://api.agmarknet.gov.in/v1";
const REQUEST_TIMEOUT_MS = 15000;

const COMMON_COMMODITIES = [
  "Apple",
  "Potato",
  "Tomato",
  "Wheat",
  "Rice",
  "Onion",
  "Maize",
  "Capsicum",
];

let filtersCache = null;
let filtersCachedAt = 0;
const FILTER_CACHE_TTL = 24 * 60 * 60 * 1000;

function clean(value) {
  return String(value || "").trim();
}

function previousMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

async function fetchFilters() {
  if (filtersCache && Date.now() - filtersCachedAt < FILTER_CACHE_TTL) {
    return filtersCache;
  }

  const { data } = await axios.get(`${AGMARKNET_WEB_API}/daily-price-arrival/filters`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      "User-Agent": "Mozilla/5.0 AgroSaathi market price scraper",
      Accept: "application/json",
    },
  });

  if (!data?.status || !data?.data) {
    throw new Error("Agmarknet filters endpoint returned no data.");
  }

  filtersCache = data.data;
  filtersCachedAt = Date.now();
  return filtersCache;
}

function findByName(items, name, idKey, nameKey, allName) {
  if (!name) return items.find((item) => item[nameKey] === allName);

  const normalized = clean(name).toLowerCase();
  return (
    items.find((item) => clean(item[nameKey]).toLowerCase() === normalized) ||
    items.find((item) => clean(item[nameKey]).toLowerCase().includes(normalized)) ||
    items.find((item) => normalized.includes(clean(item[nameKey]).toLowerCase()))
  );
}

async function resolveParams({ commodity, state } = {}) {
  const filters = await fetchFilters();
  const stateRecord =
    findByName(filters.state_data || [], state || "Himachal Pradesh", "state_id", "state_name", "All States") ||
    filters.state_data?.find((item) => item.state_name === "Himachal Pradesh");

  const commodityRecord = findByName(filters.cmdt_data || [], commodity, "cmdt_id", "cmdt_name");

  if (commodity && !commodityRecord) {
    throw new Error(`Commodity not found on Agmarknet: ${commodity}`);
  }

  return {
    stateId: stateRecord?.state_id || 13,
    stateName: stateRecord?.state_name || "Himachal Pradesh",
    commodityId: commodityRecord?.cmdt_id,
    commodityName: commodityRecord?.cmdt_name || commodity,
  };
}

function flattenCommodityReport(report, { stateName, commodityName, market } = {}) {
  const records = [];
  const marketFilter = clean(market).toLowerCase();

  for (const marketItem of report?.markets || []) {
    const marketName = clean(marketItem.marketName);
    if (marketFilter && !marketName.toLowerCase().includes(marketFilter)) continue;

    for (const dateItem of marketItem.dates || []) {
      const prices = Array.isArray(dateItem.data) ? dateItem.data : [];

      for (const price of prices) {
        records.push(
          normalizeMarketRecord(
            {
              commodity: commodityName,
              state: stateName,
              market: marketName,
              min_price: price.minimumPrice,
              max_price: price.maximumPrice,
              modal_price: price.modalPrice,
              arrival_date: dateItem.arrivalDate,
              variety: price.variety,
              arrivals: price.arrivals ?? dateItem.total_arrivals,
            },
            "scraper"
          )
        );
      }
    }
  }

  return records.sort((a, b) => new Date(b.arrival_date) - new Date(a.arrival_date));
}

async function fetchCommodityMonth({ commodity, state, market, date }) {
  const params = await resolveParams({ commodity, state });
  if (!params.commodityId) return [];

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const { data } = await axios.get(`${AGMARKNET_WEB_API}/prices-and-arrivals/date-wise/specific-commodity`, {
    timeout: REQUEST_TIMEOUT_MS,
    params: {
      year,
      month,
      includeExcel: false,
      stateId: params.stateId,
      commodityId: params.commodityId,
    },
    headers: {
      "User-Agent": "Mozilla/5.0 AgroSaathi market price scraper",
      Accept: "application/json",
      Referer: "https://agmarknet.gov.in/",
    },
  });

  if (!data?.success) {
    throw new Error(`Agmarknet report unavailable for ${params.commodityName}.`);
  }

  return flattenCommodityReport(data, {
    stateName: params.stateName,
    commodityName: params.commodityName,
    market,
  });
}

export async function scrapeEnamPrices({ commodity, state, market, limit = 100 } = {}) {
  const commodities = commodity ? [commodity] : COMMON_COMMODITIES;
  const today = new Date();
  const previous = previousMonth(today);
  const allRecords = [];

  for (const crop of commodities) {
    let records = await fetchCommodityMonth({ commodity: crop, state, market, date: today });

    if (records.length === 0) {
      records = await fetchCommodityMonth({ commodity: crop, state, market, date: previous });
    }

    allRecords.push(...records);
  }

  const usable = allRecords.filter((record) => record.commodity && Number(record.modal_price) > 0);
  if (usable.length === 0) {
    throw new Error("No usable Agmarknet web records found.");
  }

  return usable.slice(0, Number(limit) || 100);
}

