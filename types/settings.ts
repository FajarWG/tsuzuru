export interface UpdateUserSettingsInput {
  userId: string;
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  budgetCurrency?: string;
}

export interface OnboardingAccountInput {
  name: string;
  balance: number;
  type: string;
}

export interface OnboardingTemplateInput {
  name: string;
  amount: number;
  accountName: string;
}

export interface OnboardingInput {
  userId: string;
  currency: string;
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  accounts: OnboardingAccountInput[];
  templates: OnboardingTemplateInput[];
}
