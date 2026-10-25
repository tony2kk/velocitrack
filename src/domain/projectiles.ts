import type { CatalogItem, Series } from './model';
import { finiteNumber, rawPath } from './providerData';
import { formatQuantity } from './units';

/** Preserve the provider's chosen mass unit; unknown enum values stay explicitly unresolved. */
export function projectileWeight(
  series: Series,
): { value: number; unit: string; grains: number | null } | null {
  const value = rawPath(series.raw, 'projectile.weight');
  const code = rawPath(series.raw, 'projectile.weightUnit');
  if (!finiteNumber(value) || value <= 0) return null;
  const label = String(code).toLowerCase();
  if (code === 0 || ['gr', 'grs', 'grain', 'grains'].includes(label))
    return { value, unit: 'grs', grains: value };
  if (code === 1 || ['g', 'gram', 'grams'].includes(label))
    return { value, unit: 'g', grains: value / 0.06479891 };
  return { value, unit: `source unit ${code ?? 'unknown'}`, grains: null };
}

/** A series label uses its own original mass, avoiding accidental catalog merging of different weights. */
export function projectileName(
  series: Series,
  catalogNames: Map<string, string>,
  showWeight: boolean,
): string {
  const name = catalogNames.get(series.projectileId) ?? 'Unknown projectile';
  const weight = showWeight ? projectileWeight(series) : null;
  return weight
    ? `${name} ${formatQuantity(weight.value, 'projectileWeight', weight.unit)}${weight.unit === 'grs' || weight.unit === 'g' ? ` ${weight.unit}` : ` (${weight.unit})`}`
    : name;
}

/** Decorate only unambiguous catalog masses; series-specific labels handle conflicting observations. */
export function displayCatalog(
  catalog: CatalogItem[],
  series: Series[],
  showWeight: boolean,
): CatalogItem[] {
  if (!showWeight) return catalog;
  const names = new Map(catalog.map((item) => [item.id, item.name]));
  return catalog.map((item) => {
    const rows = series.filter((row) => row.projectileId === item.id);
    const labels = new Set(rows.map((row) => projectileName(row, names, true)));
    return item.kind === 'projectile' && labels.size === 1
      ? { ...item, name: [...labels][0]! }
      : item;
  });
}
