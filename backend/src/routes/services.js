const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { teamsConfigured, checkServiceExpirations } = require('../lib/teamsAlert');

const router = express.Router();

router.use(requireAuth);

router.get('/alerts/status', (req, res) => {
  res.json({ teamsConfigured: teamsConfigured(), alertDays: parseInt(process.env.SERVICE_ALERT_DAYS, 10) || 60 });
});

router.post('/alerts/check-now', requireAdmin, async (req, res) => {
  if (!teamsConfigured()) return res.status(400).json({ error: 'TEAMS_WEBHOOK_URL is not configured' });
  try {
    const result = await checkServiceExpirations({ force: true });
    res.json(result);
  } catch (err) {
    console.error('Teams expiration check failed:', err);
    res.status(502).json({ error: 'Could not send Teams alert — check TEAMS_WEBHOOK_URL' });
  }
});

const WRITABLE_FIELDS = ['service_name', 'mount', 'expiration_date', 'note'];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key] === '' ? null : body[key];
  }
  return out;
}

router.get('/', async (req, res) => {
  const { q } = req.query;
  let query = db('services').orderByRaw('position asc nulls last').orderBy('id');
  if (q) query = query.whereILike('service_name', `%${q}%`);
  res.json(await query);
});

router.patch('/reorder', requireAdmin, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array is required' });

  await Promise.all(ids.map((id, index) => db('services').where({ id }).update({ position: (index + 1) * 1000 })));
  res.status(204).end();
});

router.post('/', requireAdmin, async (req, res) => {
  const payload = pickWritable(req.body || {});
  if (!payload.service_name) return res.status(400).json({ error: 'service_name is required' });
  const [{ max }] = await db('services').max('position as max');
  payload.position = (max || 0) + 1000;
  const [row] = await db('services').insert(payload).returning('*');
  res.status(201).json(row);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const payload = pickWritable(req.body || {});
  payload.updated_at = db.fn.now();
  const [row] = await db('services').where({ id: req.params.id }).update(payload).returning('*');
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const deleted = await db('services').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
