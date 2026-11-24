import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { wait } from './client';

function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Razorpay Checkout SDK failed to load. Check your network connection.'));
    document.body.appendChild(script);
  });
}

export const paymentsApi = {
  async pay(job) {
    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    // Supabase Edge Function integration
    if (isSupabaseConfigured && supabase && rzpKey && !rzpKey.includes('your_key')) {
      // 1. Create order via Supabase Edge Function
      const { data: order, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { job_id: job.id }
      });

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Failed to initialize payment order with server.');
      }

      await loadRazorpay();

      // 2. Open Razorpay Checkout modal
      return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: rzpKey,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'CrewLink Coordinated Workforce',
          description: `Payment for Job ${job.job_code || job.id}`,
          order_id: order.id,
          handler: async (response) => {
            try {
              // 3. Cryptographically verify signature via Supabase Edge Function
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
                body: { ...response, job_id: job.id }
              });

              if (verifyError) throw new Error(verifyError.message || 'Signature verification failed.');
              resolve(verifyData || { success: true });
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment was cancelled by user.'))
          },
          theme: { color: '#176b5b' }
        });
        checkout.open();
      });
    }

    // Development / offline test flow
    await wait(600);
    return {
      success: true,
      paymentId: `pay_test_${Date.now()}`,
      orderId: `order_test_${Date.now()}`
    };
  }
};
