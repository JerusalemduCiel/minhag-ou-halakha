const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // PROBLÈME 1 - Accepter les requêtes GET pour éviter 405 en local
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { items, customerInfo } = body;

    // Vérifier que la clé secrète Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
    }

    // Vérifier que les produits demandés sont disponibles
    const unavailableProducts = [];
    const priceMap = {
      'price_1SBf5wL4ecjfMIxOm0nbZ5sp': 'jdc',
      'price_1SBf6vL4ecjfMIxOYXAbWfh8': 'moh',
      'price_1SBf7lL4ecjfMIxOKuRj4czs': 'poz'
    };
    
    const requestedProducts = items.map(item => priceMap[item.priceId]).filter(Boolean);
    const hasUnavailable = requestedProducts.some(p => unavailableProducts.includes(p));

    if (hasUnavailable) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Certains produits ne sont pas encore disponibles. Sortie prévue : Printemps 2026.'
        })
      };
    }

    // Calculer poids total estimé (pour metadata uniquement)
    // Estimation simple : ~1 kg par article
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalWeight = totalItems * 1.0;

    // Frais de port fixes Colissimo
    const shippingCost = 7.59;

    // Line items Stripe
    const lineItems = items.map(item => {
      if (
        item.priceId === 'price_1Scn6GL4ecjfMIxOPxaM9FMl' ||
        item.id === 'lumieres' ||
        item.productId === 'lumieres' ||
        item.name === 'La Parole Transmise - Lumières d\'Israël'
      ) {
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name || 'La Parole Transmise - Lumières d\'Israël'
            },
            unit_amount: 3990
          },
          quantity: item.quantity || 1
        };
      }

      return {
        price: item.priceId,
        quantity: item.quantity || 1
      };
    });

    // Créer session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['FR'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 490,
              currency: 'eur'
            },
            display_name: 'Mondial Relay (Point Relais)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 }
            }
          }
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 790,
              currency: 'eur'
            },
            display_name: 'Colissimo (Domicile)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 3 }
            }
          }
        }
      ],
      success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/#boutique`,
      customer_email: customerInfo.email,
      metadata: {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || '',
        customer_city: customerInfo.city || '',
        customer_zip: customerInfo.postal || customerInfo.zip || '',
        relay_name: body.relay_name || '',
        relay_address: body.relay_address || '',
        relay_city: body.relay_city || '',
        relay_id: body.relay_id || '',
        total_weight: totalWeight.toFixed(2),
        shipping_cost: shippingCost.toFixed(2)
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
