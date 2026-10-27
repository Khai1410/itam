const { Issuer } = require('openid-client');

let clientPromise = null;

// SSO uses its own app registration (AZURE_SSO_CLIENT_ID/SECRET) so it's
// independent from the app registration used for sending mail via Graph
// (AZURE_CLIENT_ID/SECRET) — falls back to the mail app's credentials if no
// SSO-specific ones are set, for a simpler single-app setup.
function ssoClientId() {
  return process.env.AZURE_SSO_CLIENT_ID || process.env.AZURE_CLIENT_ID;
}
function ssoClientSecret() {
  return process.env.AZURE_SSO_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
}

function azureConfigured() {
  return Boolean(process.env.AZURE_TENANT_ID && ssoClientId() && ssoClientSecret());
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
        client_id: ssoClientId(),
        client_secret: ssoClientSecret(),
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
