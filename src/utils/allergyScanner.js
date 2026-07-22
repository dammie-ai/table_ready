/**
 * Scans order items against a list of customer allergens and tags conflicting items.
 * 
 * @param {Array<Object>} orderItems - Array of items in the order (e.g., [{ name: 'Peanut Butter Burger', ingredients: ['peanuts', 'beef'] }])
 * @param {Array<string>} customerAllergens - Array of customer allergens (e.g., ['peanuts', 'dairy'])
 * @returns {Object} Object containing scanned items, allergy count, and alert flag.
 */
function scanOrderForAllergens(orderItems = [], customerAllergens = []) {
  if (!Array.isArray(orderItems) || !Array.isArray(customerAllergens)) {
    throw new Error('Invalid input: orderItems and customerAllergens must be arrays.');
  }

  // Normalize customer allergens for case-insensitive matching
  const normalizedAllergens = customerAllergens.map(a => a.trim().toLowerCase());

  let totalAlerts = 0;

  const scannedItems = orderItems.map(item => {
    const itemIngredients = Array.isArray(item.ingredients) 
      ? item.ingredients.map(ing => ing.trim().toLowerCase())
      : [];

    // Find conflicting allergens
    const detectedAllergens = normalizedAllergens.filter(allergen =>
      itemIngredients.some(ingredient => ingredient.includes(allergen)) ||
      item.name.toLowerCase().includes(allergen)
    );

    const hasAllergyConflict = detectedAllergens.length > 0;

    if (hasAllergyConflict) {
      totalAlerts++;
    }

    return {
      ...item,
      allergy_alert: hasAllergyConflict,
      detected_allergens: detectedAllergens,
      // High-priority tag attached directly inside item payload
      tags: [
        ...(item.tags || []),
        ...(hasAllergyConflict ? ['ALLERGY ALERT'] : [])
      ]
    };
  });

  return {
    allergy_alert_detected: totalAlerts > 0,
    total_allergy_warnings: totalAlerts,
    order_items: scannedItems
  };
}

module.exports = { scanOrderForAllergens };