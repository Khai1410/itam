const { Issuer } = require('openid-client');

let clientPromise = null;

function azureConfigured() {
  return Boolean(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
}

// Discovery is a network call, so it's deferred until the first SSO request
// (and cached) instead of blocking server startup — SSO is optional and the
// app must still start cleanly when Azure isn't configured or reachable.
async function getAzureClient() {
  if (!azureConfigured()) throw new Error('Azure SSO is not configured');

  if (!clientPromise) {
    clientPromise = Issuer.discover(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`
    )
      .then((issuer) => new issuer.Client({
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        response_types: ['code'],
      }))
      .catch((err) => {
        clientPromise = null; // allow retry on the next request
        throw err;
      });
  }

  return clientPromise;
}

module.exports = { azureConfigured, getAzureClient };
