export function formatMoney(amount: number, currencySymbol = 'Kz'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} ${currencySymbol}`;
}
