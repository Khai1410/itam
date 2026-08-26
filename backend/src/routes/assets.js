const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const WRITABLE_FIELDS = [
  'no', 'device_name', 'condition', 'business_unit', 'job_family', 'project', 'location',
  'old_label', 'label', 'brand', 'description', 'chip', 'storage', 'intune', 'license_win11',
  'serial_number', 'purchase_date', 'vendor', 'price', 'invoice_number', 'retrieval_date',
  'retrieval_reason', 'retriever_name', 'retriever_id', 'retriever_job_title', 'retriever_dept',
  'returner_name', 'returner_id', 'returner_job_title', 'returner_dept', 'handover_date',
  'handover_staff', 'handover_staff_id', 'handover_staff_job_title', 'handover_staff_dept',
  'employee_name', 'employee_id', 'employee_job_title', 'employee_dept', 'line_manager',
  'repair_date', 'repair_details', 'note', 'note2', 'form_no',
];

function pickWritable(body) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key] === '' ? null : body[key];
  }
  return out;
}

async function logAssignmentChange(assetId, oldName, newName, newAccount, handledBy) {
  if (oldName === newName) return;

  if (oldName) {
    await db('asset_assignment_history')
      .where({ asset_id: assetId, employee_name: oldName })
      .whereNull('unassigned_at')
      .update({ unassigned_at: db.fn.now() });
  }

  if (newName) {
    await db('asset_assignment_history').insert({
      asset_id: assetId,
      employee_name: newName,
      employee_account: newAccount || null,
      handled_by: handledBy || null,
    });
  }
}

function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function applyIn(query, column, value) {
  const values = toArray(value);
  if (values.length) query = query.whereIn(column, values);
  return query;
}

function applyFilters(query, params) {
  const {
    type, status, location, businessUnit, jobFamily, project, brand, chip,
    license, employee, employeeDept, q,
  } = params;
  query = applyIn(query, 'device_name', type);
  query = applyIn(query, 'condition', status);
  query = applyIn(query, 'location', location);
  query = applyIn(query, 'business_unit', businessUnit);
  query = applyIn(query, 'job_family', jobFamily);
  query = applyIn(query, 'project', project);
  query = applyIn(query, 'brand', brand);
  query = applyIn(query, 'chip', chip);
  if (license === 'true' || license === 'false') query = query.where('license_win11', license === 'true');
  query = applyIn(query, 'employee_name', employee);
  query = applyIn(query, 'employee_dept', employeeDept);
  if (q) {
    query = query.where((builder) => {
      builder
        .whereILike('label', `%${q}%`)
        .orWhereILike('serial_number', `%${q}%`)
        .orWhereILike('description', `%${q}%`)
        .orWhereILike('employee_name', `%${q}%`);
    });
  }
  return query;
}

router.get('/', requireAuth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), 500);

  const baseQuery = applyFilters(db('assets'), req.query);
  const countQuery = applyFilters(db('assets'), req.query);

  const [{ count }] = await countQuery.count('id as count');
  const rows = await baseQuery
    .clone()
    .orderBy('id')
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({ data: rows, total: Number(count), page, pageSize });
});

router.get('/:id', requireAuth, async (req, res) => {
  const asset = await db('assets').where({ id: req.params.id }).first();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const payload = pickWritable(req.body || {});
  const [asset] = await db('assets').insert(payload).returning('*');
  if (asset.employee_name) {
    await logAssignmentChange(asset.id, null, asset.employee_name, asset.employee_id, req.user.username);
  }
  res.status(201).json(asset);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const before = await db('assets').where({ id: req.params.id }).first();
  if (!before) return res.status(404).json({ error: 'Asset not found' });

  const payload = pickWritable(req.body || {});
  payload.updated_at = db.fn.now();
  const [asset] = await db('assets').where({ id: req.params.id }).update(payload).returning('*');

  if ('employee_name' in payload) {
    await logAssignmentChange(
      asset.id,
      before.employee_name,
      asset.employee_name,
      asset.employee_id,
      req.user.username
    );
  }

  res.json(asset);
});

router.get('/:id/history', requireAuth, async (req, res) => {
  const asset = await db('assets').where({ id: req.params.id }).first();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const history = await db('asset_assignment_history')
    .where({ asset_id: req.params.id })
    .orderBy('assigned_at', 'desc');

  res.json(history);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const deleted = await db('assets').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'Asset not found' });
  res.status(204).end();
});

module.exports = router;
module.exports.applyFilters = applyFilters;
