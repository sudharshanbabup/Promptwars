import test from 'node:test';
import assert from 'node:assert';
import { 
  normalizeIngredientName, 
  extractNumericQuantity, 
  calculateBudgetFeasibility 
} from './budgetLogic.js';

test('normalizeIngredientName matches staples', () => {
  assert.strictEqual(normalizeIngredientName('large organic eggs'), 'egg');
  assert.strictEqual(normalizeIngredientName('fresh wild salmon fillets'), 'salmon');
  assert.strictEqual(normalizeIngredientName('unknown spice mixture'), 'unknown spice mixture');
});

test('extractNumericQuantity parses counts and measures', () => {
  assert.strictEqual(extractNumericQuantity('2 units'), 2);
  assert.strictEqual(extractNumericQuantity('1.5 cups'), 1.5);
  assert.strictEqual(extractNumericQuantity('some pinch of salt'), 1); // fallback
});

test('calculateBudgetFeasibility calculates correctly under budget', () => {
  const groceryList = [
    { item: 'egg', amount: '4 units', onHand: false }, // 4 * 0.25 = 1.00
    { item: 'milk', amount: '2 cups', onHand: false }, // 2 * 0.50 = 1.00
    { item: 'bread', amount: '2 slices', onHand: true } // 2 * 0.15 = 0.30 (onHand, so buy cost is 0)
  ];
  
  const result = calculateBudgetFeasibility(groceryList, 10);
  
  assert.strictEqual(result.totalBuyCost, 2.00);
  assert.strictEqual(result.totalHaveCost, 0.30);
  assert.strictEqual(result.status, 'Under budget');
  assert.strictEqual(result.hasUnknownPrices, false);
});

test('calculateBudgetFeasibility handles over budget and suggests swaps', () => {
  const groceryList = [
    { item: 'salmon', amount: '2 portions', onHand: false }, // 2 * 4.5 = 9.00
    { item: 'asparagus', amount: '1 bunch', onHand: false }  // unknown price
  ];
  
  const result = calculateBudgetFeasibility(groceryList, 5); // budget = 5
  
  assert.strictEqual(result.totalBuyCost, 9.00);
  assert.strictEqual(result.status, 'Over budget');
  assert.strictEqual(result.hasUnknownPrices, true);
  assert.ok(result.suggestedSwaps.length > 0);
  assert.strictEqual(result.suggestedSwaps[0].alternative, 'tofu');
});

test('calculateBudgetFeasibility handles zero/empty budget', () => {
  const groceryList = [
    { item: 'egg', amount: '2 units', onHand: false }
  ];
  const result = calculateBudgetFeasibility(groceryList, 0);
  assert.strictEqual(result.status, 'Over budget');
});

test('calculateBudgetFeasibility handles empty grocery list', () => {
  const result = calculateBudgetFeasibility([], 15);
  assert.strictEqual(result.totalBuyCost, 0);
  assert.strictEqual(result.status, 'Under budget');
});

test('calculateBudgetFeasibility handles unknown-only ingredients', () => {
  const groceryList = [
    { item: 'saffron threads', amount: '1 pinch', onHand: false }
  ];
  const result = calculateBudgetFeasibility(groceryList, 10);
  assert.strictEqual(result.totalBuyCost, 0);
  assert.strictEqual(result.hasUnknownPrices, true);
});
