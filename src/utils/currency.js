export function formatCordoba(amount) {
  if (amount == null || isNaN(Number(amount))) return 'C$ 0.00';
  const num = Number(amount);
  return `C$ ${num.toFixed(2)}`;
}

export default formatCordoba;
