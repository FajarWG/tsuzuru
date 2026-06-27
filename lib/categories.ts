/**
 * Shared category and subcategory constants for budget tracking.
 * Single source of truth used across AddTransactionFab, TransactionForm,
 * DashboardClient, and SettingsForm.
 */

export interface SubCatOption {
  value: string;
  label: string;
}

/** Default subcategories for Living Expenses (🏠) */
export const LIVING_EXPENSES_DEFAULT_SUBCATS: SubCatOption[] = [
  { value: "groceries", label: "Groceries" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Rent" },
  { value: "household", label: "Household Supplies" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" },
];

/** Default subcategories for Personal Spending (🎉) */
export const PERSONAL_SPENDING_DEFAULT_SUBCATS: SubCatOption[] = [
  { value: "dining_out", label: "Dining Out" },
  { value: "coffee", label: "Coffee" },
  { value: "snacks", label: "Snacks" },
  { value: "drinks", label: "Drinks" },
  { value: "shopping", label: "Shopping" },
  { value: "entertainment", label: "Entertainment" },
  { value: "hobbies", label: "Hobbies" },
  { value: "other", label: "Other" },
];

/** Subcategories for Income */
export const INCOME_SUBCATS: SubCatOption[] = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "allowance", label: "Allowance" },
  { value: "other", label: "Other" },
];

/**
 * Backward-compatibility mapping: old category slugs → new slugs.
 * Used for reading existing transactions recorded before the rename.
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  pocket_money: "living_expenses",
  shopping: "personal_spending",
};

/**
 * New category slugs that replaced legacy ones.
 * Used for writing new transactions.
 */
export const NEW_CATEGORY_SLUGS = ["living_expenses", "personal_spending"] as const;

/**
 * All expense category slugs (new + legacy) for a given new slug.
 * Use this to filter transactions in dashboard spending calculations.
 */
export function getCategoryFilterSlugs(newSlug: string): string[] {
  if (newSlug === "living_expenses") return ["living_expenses", "pocket_money"];
  if (newSlug === "personal_spending") return ["personal_spending", "shopping"];
  return [newSlug];
}

/**
 * Normalize a raw category slug to the new slug system.
 * Falls back to the input value if no mapping found.
 */
export function normalizeCategorySlug(slug: string): string {
  return LEGACY_CATEGORY_MAP[slug] ?? slug;
}

/**
 * Returns default subcategories for a given category slug.
 * Handles legacy slugs too.
 */
export function getDefaultSubCats(categorySlug: string): SubCatOption[] {
  const normalized = normalizeCategorySlug(categorySlug);
  if (normalized === "living_expenses") return LIVING_EXPENSES_DEFAULT_SUBCATS;
  if (normalized === "personal_spending") return PERSONAL_SPENDING_DEFAULT_SUBCATS;
  if (normalized === "income") return INCOME_SUBCATS;
  return [{ value: "other", label: "Other" }];
}
