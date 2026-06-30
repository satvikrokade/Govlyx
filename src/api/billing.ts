import axiosInstance from "./axiosConfig";

export type BillingCycle = "MONTHLY" | "YEARLY";

export interface BillingConfig {
  keyId: string;
}

export interface BillingStatus {
  currentTier: "GOVLYX_FREE" | "GOVLYX_PRO" | "GOVLYX_VIP";
  validUntil?: string;
  privateCommunityQuota?: number;
  billingCycle?: BillingCycle;
}

export interface CreateOrderResponse {
  orderId: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  message: string;
}

export const billingApi = {
  getConfig: async (): Promise<BillingConfig> => {
    const response = await axiosInstance.get<BillingConfig>("/api/billing/config");
    return response.data;
  },

  getMyBilling: async (): Promise<BillingStatus> => {
    const response = await axiosInstance.get<BillingStatus>("/api/billing/me");
    return response.data;
  },

  createOrder: async (
    targetTier: "GOVLYX_PRO" | "GOVLYX_VIP",
    billingCycle: BillingCycle
  ): Promise<CreateOrderResponse> => {
    const response = await axiosInstance.post<CreateOrderResponse>("/api/billing/create-order", {
      targetTier,
      billingCycle,
    });
    return response.data;
  },

  verifyPayment: async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
    const response = await axiosInstance.post<VerifyPaymentResponse>("/api/billing/verify", payload);
    return response.data;
  },
};
