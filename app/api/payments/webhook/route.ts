import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments/webhook
 * Handle Paytota payment notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      event,
      reference,
      status,
      amount,
      customer_email,
      timestamp,
    } = body;

    console.log('[Payment Webhook]', {
      event,
      reference,
      status,
      amount,
      timestamp,
    });

    // Handle different payment events
    switch (event) {
      case 'payment.success':
        // Update booking status to confirmed
        // Send confirmation email to customer
        // Update transporter earnings
        console.log(`Payment ${reference} successful for ${customer_email}`);
        break;

      case 'payment.failed':
        // Update booking status to payment_failed
        // Send failure notification to customer
        console.log(`Payment ${reference} failed for ${customer_email}`);
        break;

      case 'payment.cancelled':
        // Update booking status to cancelled
        // Send cancellation notification
        console.log(`Payment ${reference} cancelled for ${customer_email}`);
        break;

      case 'payment.pending':
        // Keep booking in pending state
        console.log(`Payment ${reference} pending for ${customer_email}`);
        break;

      default:
        console.warn(`Unknown event: ${event}`);
    }

    // Verify webhook signature (in production)
    // const signature = request.headers.get('x-paytota-signature');
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json(
    //     { success: false, error: 'Invalid signature' },
    //     { status: 401 }
    //   );
    // }

    // Return success response to Paytota
    return NextResponse.json(
      { success: true, message: 'Webhook processed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
