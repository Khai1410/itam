const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const WRITABLE_FIELDS = [
  'account', 'name', 'job_title', 'business_unit', 'job_family', 'project',
  'line_manager', 'line_manager_domain', 'onboard_date', 'last_date', 'status',
  'location', 'note',
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key] === '' ? null : body[key];
  }
  if (out.account && !out.account.includes('@')) {
    out.account = `${out.account}@vsol.vn`;
  }
  return out;
}

router.get('/', requireAuth, async (req, res) => {
  const { q } = req.query;
  let query = db('employees').orderBy('name');
  if (q) {
    query = query.where((builder) => {
      builder.whereILike('name', `%${q}%`).orWhereILike('account', `%${q}%`);
    });
  }
  const employees = await query;
  res.json(employees);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const payload = pickWritable(req.body || {});
  if (!payload.name) return res.status(400).json({ error: 'name is required' });

  if (payload.account) {
    const existing = await db('employees').where({ account: payload.account }).first();
    if (existing) return res.status(409).json({ error: 'Account already exists' });
  }
  if (!payload.status) payload.status = 'Active';

  const [employee] = await db('employees').insert(payload).returning('*');
  res.status(201).json(employee);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const payload = pickWritable(req.body || {});
  const [employee] = await db('employees').where({ id: req.params.id }).update(payload).returning('*');
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const deleted = await db('employees').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'Employee not found' });
  res.status(204).end();
});

router.post('/bulk-delete', requireAuth, requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'ids array is required' });

  const deleted = await db('employees').whereIn('id', ids).del();
  res.json({ deleted });
});

router.get('/:id/assets', requireAuth, async (req, res) => {
  const employee = await db('employees').where({ id: req.params.id }).first();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const assets = await db('assets')
    .where({ employee_name: employee.name })
    .orWhere({ employee_id: employee.account })
    .orderBy('device_name');

  res.json({ employee, assets });
});

module.exports = router;
