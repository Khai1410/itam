const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { graphMailConfigured, sendMail } = require('../lib/graphMail');

const router = express.Router();

router.use(requireAuth);

router.get('/status', (req, res) => {
  res.json({ configured: graphMailConfigured() });
});

router.post('/send', requireAdmin, async (req, res) => {
  if (!graphMailConfigured()) {
    return res.status(400).json({ error: 'Email sending is not configured (Azure app credentials / SENDER_EMAIL)' });
  }
  const { to, subject, html } = req.body || {};
  if (!to || !subject || !html) return res.status(400).json({ error: 'to, subject, and html are required' });

  try {
    await sendMail({ to, subject, html });
    res.json({ sent: true });
  } catch (err) {
    console.error('Send mail failed:', err);
    res.status(502).json({ error: 'Could not send email — check the Mail.Send app permission and admin consent' });
  }
});

module.exports = router;
