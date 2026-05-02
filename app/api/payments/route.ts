import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments
 * Initialize a payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      bookingId,
      amount,
      currency,
      customerEmail,
      customerName,
      metadata,
    } = body;

    // Validate required fields
    if (!bookingId || !amount || !currency || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate payment reference
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // In production, this would call Paytota API
    // For now, return mock response
    const paymentResponse = {
      success: true,
      reference,
      amount,
      currency,
      customerEmail,
      status: 'initialized',
      authorizationUrl: `https://paytota.com/pay/${reference}`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(paymentResponse, { status: 200 });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/:reference
 * Verify a payment transaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Reference required' },
        { status: 400 }
      );
    }

    // In production, this would call Paytota verification API
    const mockVerification = {
      success: true,
      reference,
      status: 'success',
      amount: 5250,
      currency: 'NGN',
      timestamp: new Date().toISOString(),
      message: 'Payment successful',
    };

    return NextResponse.json(mockVerification, { status: 200 });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
