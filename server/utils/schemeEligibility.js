export const governmentSchemes = [
  {
    id: "pm-kisan",
    icon: "🏆",
    scheme_name: "PM Kisan Samman Nidhi",
    name_hindi: "प्रधानमंत्री किसान सम्मान निधि",
    ministry: "Ministry of Agriculture",
    description: "Direct income support for small and marginal farmer families.",
    description_hindi: "छोटे और सीमांत किसानों के लिए सीधी आय सहायता।",
    benefit_amount: 6000,
    benefit_type: "year",
    apply_link: "https://pmkisan.gov.in",
    documents: ["Aadhaar Card", "Bank Passbook", "Land Records (Jamabandi)", "Photo"],
    state_specific: false,
    criteria: { max_land_size: 2, states: "all" },
  },
  {
    id: "pm-fasal-bima",
    icon: "🌾",
    scheme_name: "PM Fasal Bima Yojana",
    name_hindi: "प्रधानमंत्री फसल बीमा योजना",
    ministry: "Ministry of Agriculture",
    description: "Crop insurance protection against natural calamities, pests, and disease.",
    description_hindi: "प्राकृतिक आपदा, कीट और बीमारी से फसल बीमा सुरक्षा।",
    benefit_amount: 0,
    benefit_type: "coverage",
    apply_link: "https://pmfby.gov.in",
    documents: ["Aadhaar Card", "Bank Passbook", "Land Records", "Crop Sowing Certificate"],
    state_specific: false,
    criteria: { all_farmers: true, notified_crops: true },
  },
  {
    id: "kisan-credit-card",
    icon: "💳",
    scheme_name: "Kisan Credit Card",
    name_hindi: "किसान क्रेडिट कार्ड",
    ministry: "NABARD / Ministry of Finance",
    description: "Affordable working capital credit for farm inputs and allied activities.",
    description_hindi: "खेती और संबंधित गतिविधियों के लिए सस्ता ऋण।",
    benefit_amount: 300000,
    benefit_type: "credit_limit",
    apply_link: "https://www.myscheme.gov.in/schemes/kcc",
    documents: ["Aadhaar Card", "Bank Passbook", "Land Records", "Passport Photo"],
    state_specific: false,
    criteria: { all_farmers: true },
  },
  {
    id: "soil-health-card",
    icon: "🧪",
    scheme_name: "Soil Health Card Scheme",
    name_hindi: "मृदा स्वास्थ्य कार्ड योजना",
    ministry: "Ministry of Agriculture",
    description: "Free soil testing and nutrient recommendation every three years.",
    description_hindi: "हर 3 साल में मुफ्त मिट्टी जांच और खाद सलाह।",
    benefit_amount: 0,
    benefit_type: "free_service",
    apply_link: "https://soilhealth.dac.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Soil Sample Details"],
    state_specific: false,
    criteria: { all_farmers: true },
  },
  {
    id: "pkvy-organic",
    icon: "🌱",
    scheme_name: "Paramparagat Krishi Vikas Yojana",
    name_hindi: "परंपरागत कृषि विकास योजना",
    ministry: "Ministry of Agriculture",
    description: "Financial support for organic farming and certification clusters.",
    description_hindi: "जैविक खेती और प्रमाणन के लिए सहायता।",
    benefit_amount: 20000,
    benefit_type: "hectare",
    apply_link: "https://pgsindia-ncof.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Organic Farming Declaration", "Bank Passbook"],
    state_specific: false,
    criteria: { organic_required: true },
  },
  {
    id: "pmksy-irrigation",
    icon: "💧",
    scheme_name: "Pradhan Mantri Krishi Sinchai Yojana",
    name_hindi: "प्रधानमंत्री कृषि सिंचाई योजना",
    ministry: "Ministry of Agriculture",
    description: "Micro-irrigation subsidy for water-efficient farming.",
    description_hindi: "पानी बचाने वाली सिंचाई के लिए सब्सिडी।",
    benefit_amount: 55,
    benefit_type: "percent_subsidy",
    apply_link: "https://pmksy.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Bank Passbook", "Irrigation Quotation"],
    state_specific: false,
    criteria: { all_farmers: true, hp_subsidy: 55 },
  },
  {
    id: "hp-crop-diversification",
    icon: "🥬",
    scheme_name: "Himachal Pradesh Crop Diversification Scheme",
    name_hindi: "हिमाचल प्रदेश फसल विविधीकरण योजना",
    ministry: "Government of Himachal Pradesh",
    description: "Support for vegetable growers shifting to high-value crops.",
    description_hindi: "सब्जी उगाने वाले किसानों के लिए उच्च मूल्य फसल सहायता।",
    benefit_amount: 10000,
    benefit_type: "hectare",
    apply_link: "https://hpagriculture.com",
    documents: ["Aadhaar Card", "HP Domicile", "Land Records", "Crop Details"],
    state_specific: true,
    criteria: { state: "Himachal Pradesh", crop_categories: ["vegetable"] },
  },
  {
    id: "hp-jeevan-suraksha",
    icon: "🛡️",
    scheme_name: "Mukhyamantri Kisan Evam Khetihar Mazdoor Jeevan Suraksha Yojana",
    name_hindi: "मुख्यमंत्री किसान एवं खेतिहर मजदूर जीवन सुरक्षा योजना",
    ministry: "Government of Himachal Pradesh",
    description: "Accident insurance coverage for farmers and farm workers in Himachal Pradesh.",
    description_hindi: "हिमाचल के किसानों और खेतिहर मजदूरों के लिए दुर्घटना बीमा।",
    benefit_amount: 500000,
    benefit_type: "coverage",
    apply_link: "https://himachal.nic.in",
    documents: ["Aadhaar Card", "HP Domicile", "Farmer Certificate", "Bank Passbook"],
    state_specific: true,
    criteria: { state: "Himachal Pradesh" },
  },
  {
    id: "national-horticulture-mission",
    icon: "🍎",
    scheme_name: "National Horticulture Mission",
    name_hindi: "राष्ट्रीय बागवानी मिशन",
    ministry: "Ministry of Agriculture",
    description: "Support for horticulture crops, cold storage, packaging, and post-harvest management.",
    description_hindi: "बागवानी, कोल्ड स्टोरेज, पैकेजिंग और कटाई बाद प्रबंधन में सहायता।",
    benefit_amount: 25000,
    benefit_type: "one-time",
    apply_link: "https://nhb.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Crop Details", "Project Estimate"],
    state_specific: false,
    criteria: { crops_any: ["apple", "peach", "aadoo"] },
  },
  {
    id: "enam-registration",
    icon: "🏪",
    scheme_name: "e-NAM Registration",
    name_hindi: "ई-नाम पंजीकरण",
    ministry: "Small Farmers Agribusiness Consortium",
    description: "Free digital mandi registration for transparent selling.",
    description_hindi: "पारदर्शी बिक्री के लिए मुफ्त डिजिटल मंडी पंजीकरण।",
    benefit_amount: 0,
    benefit_type: "free_registration",
    apply_link: "https://enam.gov.in",
    documents: ["Aadhaar Card", "Bank Passbook", "Mandi Details"],
    state_specific: false,
    criteria: { all_farmers: true },
  },
  {
    id: "antyodaya-anna",
    icon: "🍚",
    scheme_name: "Antyodaya Anna Yojana",
    name_hindi: "अंत्योदय अन्न योजना",
    ministry: "Ministry of Consumer Affairs",
    description: "Highly subsidized food grains for BPL families.",
    description_hindi: "BPL परिवारों के लिए बहुत सस्ता अनाज।",
    benefit_amount: 12000,
    benefit_type: "year",
    apply_link: "https://nfsa.gov.in",
    documents: ["Ration Card", "Aadhaar Card", "Income Certificate", "Photo"],
    state_specific: false,
    criteria: { bpl_required: true },
  },
  {
    id: "midday-meal-supplier",
    icon: "🥗",
    scheme_name: "Mid-Day Meal Scheme Supplier",
    name_hindi: "मिड-डे मील सप्लायर अवसर",
    ministry: "Department of School Education",
    description: "Supply fresh vegetables and grains to schools with direct payment.",
    description_hindi: "स्कूलों को सब्जियां और अनाज सप्लाई करके सीधा भुगतान।",
    benefit_amount: 18000,
    benefit_type: "year",
    apply_link: "https://pmposhan.education.gov.in",
    documents: ["Aadhaar Card", "Bank Passbook", "Produce Details", "Local Panchayat Certificate"],
    state_specific: false,
    criteria: { crops_any: ["potato", "tomato", "onion", "capsicum", "rice", "wheat", "maize"] },
  },
];

