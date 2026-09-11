const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Root credentials for production infrastructure — admin-only end to end,
// unlike the rest of the app where viewers get read access.
router.use(requireAuth, requireAdmin);

const WRITABLE_FIELDS = ['system', 'category', 'url', 'username', 'password', 'permission_role', 'pic', 'note'];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key] === '' ? null : body[key];
  }
  return out;
}

router.get('/', async (req, res) => {
  const { q } = req.query;
  let query = db('system_accounts').orderByRaw('position asc nulls last').orderBy('id');
  if (q) {
    query = query.where((builder) => {
      builder
        .whereILike('system', `%${q}%`)
        .orWhereILike('username', `%${q}%`)
        .orWhereILike('category', `%${q}%`)
        .orWhereILike('note', `%${q}%`)
        .orWhereILike('pic', `%${q}%`);
    });
  }
  res.json(await query);
});

router.patch('/reorder', async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array is required' });

  await Promise.all(ids.map((id, index) => db('system_accounts').where({ id }).update({ position: (index + 1) * 1000 })));
  res.status(204).end();
});

router.post('/', async (req, res) => {
  const payload = pickWritable(req.body || {});
  if (!payload.system) return res.status(400).json({ error: 'system is required' });
  const [{ max }] = await db('system_accounts').max('position as max');
  payload.position = (max || 0) + 1000;
  const [row] = await db('system_accounts').insert(payload).returning('*');
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const payload = pickWritable(req.body || {});
  payload.updated_at = db.fn.now();
  const [row] = await db('system_accounts').where({ id: req.params.id }).update(payload).returning('*');
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const deleted = await db('system_accounts').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
