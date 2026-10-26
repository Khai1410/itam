const { Issuer } = require('openid-client');

function graphMailConfigured() {
  return Boolean(
    process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET
      && process.env.SENDER_EMAIL
  );
}

let clientPromise = null;

// App-only (client-credentials) Graph access — separate from the SSO login
// client in azureAuth.js, which uses the authorization-code flow instead.
async function getClient() {
  if (!clientPromise) {
    clientPromise = Issuer.discover(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
      .then((issuer) => new issuer.Client({
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
      }))
      .catch((err) => {
        clientPromise = null;
        throw err;
      });
  }
  return clientPromise;
}

async function getAppToken() {
  const client = await getClient();
  const tokenSet = await client.grant({
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });
  return tokenSet.access_token;
}

async function sendMail({ to, subject, html }) {
  if (!graphMailConfigured()) throw new Error('Graph mail is not configured');

  const token = await getAppToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.SENDER_EMAIL)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Graph sendMail responded ${res.status}: ${errBody}`);
  }
}

module.exports = { graphMailConfigured, sendMail };
