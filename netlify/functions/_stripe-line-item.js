function parseDollarAmount(value) {
  const normalized = String(value || "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function subscriptionLineItem(plan, value) {
  const normalizedValue = String(value || "").trim();
  if (normalizedValue.startsWith("price_")) {
    return { price: normalizedValue, quantity: 1 };
  }

  const unitAmount = parseDollarAmount(normalizedValue);
  if (!unitAmount || unitAmount < 50) {
    const error = new Error(`Invalid Stripe ${plan} price. Use a price_ ID or a dollar amount like 6.95.`);
    error.statusCode = 500;
    throw error;
  }

  const isAnnual = plan === "annual";
  return {
    price_data: {
      currency: "usd",
      product_data: {
        name: `HoCo Sports Almanac ${isAnnual ? "Annual" : "Monthly"} Membership`,
      },
      recurring: {
        interval: isAnnual ? "year" : "month",
      },
      unit_amount: unitAmount,
    },
    quantity: 1,
  };
}

module.exports = { parseDollarAmount, subscriptionLineItem };
