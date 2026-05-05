import { normalizeMarketRecord } from "./agmarknetClient.js";

const fallbackPrices = [
  {
    commodity: "Apple",
    state: "Himachal Pradesh",
    market: "Shimla",
    min_price: "2500",
    max_price: "4500",
    modal_price: "3500",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Apple",
    state: "Himachal Pradesh",
    market: "Theog",
    min_price: "2200",
    max_price: "4000",
    modal_price: "3200",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Apple",
    state: "Himachal Pradesh",
    market: "Solan",
    min_price: "2000",
    max_price: "3600",
    modal_price: "3000",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Potato",
    state: "Himachal Pradesh",
    market: "Theog",
    min_price: "1200",
    max_price: "1800",
    modal_price: "1500",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Tomato",
    state: "Himachal Pradesh",
    market: "Solan",
    min_price: "2000",
    max_price: "3500",
    modal_price: "2800",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Onion",
    state: "Himachal Pradesh",
    market: "Solan",
    min_price: "1800",
    max_price: "2600",
    modal_price: "2200",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Maize",
    state: "Himachal Pradesh",
    market: "Mandi",
    min_price: "1900",
    max_price: "2300",
    modal_price: "2100",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Capsicum",
    state: "Himachal Pradesh",
    market: "Shimla",
    min_price: "3000",
    max_price: "5200",
    modal_price: "4200",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Wheat",
    state: "Punjab",
    market: "Amritsar",
    min_price: "2200",
    max_price: "2400",
    modal_price: "2300",
    arrival_date: "03/05/2026",
  },
  {
    commodity: "Rice",
    state: "Punjab",
    market: "Ludhiana",
    min_price: "3000",
    max_price: "3500",
    modal_price: "3200",
    arrival_date: "03/05/2026",
  },
];

export const getFallbackPrices = (commodity, state) => {
  let filtered = fallbackPrices;
  if (commodity) {
    filtered = filtered.filter(p => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  }
  if (state) {
    filtered = filtered.filter(p => p.state.toLowerCase().includes(state.toLowerCase()));
  }

  const records = filtered.length > 0 ? filtered : fallbackPrices;
  return records.map((record) => normalizeMarketRecord(record, "fallback"));
};
