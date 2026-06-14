export interface CreateBillInput {
  personName: string;
  amount: number;
  currency: string;
  direction: "i_owe" | "they_owe";
  description?: string;
}

export interface SettleAllocationInput {
  accountId: string;
  amount: number;
}
