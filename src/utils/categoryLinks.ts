import { CategoryStripItemConfig } from '../types/store';

export function normalizeCategoryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function slugifyCategoryKey(value: string): string {
  return normalizeCategoryKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCategoryUrl(category: string): string {
  const clean = category.trim();
  if (typeof window === 'undefined') {
    return `/?categoria=${encodeURIComponent(clean)}#catalog-grid`;
  }
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?categoria=${encodeURIComponent(clean)}#catalog-grid`;
}

export function getCategoryParamFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('categoria') || params.get('category');
  return raw && raw.trim() ? raw.trim() : null;
}

export function resolveCategoryFromParam(
  rawParam: string,
  items?: CategoryStripItemConfig[],
  productCategories?: string[]
): string | null {
  const clean = rawParam.trim();
  if (!clean) return null;

  const normParam = normalizeCategoryKey(clean);
  const slugParam = slugifyCategoryKey(clean);

  if (normParam === 'todos' || normParam === 'all') {
    return 'Todos';
  }

  const candidates: string[] = [];
  for (const item of items || []) {
    if (item.category?.trim()) candidates.push(item.category.trim());
    if (item.label?.trim() && item.label.trim() !== item.category?.trim()) {
      candidates.push(item.label.trim());
    }
  }
  for (const cat of productCategories || []) {
    if (cat?.trim()) candidates.push(cat.trim());
  }

  // Prefer matching configured strip item so canonical category name is returned
  for (const item of items || []) {
    const cat = item.category?.trim();
    const label = item.label?.trim();
    if (!cat) continue;
    if (
      cat === clean ||
      label === clean ||
      normalizeCategoryKey(cat) === normParam ||
      (label && normalizeCategoryKey(label) === normParam) ||
      slugifyCategoryKey(cat) === slugParam ||
      (label && slugifyCategoryKey(label) === slugParam)
    ) {
      return cat;
    }
  }

  for (const cat of productCategories || []) {
    const c = cat?.trim();
    if (!c) continue;
    if (
      c === clean ||
      normalizeCategoryKey(c) === normParam ||
      slugifyCategoryKey(c) === slugParam
    ) {
      return c;
    }
  }

  return clean;
}

export function buildProductUrl(productId: string): string {
  const clean = productId.trim();
  if (typeof window === 'undefined') {
    return `/?produto=${encodeURIComponent(clean)}`;
  }
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?produto=${encodeURIComponent(clean)}`;
}

export function getProductParamFromLocation(url?: string): string | null {
  try {
    const search = url
      ? new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://lunora.local').search
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
    if (!search) return null;
    const params = new URLSearchParams(search);
    const raw = params.get('produto') || params.get('product');
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

