const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const MOH_PRICE_ID = 'price_1TBx06LLfYKjr3rUqsV4WG2Z';
const MOH_PRODUCT_NAME = 'Minhag ou Halakha';
const METADATA_MAX_LENGTH = 500;

function truncateMetadata(value) {
  const text = String(value ?? '').trim();
  return text.length <= METADATA_MAX_LENGTH ? text : text.slice(0, METADATA_MAX_LENGTH);
}

function resolveModeLivraison(shippingMethod, pickupStore) {
  const method = (shippingMethod || '').toLowerCase();
  if (method.includes('collect') || method.includes('pickup') || method.includes('ney') || method.includes('chapeaux')) {
    if (pickupStore === 'blush-chapeaux' || method.includes('chapeaux')) {
      return 'Click & Collect — Blush Concept Store (Lyon 2e)';
    }
    if (method.includes('ney')) {
      return 'Click & Collect — Blush, 7 Rue Ney (Lyon 6e)';
    }
    return 'Click & Collect — Blush Général Store (Lyon 6e)';
  }
  if (method.includes('relay') || method.includes('mondial')) {
    return 'Mondial Relay';
  }
  if (method.includes('colissimo')) {
    return 'Colissimo';
  }
  return shippingMethod || 'Livraison';
}

function resolveAdresseLivraison({ customerInfo, relay_name, relay_address, shipping_method, pickup_store }) {
  const method = (shipping_method || '').toLowerCase();
  if (method.includes('relay') || method.includes('mondial')) {
    if (relay_name) {
      return [relay_name, relay_address].filter(Boolean).join(', ');
    }
  }
  if (method.includes('collect') || method.includes('pickup') || method.includes('ney') || method.includes('chapeaux')) {
    if (pickup_store === 'blush-chapeaux' || method.includes('chapeaux')) {
      return 'Blush Concept Store, 3 rue des Quatre Chapeaux, 69002 Lyon';
    }
    if (method.includes('ney')) {
      return 'Blush, 7 Rue Ney, 69006 Lyon';
    }
    return 'Blush Général Store, 7 Rue de Sèze, 69006 Lyon';
  }
  return customerInfo?.address || '';
}

function resolveVilleLivraison({ customerInfo, relay_city, shipping_method, pickup_store }) {
  const method = (shipping_method || '').toLowerCase();
  if (method.includes('relay') || method.includes('mondial')) {
    return relay_city || customerInfo?.city || '';
  }
  if (method.includes('collect') || method.includes('pickup') || method.includes('ney') || method.includes('chapeaux')) {
    return 'Lyon';
  }
  return customerInfo?.city || '';
}

function resolveCodePostalLivraison({ customerInfo, shipping_method, pickup_store }) {
  const method = (shipping_method || '').toLowerCase();
  if (method.includes('collect') || method.includes('pickup') || method.includes('ney') || method.includes('chapeaux')) {
    if (pickup_store === 'blush-chapeaux' || method.includes('chapeaux')) {
      return '69002';
    }
    return '69006';
  }
  return customerInfo?.postal || customerInfo?.zip || '';
}

function buildOrderTrackingMetadata(items, catalog, orderType, deliveryContext) {
  const {
    customerInfo,
    relay_name,
    relay_address,
    relay_city,
    shipping_method,
    pickup_store
  } = deliveryContext;

  const lines = items.map(item => {
    const qty = item.quantity || 1;
    const name = item.name || catalog[item.priceId] || catalog[item.id] || catalog[item.productId] || 'Produit';
    return { name, qty };
  });

  return {
    order_summary: truncateMetadata(lines.map(line => `${line.name} x${line.qty}`).join(', ')),
    quantite_totale: truncateMetadata(String(lines.reduce((sum, line) => sum + line.qty, 0))),
    order_type: truncateMetadata(orderType),
    destinataire: truncateMetadata(customerInfo?.name || ''),
    adresse: truncateMetadata(resolveAdresseLivraison({
      customerInfo,
      relay_name,
      relay_address,
      shipping_method,
      pickup_store
    })),
    code_postal: truncateMetadata(resolveCodePostalLivraison({ customerInfo, shipping_method, pickup_store })),
    ville: truncateMetadata(resolveVilleLivraison({
      customerInfo,
      relay_city,
      shipping_method,
      pickup_store
    })),
    pays: truncateMetadata(customerInfo?.country || 'FR'),
    mode_livraison: truncateMetadata(resolveModeLivraison(shipping_method, pickup_store))
  };
}

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
    const { items, customerInfo, relay_name, relay_address, relay_city, relay_id, shipping_method, pickup_store } = body;

    // Vérifier que la clé secrète Stripe est configurée
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
    }

    // Boutique mono-titre : seul le produit MOH est vendable ici
    const hasInvalidProduct = items.some(item => item.priceId !== MOH_PRICE_ID);
    if (hasInvalidProduct) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Produit indisponible dans cette boutique.'
        })
      };
    }

    // Calculer poids total estimé (pour metadata uniquement)
    // Estimation simple : ~1 kg par article
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalWeight = totalItems * 1.0;
    const orderTracking = buildOrderTrackingMetadata(
      items,
      { [MOH_PRICE_ID]: MOH_PRODUCT_NAME },
      'commande',
      { customerInfo, relay_name, relay_address, relay_city, shipping_method, pickup_store }
    );

    // Frais de port fixes Colissimo
    const shippingCost = 7.59;

    const lineItems = items.map(item => ({
      price: item.priceId,
      quantity: item.quantity || 1
    }));

    const shippingMethod = body.shipping_method || 'colissimo';

    const optionCollect = {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: 0,
          currency: 'eur'
        },
        display_name: 'Click & Collect — Blush Général Store (Lyon 6e)',
        delivery_estimate: {
          minimum: { unit: 'hour', value: 2 },
          maximum: { unit: 'hour', value: 4 }
        }
      }
    };

    const optionMR = {
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
    };

    const optionColissimo = {
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
    };

    let shippingOptions;
    if (shippingMethod.includes('collect')) {
      shippingOptions = [optionCollect, optionColissimo, optionMR];
    } else if (shippingMethod.includes('relay') ||
      shippingMethod.includes('mondial')) {
      shippingOptions = [optionMR, optionColissimo, optionCollect];
    } else {
      shippingOptions = [optionColissimo, optionMR, optionCollect];
    }

    // Créer session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['FR'] },
      shipping_options: shippingOptions,
      success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/#boutique`,
      customer_email: customerInfo.email,
      metadata: {
        ...orderTracking,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || '',
        customer_city: customerInfo.city || '',
        customer_zip: customerInfo.postal || customerInfo.zip || '',
        relay_name: relay_name || '',
        relay_address: relay_address || '',
        relay_city: relay_city || '',
        relay_id: relay_id || '',
        shipping_method: shipping_method || 'colissimo',
        pickup_store: pickup_store || '',
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
