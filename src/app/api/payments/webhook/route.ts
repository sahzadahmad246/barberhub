import { NextRequest } from 'next/server';
import { PaymentService } from '@/lib/payment-service';
import {
  withErrorHandling,
  createSuccessResponse,
  validateMethod
} from '@/lib/api-middleware';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * POST /api/payments/webhook
 * Handle Razorpay payment webhooks
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate request method
  const methodError = validateMethod(['POST'])(request);
  if (methodError) throw methodError;

  // Get webhook signature
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    throw new Error('Webhook signature missing');
  }

  // Parse request body
  const body = await request.text();
  
  // Verify webhook signature
  const isValidSignature = PaymentService.verifyWebhookSignature(body, signature);
  if (!isValidSignature) {
    throw new Error('Invalid webhook signature');
  }

  // Parse webhook payload
  const payload = JSON.parse(body);
  
  // Handle webhook
  const result = await PaymentService.handleWebhook(payload);

  return createSuccessResponse(
    result,
    'Webhook processed successfully',
    HTTP_STATUS.OK
  );
});
