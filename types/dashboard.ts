export interface DashboardData {
  user: {
    name: string | null;
    image: string | null;
  };
  accounts: any[];
  userSettings: any;
  monthlyExpenses: any[];
  previousMonthlyExpenses: any[];
  budgetLimits: any[];
}
