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
  const token = event.queryStringParameters?.token;
  
  if (!token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<html><body style="font-family:Arial;text-align:center;padding:60px"><h2>❌ Lien invalide</h2></body></html>'
    };
  }

  try {
    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(token);

    // Récupérer le payment intent lié à la session
    const paymentIntentId = session.payment_intent;

    // Vérifier si déjà retiré (via PaymentIntent metadata)
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );

    if (paymentIntent.metadata?.pickup_confirmed === 'true') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial;text-align:center;padding:60px;background:#f9f5f0">
          <div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
            <div style="font-size:48px;margin-bottom:16px">⚠️</div>
            <h2 style="color:#7B2335">Déjà retiré</h2>
            <p style="color:#666">Cette commande a déjà été récupérée en boutique.</p>
            <p style="color:#999;font-size:12px">Commande : ${session.metadata?.customer_name || ''}</p>
          </div>
        </body></html>`
      };
    }

    // Marquer comme retiré sur le PaymentIntent
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntent.metadata,
        pickup_confirmed: 'true',
        pickup_date: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      }
    });

    const customerName = session.metadata?.customer_name || 'Client';
    const amount = ((session.amount_total || 0) / 100).toFixed(2);
    const pickupDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // Email admin
    await sendEmail(
      'mlumbroso68@gmail.com',
      `✅ Livre retiré au Blush — ${customerName}`,
      `<div style="font-family:Arial;max-width:600px;margin:0 auto">
        <h2 style="color:#eda234">📦 Retrait confirmé !</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td><strong>Client :</strong></td><td>${customerName}</td></tr>
          <tr><td><strong>Email :</strong></td><td>${session.metadata?.customer_email || ''}</td></tr>
          <tr><td><strong>Montant :</strong></td><td>${amount} €</td></tr>
          <tr><td><strong>Boutique :</strong></td><td>Blush Général Store — Lyon 6e</td></tr>
          <tr><td><strong>Date retrait :</strong></td><td>${pickupDate}</td></tr>
        </table>
      </div>`
    );

    // Page de succès pour la vendeuse
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:Arial;text-align:center;padding:60px;background:#f9f5f0">
        <div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#2e7d32">Retrait confirmé !</h2>
          <p style="color:#333;font-size:18px"><strong>${customerName}</strong></p>
          <p style="color:#666">Livre remis en boutique le<br/><strong>${pickupDate}</strong></p>
          <p style="color:#999;font-size:12px;margin-top:20px">Blush Général Store · Lyon 6e</p>
        </div>
      </body></html>`
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:Arial;text-align:center;padding:60px">
        <h2>❌ Erreur</h2><p>${err.message}</p>
      </body></html>`
    };
  }
};
