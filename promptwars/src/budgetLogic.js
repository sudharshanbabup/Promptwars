/**
 * Reference price table for common staples (currency-agnostic).
 */
export const REFERENCE_PRICES = {
  "egg": 0.25,
  "milk": 0.50,        // per cup
  "bread": 0.15,       // per slice
  "chicken": 2.50,     // per portion/breast
  "tofu": 1.50,        // per block
  "rice": 0.10,        // per cup
  "pasta": 0.40,       // per cup/portion
  "tomato": 0.50,      // per unit
  "onion": 0.30,       // per unit
  "garlic": 0.10,      // per clove
  "spinach": 1.00,     // per bag/cup
  "cheese": 0.50,      // per oz
  "oil": 0.15,         // per tbsp
  "butter": 0.20,      // per tbsp
  "potato": 0.40,      // per unit
  "beef": 3.50,        // per portion
  "salmon": 4.50,      // per portion
  "avocado": 1.25,     // per unit
  "beans": 0.60,       // per cup
  "yogurt": 0.80,      // per cup
};

/**
 * Normalizes an ingredient name to help match it against reference prices.
 */
export function normalizeIngredientName(name) {
  if (!name) return "";
  let clean = name.toLowerCase().trim();
  // Remove common descriptors/plurals
  clean = clean.replace(/s\b/g, ""); // plural eggs -> egg
  
  for (const key of Object.keys(REFERENCE_PRICES)) {
    if (clean.includes(key)) {
      return key;
    }
  }
  return clean;
}

/**
 * Extracts a numeric quantity from an amount string (e.g., "3 cups" -> 3, "250g" -> 250).
 * Defaults to 1 if no number is found.
 */
export function extractNumericQuantity(amountStr) {
  if (!amountStr) return 1;
  const match = amountStr.match(/(\d+(\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 1;
}

/**
 * Evaluates the grocery list against the budget.
 * Pure function: takes inputs and returns the calculation outputs without side effects.
 * 
 * @param {Array} groceryList - Array of items: { item: string, amount: string, onHand?: boolean }
 * @param {number} dailyBudget - The daily budget limit
 * @returns {Object} Costing and feasibility report
 */
export function calculateBudgetFeasibility(groceryList, dailyBudget) {
  const list = groceryList || [];
  const limit = typeof dailyBudget === 'number' ? dailyBudget : parseFloat(dailyBudget) || 0;

  let totalBuyCost = 0;
  let totalHaveCost = 0;
  const itemizedCosts = [];
  let hasUnknownPrices = false;

  list.forEach((itemObj, index) => {
    const rawName = itemObj.item || "";
    const amount = itemObj.amount || "";
    const onHand = !!itemObj.onHand;

    const normalized = normalizeIngredientName(rawName);
    const unitPrice = REFERENCE_PRICES[normalized];
    const qty = extractNumericQuantity(amount);

    const isPriceKnown = unitPrice !== undefined;
    const costValue = isPriceKnown ? qty * unitPrice : 0;

    if (!isPriceKnown) {
      hasUnknownPrices = true;
    }

    if (onHand) {
      totalHaveCost += costValue;
    } else {
      totalBuyCost += costValue;
    }

    itemizedCosts.push({
      index,
      item: rawName,
      amount,
      onHand,
      priceKnown: isPriceKnown,
      unitPrice: isPriceKnown ? unitPrice : null,
      cost: costValue
    });
  });

  // Calculate feasibility state
  let status = "Under budget";
  let description = "Your meal plan is comfortably within your budget limits.";
  
  if (limit <= 0) {
    status = "Over budget";
    description = "No budget limit was defined, or budget limit is zero.";
  } else if (totalBuyCost > limit) {
    status = "Over budget";
    description = `Your estimated shopping list cost exceeds your budget by ${(totalBuyCost - limit).toFixed(2)}.`;
  } else if (totalBuyCost >= limit * 0.95) {
    status = "On budget";
    description = "Your estimated cost is within 5% of your budget limit.";
  }

  // Suggest swaps if over budget
  const suggestedSwaps = [];
  if (status === "Over budget" && limit > 0) {
    // Rank buy-items by cost descending to find the biggest cost drivers
    const costlyBuyItems = itemizedCosts
      .filter(i => !i.onHand && i.priceKnown && i.cost > 0)
      .sort((a, b) => b.cost - a.cost);

    costlyBuyItems.forEach(item => {
      // Find substitution options based on normalized item
      const norm = normalizeIngredientName(item.item);
      let alternative = null;
      let savings = 0;

      if (norm === "chicken" || norm === "beef" || norm === "salmon") {
        alternative = "tofu";
        const altCost = extractNumericQuantity(item.amount) * REFERENCE_PRICES["tofu"];
        savings = item.cost - altCost;
      } else if (norm === "butter" || norm === "cheese") {
        alternative = "oil";
        const altCost = extractNumericQuantity(item.amount) * REFERENCE_PRICES["oil"];
        savings = item.cost - altCost;
      }

      if (alternative && savings > 0) {
        suggestedSwaps.push({
          item: item.item,
          cost: item.cost.toFixed(2),
          alternative,
          savings: savings.toFixed(2),
          tip: `Swap ${item.item} for ${alternative} to save $${savings.toFixed(2)}.`
        });
      }
    });
  }

  return {
    totalBuyCost: parseFloat(totalBuyCost.toFixed(2)),
    totalHaveCost: parseFloat(totalHaveCost.toFixed(2)),
    itemizedCosts,
    hasUnknownPrices,
    status,
    description,
    suggestedSwaps
  };
}
