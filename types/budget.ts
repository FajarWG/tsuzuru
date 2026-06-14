export interface BudgetLimitItem {
  id: string;
  name: string;
  label: string;
  limit: number;
  spent?: number;
}
