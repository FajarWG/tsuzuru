export interface CreateBillInput {
  personName: string;
  amount: number;
  currency: string;
  direction: "i_owe" | "they_owe";
  description?: string;
  category?: string | null;
  subCategory?: string | null;
  accountId?: string;
}

export interface SettleAllocationInput {
  accountId: string;
  amount: number;
}
