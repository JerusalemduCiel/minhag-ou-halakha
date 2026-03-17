const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const store = getStore('commandes');
    const { blobs } = await store.list();

    const commandes = [];
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' });
      if (data) commandes.push(data);
    }

    // Trier par date décroissante (plus récentes en premier)
    commandes.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(commandes)
    };
  } catch (error) {
    console.error('Erreur lecture commandes:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
