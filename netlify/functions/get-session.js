const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { session_id } = JSON.parse(event.body);
  
  if (!session_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Session ID manquant' })
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    const city = session.customer_details?.address?.city || 'France';
    const country = session.customer_details?.address?.country || 'FR';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        city: city,
        country: country
      })
    };
  } catch (error) {
    console.error('Erreur récupération session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur' })
    };
  }
};

