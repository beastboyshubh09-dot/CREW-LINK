import { api, USE_MOCK, wait } from './client';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export const paymentsApi = {
  async pay(job) {
    if (USE_MOCK) {
      await wait(800);
      return { success: true, paymentId: `pay_demo_${Date.now()}` };
    }
    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key) throw new Error('Set VITE_RAZORPAY_KEY_ID to enable checkout.');
    const { data: order } = await api.post('/payments/orders/', { job_id: job.id });
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'CrewLink',
        description: `Payment for ${job.id}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            const { data } = await api.post('/payments/verify/', { ...response, job_id: job.id });
            resolve(data);
          } catch (error) { reject(error); }
        },
        modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
        theme: { color: '#176b5b' }
      });
      checkout.open();
    });
  }
};