const vegetableCrops = ["potato", "tomato", "onion", "capsicum", "other_vegetables", "vegetables"];

function includesState(location = "", state) {
  if (!state) return true;
  return String(location).toLowerCase().includes(String(state).toLowerCase());
}

function cropMatches(profileCrops = [], expected = []) {
  const normalized = profileCrops.map((crop) => String(crop).toLowerCase());
  return expected.some((crop) => normalized.includes(String(crop).toLowerCase()));
}

function hasVegetables(profileCrops = []) {
  return cropMatches(profileCrops, vegetableCrops);
}

function isOrganicFarmer(profile = {}) {
  return Boolean(profile.is_organic || profile.organic_farming || profile.prefers_organic) ||
    cropMatches(profile.crop_types || [], ["organic", "natural_farming"]);
}

function isBpl(profile = {}) {
  return Boolean(profile.is_bpl || profile.bpl || profile.income_category === "bpl");
}

function benefitText(scheme, landSize) {
  if (scheme.benefit_type === "year") return `₹${scheme.benefit_amount.toLocaleString("en-IN")} per year`;
  if (scheme.benefit_type === "month") return `₹${scheme.benefit_amount.toLocaleString("en-IN")} per month`;
  if (scheme.benefit_type === "hectare") {
    const total = Math.max(1, Number(landSize) || 1) * Number(scheme.benefit_amount);
    return `₹${scheme.benefit_amount.toLocaleString("en-IN")} per hectare`;
  }
  if (scheme.benefit_type === "percent_subsidy") return `${scheme.benefit_amount}% subsidy`;
  if (scheme.benefit_type === "credit_limit") return `Loan up to ₹${scheme.benefit_amount.toLocaleString("en-IN")}`;
  if (scheme.benefit_type === "coverage") return scheme.benefit_amount ? `Coverage up to ₹${scheme.benefit_amount.toLocaleString("en-IN")}` : "Full coverage";
  if (scheme.benefit_type === "free_service") return "Free service";
  if (scheme.benefit_type === "free_registration") return "Free registration";
  return scheme.benefit_amount ? `₹${scheme.benefit_amount.toLocaleString("en-IN")}` : "Benefit available";
}

