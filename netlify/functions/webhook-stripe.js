const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function sendEmail(to, subject, htmlContent) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: 'Ora Shel Torah', email: 'commandes@orasheltorah.fr' },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent
    })
  });
  return response.json();
}

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
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    const customerName = session.metadata?.customer_name || 'Client';
    const customerEmail = session.customer_email;
    const customerPhone = session.metadata?.customer_phone || '';
    const adresse = `${session.metadata?.customer_address || ''}, 
  ${session.metadata?.customer_city || ''} 
  ${session.metadata?.customer_zip || ''}`.trim();
    const amount = (session.amount_total / 100).toFixed(2);
    const sessionId = session.id;

    if (session.metadata && typeof session.metadata.estimated_delivery === 'string' &&
      session.metadata.estimated_delivery.toLowerCase().includes('avril-mai-2026')) {
      session.metadata.estimated_delivery = '2-3 jours ouvrés';
    }

    // EMAIL CLIENT
    console.log('Envoi email client à:', customerEmail);
    const clientResult = await sendEmail(
      customerEmail,
      '✅ Votre commande Ora Shel Torah est confirmée !',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #eda234;">Merci pour votre commande, ${customerName} !</h2>
        <p>Votre paiement de <strong>${amount} €</strong> a bien été reçu.</p>
        <p>📦 <strong>Livraison prévue :</strong> 2 à 3 jours ouvrés après expédition (Colissimo)</p>
        <p>📍 <strong>Adresse de livraison :</strong> ${adresse}</p>
        <p>📧 Vous recevrez un second email avec votre numéro de suivi Colissimo dès l'expédition.</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">
          Ora Shel Torah — orasheltorah.fr<br/>
          Référence commande : ${sessionId}
        </p>
      </div>
      `
    );
    console.log('Résultat email client:', JSON.stringify(clientResult));

    // EMAIL ADMIN
    const dashboardUrl = `https://orasheltorah.fr/admin.html?` +
      `name=${encodeURIComponent(customerName)}&` +
      `email=${encodeURIComponent(customerEmail)}&` +
      `phone=${encodeURIComponent(customerPhone)}&` +
      `address=${encodeURIComponent(adresse)}&` +
      `product=${encodeURIComponent(session.metadata?.product_name || 'La Parole Transmise')}&` +
      `session=${encodeURIComponent(sessionId)}`;
    console.log('Envoi email admin à: mlumbroso68@gmail.com');
    const adminResult = await sendEmail(
      'mlumbroso68@gmail.com',
      `🛒 Nouvelle commande — ${customerName} — ${amount} €`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #eda234;">Nouvelle commande reçue !</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td><strong>Nom :</strong></td><td>${customerName}</td></tr>
          <tr><td><strong>Email :</strong></td><td>${customerEmail}</td></tr>
          <tr><td><strong>Téléphone :</strong></td><td>${customerPhone}</td></tr>
          <tr><td><strong>Adresse :</strong></td><td>${adresse}</td></tr>
          <tr><td><strong>Montant :</strong></td><td>${amount} €</td></tr>
          <tr><td><strong>Référence :</strong></td><td>${sessionId}</td></tr>
        </table>
        <div style="margin-top:20px; text-align:center;">
          <a href="${dashboardUrl}" style="background:#eda234; color:#0f1419; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;">📦 Accéder au dashboard commandes</a>
        </div>
      </div>
      `
    );
    console.log('Résultat email admin:', JSON.stringify(adminResult));
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
