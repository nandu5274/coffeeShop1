/** Customer delivery routes only — excludes `/delivery-agent`. */
export function isCustomerDeliveryUrl(url: string): boolean {
  const path = (url || '').split('?')[0];
  return path === '/delivery' || path.startsWith('/delivery/');
}

/** Staff shell pages — hide marketing nav/footer. */
export function isStaffShellUrl(url: string): boolean {
  const path = (url || '').split('?')[0];
  return path === '/delivery-agent' || path.startsWith('/delivery-agent/');
}

/** Human-readable delivery order label (stored on delivery map / WhatsApp) */
export function deliveryDisplayTableNo(orderRefId: number | string, date = new Date()): string {
  const yyMMdd = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const tail = String(orderRefId).slice(-4);
  return `D-${yyMMdd}-${tail}`;
}

/**
 * kubera_order.table_no is INTEGER in the café DB — never send D-… strings there.
 * Use a positive int derived from order_ref_id (fits Postgres integer).
 */
export function deliveryOrderTableNoInt(orderRefId: number | string): number {
  const digits = String(orderRefId).replace(/\D/g, '');
  const n = parseInt(digits.slice(-9) || '0', 10);
  // Keep in signed 32-bit range; avoid 0 (empty tables)
  return Math.max(1, n % 2000000000);
}
