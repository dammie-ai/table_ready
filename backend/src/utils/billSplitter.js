/**
 * Utility for bill-splitting calculations handling penny-rounding and itemized splits.
 */

/**
 * Splits a total bill evenly among N guests, distributing remainder cents 
 * to ensure sum(splits) === total.
 * 
 * @param {number} total - Total amount in dollars (e.g., 45.50)
 * @param {number} numSplits - Number of paying guests
 * @returns {Array<number>} Array of dollar amounts per guest
 */
const splitEvenly = (total, numSplits) => {
  if (!numSplits || numSplits <= 0) {
    throw new Error('Number of splits must be greater than zero.');
  }

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / numSplits);
  const remainderCents = totalCents % numSplits;

  const splits = [];
  for (let i = 0; i < numSplits; i++) {
    // Distribute remainder 1 cent at a time to the first N guests
    const guestCents = baseCents + (i < remainderCents ? 1 : 0);
    splits.push(guestCents / 100);
  }

  return splits;
};

/**
 * Calculates itemized splits where each guest pays for specific items,
 * plus a proportional share of tax and tip.
 * 
 * @param {Array<{ guestId: string, items: Array<{ price: number, quantity: number }> }>} guestOrders
 * @param {number} totalTax - Total tax amount in dollars
 * @param {number} totalTip - Total tip amount in dollars
 * @returns {Array<{ guestId: string, subtotal: number, tax: number, tip: number, total: number }>}
 */
const splitByItem = (guestOrders, totalTax = 0, totalTip = 0) => {
  if (!guestOrders || guestOrders.length === 0) {
    throw new Error('Guest orders are required for itemized split.');
  }

  // Calculate subtotals per guest
  const guestSubtotals = guestOrders.map(order => {
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    return { guestId: order.guestId, subtotalCents: Math.round(subtotal * 100) };
  });

  const overallSubtotalCents = guestSubtotals.reduce((sum, g) => sum + g.subtotalCents, 0);

  if (overallSubtotalCents === 0) {
    throw new Error('Overall subtotal cannot be zero.');
  }

  const totalTaxCents = Math.round(totalTax * 100);
  const totalTipCents = Math.round(totalTip * 100);

  let allocatedTaxCents = 0;
  let allocatedTipCents = 0;

  const results = guestSubtotals.map((guest, idx) => {
    const isLast = idx === guestSubtotals.length - 1;

    // Calculate proportional share
    const ratio = guest.subtotalCents / overallSubtotalCents;

    // Allocate tax & tip (last guest gets the remainder to avoid rounding drift)
    const guestTaxCents = isLast 
      ? totalTaxCents - allocatedTaxCents 
      : Math.round(totalTaxCents * ratio);
    
    const guestTipCents = isLast 
      ? totalTipCents - allocatedTipCents 
      : Math.round(totalTipCents * ratio);

    allocatedTaxCents += guestTaxCents;
    allocatedTipCents += guestTipCents;

    const guestTotalCents = guest.subtotalCents + guestTaxCents + guestTipCents;

    return {
      guestId: guest.guestId,
      subtotal: guest.subtotalCents / 100,
      tax: guestTaxCents / 100,
      tip: guestTipCents / 100,
      total: guestTotalCents / 100
    };
  });

  return results;
};

/**
 * Checks remaining balance on a session check.
 * Returns true if remaining balance is $0.00.
 * 
 * @param {number} totalBill 
 * @param {number} totalPaid 
 * @returns {{ isSettled: boolean, remainingBalance: number }}
 */
const checkBalanceStatus = (totalBill, totalPaid) => {
  const billCents = Math.round(totalBill * 100);
  const paidCents = Math.round(totalPaid * 100);
  const remainingCents = Math.max(0, billCents - paidCents);

  return {
    isSettled: remainingCents === 0,
    remainingBalance: remainingCents / 100
  };
};

module.exports = {
  splitEvenly,
  splitByItem,
  checkBalanceStatus
};