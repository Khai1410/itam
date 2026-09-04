const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generators } = require('openid-client');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { azureConfigured, getAzureClient } = require('../lib/azureAuth');

const router = express.Router();

// One-time codes handed to the frontend after a successful Azure SSO callback,
// exchanged for the app's own JWT. Avoids putting the JWT itself in a URL
// (browser history / referrer / server logs). In-memory is fine for the
// single backend instance this app runs as.
const ssoExchangeCodes = new Map();
const SSO_CODE_TTL_MS = 60 * 1000;

function issueToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function azureCallbackUrl(req) {
  return `${req.protocol}://${req.get('host')}/api/auth/azure/callback`;
}

router.get('/providers', (req, res) => {
  res.json({ azure: azureConfigured() });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = await db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.password_hash) {
    return res.status(401).json({ error: 'This account signs in with Microsoft — use "Sign in with Microsoft" instead.' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: issueToken(user), user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/azure/login', async (req, res) => {
  if (!azureConfigured()) return res.status(404).json({ error: 'Azure SSO is not configured' });

  try {
    const client = await getAzureClient();
    const codeVerifier = generators.codeVerifier();
    const nonce = generators.nonce();
    const state = jwt.sign({ codeVerifier, nonce }, process.env.JWT_SECRET, { expiresIn: '10m' });

    const url = client.authorizationUrl({
      redirect_uri: azureCallbackUrl(req),
      scope: 'openid profile email',
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      nonce,
      state,
    });
    res.redirect(url);
  } catch (err) {
    console.error('Azure SSO login init failed:', err);
    res.status(502).json({ error: 'Could not reach Azure AD. Check AZURE_TENANT_ID and network access.' });
  }
});

router.get('/azure/callback', async (req, res) => {
  if (!azureConfigured()) return res.status(404).send('Azure SSO is not configured');

  try {
    const { state } = req.query;
    const { codeVerifier, nonce } = jwt.verify(state, process.env.JWT_SECRET);

    const client = await getAzureClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(azureCallbackUrl(req), params, {
      code_verifier: codeVerifier,
      nonce,
      state,
    });
    const claims = tokenSet.claims();
    const email = (claims.preferred_username || claims.email || '').toLowerCase();
    if (!email) throw new Error('Azure AD did not return an email/UPN claim');

    let user = await db('users').where({ azure_oid: claims.oid }).first();
    if (!user) user = await db('users').whereRaw('lower(username) = ?', [email]).first();

    if (user) {
      if (!user.azure_oid) {
        [user] = await db('users').where({ id: user.id }).update({
          azure_oid: claims.oid,
          provider: 'azure',
        }).returning('*');
      }
    } else {
      [user] = await db('users').insert({
        username: email,
        password_hash: null,
        role: 'viewer',
        provider: 'azure',
        azure_oid: claims.oid,
      }).returning('*');
    }

    const code = crypto.randomBytes(24).toString('hex');
    ssoExchangeCodes.set(code, {
      token: issueToken(user),
      user: { id: user.id, username: user.username, role: user.role },
      expiresAt: Date.now() + SSO_CODE_TTL_MS,
    });
    res.redirect(`/login?ssoCode=${code}`);
  } catch (err) {
    console.error('Azure SSO callback failed:', err);
    res.redirect('/login?ssoError=1');
  }
});

router.post('/sso/exchange', (req, res) => {
  const { code } = req.body || {};
  const entry = code && ssoExchangeCodes.get(code);
  ssoExchangeCodes.delete(code);
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'This sign-in link has expired. Please try again.' });
  }
  res.json({ token: entry.token, user: entry.user });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await db('users')
    .select('id', 'username', 'role', 'provider', 'created_at')
    .orderBy('username');
  res.json(users);
});

router.patch('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body || {};
  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or viewer' });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }
  const [user] = await db('users')
    .where({ id: req.params.id })
    .update({ role })
    .returning(['id', 'username', 'role', 'provider', 'created_at']);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or viewer' });
  }

  const existing = await db('users').where({ username }).first();
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users').insert({ username, password_hash, role }).returning(['id', 'username', 'role', 'created_at']);
  res.status(201).json(user);
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const deleted = await db('users').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

module.exports = router;
