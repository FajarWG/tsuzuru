export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  subCategory?: string | null;
  mealNumber?: number | null;
  description?: string | null;
  date?: Date;
  isReceipt?: boolean;
  receiptItems?: any;
}

export interface UpdateTransactionInput extends CreateTransactionInput {
  id: string;
}

export interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  category: string;
  subCategory: string | null;
  mealNumber: number | null;
  description: string | null;
  date: string;
  isTemplate: boolean;
  account: {
    id: string;
    name: string;
    currency: string;
  };
}

export interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

export interface TransactionsData {
  transactions: TransactionItem[];
  accounts: AccountItem[];
}
