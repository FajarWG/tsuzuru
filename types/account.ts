export interface CreateAccountInput {
  name: string;
  currency: string;
  balance: number;
  type: string;
  defaultPaymentAccountId?: string | null;
}

export interface UpdateAccountInput {
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
  defaultPaymentAccountId?: string | null;
}

export interface AccountUpdateItem {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
}
