export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string | null;
  date?: Date;
}
