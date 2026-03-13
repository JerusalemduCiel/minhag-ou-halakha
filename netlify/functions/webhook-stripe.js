const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: 'Webhook Error' };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerName = session.metadata?.customer_name || 'Client';
    const amount = (session.amount_total / 100).toFixed(2);

    console.log('========================================');
    console.log('🎉 NOUVELLE COMMANDE ORA SHEL TORAH !');
    console.log('========================================');
    console.log('Client:', customerName);
    console.log('Email:', customerEmail);
    console.log('Montant:', amount + '€');
    console.log('Session ID:', session.id);
    console.log('Date:', new Date().toLocaleString('fr-FR'));
    console.log('========================================');
    
    return { statusCode: 200, body: 'Commande enregistrée' };
  }

  return { statusCode: 200, body: 'Webhook reçu' };
};
