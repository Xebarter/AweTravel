/**
 * Paytota Payment Gateway Integration
 * Handles payment processing for AweTravel bookings
 */

export interface PaytotaPaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  customerEmail: string;
  customerName: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaytotaPaymentResponse {
  success: boolean;
  reference: string;
  authorizationUrl?: string;
  message?: string;
}

export interface PaytotaVerifyResponse {
  success: boolean;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  reference: string;
  message?: string;
}

class PaytotaClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.paytota.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Initialize a payment request
   */
  async initializePayment(
    request: PaytotaPaymentRequest
  ): Promise<PaytotaPaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency,
          reference: request.reference,
          customer_email: request.customerEmail,
          customer_name: request.customerName,
          description: request.description,
          metadata: request.metadata,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment initialization failed');
      }

      return {
        success: true,
        reference: data.reference,
        authorizationUrl: data.authorization_url,
      };
    } catch (error) {
      console.error('Paytota initialization error:', error);
      return {
        success: false,
        reference: '',
        message: error instanceof Error ? error.message : 'Payment initialization failed',
      };
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaytotaVerifyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed');
      }

      return {
        success: true,
        status: data.status,
        amount: data.amount,
        reference: data.reference,
      };
    } catch (error) {
      console.error('Paytota verification error:', error);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        reference: '',
        message: error instanceof Error ? error.message : 'Payment verification failed',
      };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(reference: string, amount?: number): Promise<PaytotaPaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${reference}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Refund failed');
      }

      return {
        success: true,
        reference: data.reference,
      };
    } catch (error) {
      console.error('Paytota refund error:', error);
      return {
        success: false,
        reference: '',
        message: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}

// Initialize Paytota client
const paytotaApiKey = process.env.PAYTOTA_API_KEY;

let paytotaClient: PaytotaClient | null = null;

if (!paytotaApiKey) {
  console.warn('PAYTOTA_API_KEY not configured. Payment features will be limited.');
} else {
  paytotaClient = new PaytotaClient(paytotaApiKey);
}

export function getPaytotaClient(): PaytotaClient | null {
  return paytotaClient;
}

export function initializePayment(request: PaytotaPaymentRequest) {
  if (!paytotaClient) {
    return {
      success: false,
      reference: '',
      message: 'Payment gateway not configured',
    };
  }
  return paytotaClient.initializePayment(request);
}

export function verifyPayment(reference: string) {
  if (!paytotaClient) {
    return {
      success: false,
      status: 'failed' as const,
      amount: 0,
      reference: '',
      message: 'Payment gateway not configured',
    };
  }
  return paytotaClient.verifyPayment(reference);
}

export function refundPayment(reference: string, amount?: number) {
  if (!paytotaClient) {
    return {
      success: false,
      reference: '',
      message: 'Payment gateway not configured',
    };
  }
  return paytotaClient.refundPayment(reference, amount);
}
