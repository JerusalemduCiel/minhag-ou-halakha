const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TRACKING_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1khrIVFybxVgrfBp6pzpEf_kwDCHklgwrc_sulpqe_lo/edit';

function adminTrackingSheetLinkHtml() {
  return '<div style="margin: 16px 0 24px; text-align: center; padding: 14px; background: #f9f5f0; border-radius: 8px; border-left: 4px solid #eda234;">' +
    '<a href="' + TRACKING_SHEET_URL + '" style="color: #0f1419; font-weight: bold; font-size: 16px; text-decoration: underline;">' +
    '📊 Ouvrir le tableau de suivi des précommandes</a>' +
    '</div>';
}

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
    try {
      const session = stripeEvent.data.object;

      const customerName = session.metadata?.customer_name || 'Client';
      const customerEmail = session.customer_email;
      const customerPhone = session.metadata?.customer_phone || '';
      const adresse = `${session.metadata?.customer_address || ''}, 
    ${session.metadata?.customer_city || ''} 
    ${session.metadata?.customer_zip || ''}`.trim();
      const amount = (session.amount_total / 100).toFixed(2);
      const sessionId = session.id;
      const customerCity = session.metadata?.customer_city || '';
      const customerPostal = session.metadata?.customer_zip || '';
      const shippingMethod = session.metadata?.shipping_method || 'colissimo';
      const smLower = shippingMethod.toLowerCase();
      const isClickCollect = smLower.includes('collect') || smLower.includes('pickup');
      const shippingText = shippingMethod.includes('relay') ||
        shippingMethod.includes('mondial')
        ? 'Mondial Relay (Point Relais) — 3 à 5 jours ouvrés'
        : 'Colissimo (Domicile) — 2 à 3 jours ouvrés';
      const clientShippingHtml = smLower.includes('collect')
        ? '<div style="margin:20px 0; padding:16px; background:#f9f5f0; border-radius:8px; border-left:3px solid #eda234;">' +
          '<p style="margin:0 0 8px 0;">📍 <strong>Retrait en boutique</strong></p>' +
          '<img src="https://orasheltorah.fr/images/logo_blush.png" alt="Blush Général Store" style="height:50px; margin:8px 0;"/>' +
          '<p style="margin:4px 0; font-size:14px;">' +
          '<strong>Blush Général Store</strong><br/>' +
          '7 Rue de Sèze, 69006 Lyon<br/>' +
          'Votre commande est disponible dans la journée.<br/>' +
          'Nous vous confirmons par email dès qu\'elle est prête.' +
          '</p>' +
          '<div style="text-align:center;margin-top:20px;">' +
          '<a href="https://orasheltorah.fr/.netlify/functions/confirm-pickup?token=' +
          sessionId +
          '" style="display:inline-block;background:#eda234;color:#0f1419;' +
          'padding:14px 28px;border-radius:8px;text-decoration:none;' +
          'font-weight:bold;font-size:16px;">✅ Marquer comme retiré</a>' +
          '<p style="color:#999;font-size:11px;margin-top:8px;">' +
          'La vendeuse clique sur ce bouton lors de la remise du livre.</p>' +
          '</div>' +
          '</div>'
        : (isClickCollect
          ? '<p>📍 Votre commande sera disponible dans la journée au Blush Général Store — 7 Rue de Sèze, 69006 Lyon. Vous recevrez un email de confirmation dès qu\'elle est prête à retirer.</p>'
          : '<p>📦 <strong>Livraison :</strong> ' + shippingText + '</p>');

      if (session.metadata && typeof session.metadata.estimated_delivery === 'string' &&
        session.metadata.estimated_delivery.toLowerCase().includes('avril-mai-2026')) {
        session.metadata.estimated_delivery = '2-3 jours ouvrés';
      }

      // EMAIL CLIENT
      console.log('Envoi email client à:', customerEmail);
      const clientResult = await sendEmail(
        customerEmail,
        '✅ Votre commande Ora Shel Torah est confirmée !',
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
          '<h2 style="color: #eda234;">✨ ' + customerName + ', merci d\'illuminer ce projet !</h2>' +
          '<p>En passant commande, vous ne faites pas qu\'acheter un livre — vous participez à une aventure : celle de transmettre la beauté et la richesse du judaïsme à travers le jeu et le partage.</p>' +
          '<p><strong>Votre commande de ' + amount + ' € a bien été confirmée.</strong></p>' +
          clientShippingHtml +
          '<p>📍 <strong>Adresse :</strong> ' + adresse + '</p>' +
          '<p>📧 Vous recevrez un email avec votre numéro de suivi dès l\'expédition.</p>' +
          '<p style="margin-top:20px;">Merci de faire partie des premiers soutiens d\'Ora Shel Torah. 🙏</p>' +
          '<hr/>' +
          '<p style="color: #666; font-size: 12px;">' +
            'Ora Shel Torah — <a href="https://orasheltorah.fr">orasheltorah.fr</a><br/>' +
            'Référence : ' + sessionId +
          '</p>' +
        '</div>'
      );
      console.log('Résultat email client:', JSON.stringify(clientResult));

      // EMAIL ADMIN
      const dashboardUrl = `https://orasheltorah.fr/admin.html?` +
        `name=${encodeURIComponent(customerName)}&` +
        `email=${encodeURIComponent(customerEmail)}&` +
        `phone=${encodeURIComponent(customerPhone)}&` +
        `address=${encodeURIComponent(adresse)}&` +
        `city=${encodeURIComponent(customerCity)}&` +
        `postal=${encodeURIComponent(customerPostal)}&` +
        `amount=${encodeURIComponent((session.amount_total/100).toFixed(2))}&` +
        `shipping=${encodeURIComponent(
          session.metadata?.shipping_method || 'colissimo'
        )}&` +
        `relay_id=${encodeURIComponent(session.metadata?.relay_id || '')}&` +
        `relay_name=${encodeURIComponent(session.metadata?.relay_name || '')}&` +
        `relay_address=${encodeURIComponent(session.metadata?.relay_address || '')}&` +
        `relay_city=${encodeURIComponent(session.metadata?.relay_city || '')}&` +
        `product=${encodeURIComponent(session.metadata?.product_name || 'La Parole Transmise')}&` +
        `session=${encodeURIComponent(sessionId)}`;
      console.log('Envoi email admin à: mlumbroso68@gmail.com');
      const adminResult = await sendEmail(
        'mlumbroso68@gmail.com',
        `🛒 Nouvelle commande — ${customerName} — ${amount} €`,
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #eda234;">Nouvelle commande reçue !</h2>
          ${adminTrackingSheetLinkHtml()}
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td><strong>Nom :</strong></td><td>${customerName}</td></tr>
            <tr><td><strong>Email :</strong></td><td>${customerEmail}</td></tr>
            <tr><td><strong>Téléphone :</strong></td><td>${customerPhone}</td></tr>
            <tr><td><strong>Adresse :</strong></td><td>${adresse}</td></tr>
            <tr><td><strong>Montant :</strong></td><td>${amount} €</td></tr>
            <tr><td><strong>Référence :</strong></td><td>${sessionId}</td></tr>
            ${isClickCollect ? '<tr><td colspan="2">📍 Retrait en boutique : Blush Général Store<br/>7 Rue de Sèze, 69006 Lyon</td></tr>' : ''}
          </table>
          <div style="margin-top:20px; text-align:center;">
            <a href="${dashboardUrl}" style="background:#eda234; color:#0f1419; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:16px;">📦 Accéder au dashboard commandes</a>
          </div>
        </div>
        `
      );
      console.log('Résultat email admin:', JSON.stringify(adminResult));
    } catch (emailError) {
      console.error('Erreur envoi emails:', emailError);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
