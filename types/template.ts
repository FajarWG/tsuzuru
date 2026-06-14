export interface CreateTemplateInput {
  name: string;
  amount: number;
  accountId: string;
  intervalMonths: number;
}

export interface UpdateTemplateInput {
  name?: string;
  amount: number;
  isActive: boolean;
  accountId: string;
  intervalMonths: number;
}
