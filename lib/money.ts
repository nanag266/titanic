export const formatGhs = (pesewas: number | null | undefined): string => {
  if (pesewas === null || pesewas === undefined) return "Price coming soon";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2
  }).format(pesewas / 100);
};

export const ghsToPesewas = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
};
