export type TemplatePaymentMode = "self_paid" | "split_with_friends";

export interface TemplateSplitFriendInput {
  personName: string;
  percentage: number;
}

export interface TemplateSplitConfigInput {
  friends: TemplateSplitFriendInput[];
}

export interface CreateTemplateInput {
  name: string;
  amount: number;
  accountId: string;
  intervalMonths: number;
  paymentMode?: TemplatePaymentMode;
  splitConfig?: TemplateSplitConfigInput | null;
  category?: string;
  subCategory?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  amount: number;
  isActive: boolean;
  accountId: string;
  intervalMonths: number;
  paymentMode?: TemplatePaymentMode;
  splitConfig?: TemplateSplitConfigInput | null;
  category?: string;
  subCategory?: string;
}