function estimatedAmount(scheme, landSize) {
  if (scheme.benefit_type === "year" || scheme.benefit_type === "one-time") return Number(scheme.benefit_amount || 0);
  if (scheme.benefit_type === "hectare") return Math.round(Number(scheme.benefit_amount || 0) * Math.max(1, Number(landSize) || 1));
  if (scheme.id === "soil-health-card") return 1500;
  if (scheme.id === "pm-fasal-bima") return 10000;
  if (scheme.id === "pmksy-irrigation") return 15000;
  if (scheme.id === "enam-registration") return 2500;
  return 0;
}

export function evaluateScheme(scheme, farmerProfile = {}, application = null) {
  const landSize = Number(farmerProfile.land_size || 0);
  const crops = farmerProfile.crop_types || [];
  const location = farmerProfile.location || "";
  const criteria = scheme.criteria || {};
  const reasons = [];
  const missing = [];
  let eligible = true;

  if (criteria.max_land_size !== undefined) {
    if (landSize > 0 && landSize <= Number(criteria.max_land_size)) {
      reasons.push(`Land size <= ${criteria.max_land_size} hectare`);
    } else {
      eligible = false;
      missing.push(`Land size requirement not met. Required <= ${criteria.max_land_size} hectare`);
    }
  }

  if (criteria.all_farmers) reasons.push("All farmers can apply");

  if (criteria.state) {
    if (includesState(location, criteria.state)) reasons.push(`${criteria.state} farmer`);
    else {
      eligible = false;
      missing.push(`Only for ${criteria.state}`);
    }
  }

  if (criteria.crop_categories?.includes("vegetable")) {
    if (hasVegetables(crops)) reasons.push("Vegetable grower");
    else {
      eligible = false;
      missing.push("Vegetable crop requirement not met");
    }
  }

  if (criteria.crops_any) {
    if (cropMatches(crops, criteria.crops_any)) reasons.push(`Crop match: ${criteria.crops_any.join(", ")}`);
    else {
      eligible = false;
      missing.push(`Required crop: ${criteria.crops_any.join(" or ")}`);
    }
  }

  if (criteria.organic_required) {
    if (isOrganicFarmer(farmerProfile)) reasons.push("Organic farming profile");
    else {
      eligible = false;
      missing.push("Organic farming requirement not met");
    }
  }

  if (criteria.bpl_required) {
    if (isBpl(farmerProfile)) reasons.push("BPL family");
    else {
      eligible = false;
      missing.push("BPL family requirement not met");
    }
  }

  if (criteria.notified_crops) {
    reasons.push("Crop insurance available for notified crops");
  }

  const status = application?.application_status || application?.status || "not_applied";

  return {
    ...scheme,
    scheme_id: scheme.id,
    name: scheme.scheme_name,
    eligible,
    reason: eligible ? reasons.join(", ") || "Profile matches scheme criteria" : missing[0] || "Eligibility criteria not met",
    reasons,
    missing_requirements: missing,
    benefit_text: benefitText(scheme, landSize),
    estimated_benefit_amount: eligible ? estimatedAmount(scheme, landSize) : 0,
    status,
    application: application || null,
  };
}

export function checkEligibility(farmerProfile = {}, applications = []) {
  const bySchemeId = new Map(
    (applications || []).map((application) => [
      application.scheme_id || application.scheme_name,
      application,
    ])
  );

  return governmentSchemes
    .map((scheme) => evaluateScheme(scheme, farmerProfile, bySchemeId.get(scheme.id) || bySchemeId.get(scheme.scheme_name)))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.estimated_benefit_amount - a.estimated_benefit_amount);
}

export function getSchemeById(id) {
  return governmentSchemes.find((scheme) => scheme.id === id || scheme.scheme_name === id);
}
