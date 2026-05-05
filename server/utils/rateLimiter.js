const DEFAULT_DAILY_LIMIT = 5;

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export async function checkDiseaseScanLimit(supabase, farmerId, dailyLimit = DEFAULT_DAILY_LIMIT) {
  if (!supabase || !farmerId) {
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      count: 0,
      message: "Login ke baad hi scan kar sakte hain.",
    };
  }

  const { count, error } = await supabase
    .from("disease_scans")
    .select("id", { count: "exact", head: true })
    .eq("farmer_id", farmerId)
    .gte("created_at", startOfTodayIso());

  if (error) {
    throw error;
  }

  const used = count || 0;
  const remaining = Math.max(dailyLimit - used, 0);

  if (used >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      count: used,
      message: "Aap kal aur scan kar sakte hain.",
    };
  }

  return {
    allowed: true,
    remaining,
    limit: dailyLimit,
    count: used,
    message: "",
  };
}
