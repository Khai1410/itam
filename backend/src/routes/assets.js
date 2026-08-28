const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { COLUMNS } = require('../lib/assetColumns');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

const FALLBACK_LABEL_PREFIX = {
  LAPTOP: 'LAP', MONITOR: 'MON', MOUSE: 'MOU', IPAD: 'IPAD', SMARTPHONE: 'SPH',
  CABLE: 'CAB', SSD: 'SSD', RAM: 'RAM', CPU: 'CPU', ROUTER: 'RTR', PRINTER: 'PRN', SPEAKER: 'SPK',
};

router.get('/next-label', requireAuth, async (req, res) => {
  const deviceName = String(req.query.device_name || '').trim();
  if (!deviceName) return res.status(400).json({ error: 'device_name is required' });

  const rows = await db('assets')
    .where({ device_name: deviceName })
    .whereNotNull('label')
    .whereRaw("label ~ '^[A-Za-z]+[0-9]+$'")
    .select('label');

  let best = null;
  for (const { label } of rows) {
    const m = label.match(/^([A-Za-z]+)(\d+)$/);
    if (!m) continue;
    const num = parseInt(m[2], 10);
    if (!best || num > best.num) best = { prefix: m[1], num, width: m[2].length };
  }

  if (!best) {
    const prefix = FALLBACK_LABEL_PREFIX[deviceName.toUpperCase()] || deviceName.slice(0, 3).toUpperCase();
    return res.json({ label: `${prefix}0001` });
  }

  const label = `${best.prefix}${String(best.num + 1).padStart(best.width, '0')}`;
  res.json({ label });
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

const BOOLEAN_FIELDS = new Set(['intune', 'license_win11']);
const DATE_FIELDS = new Set(['purchase_date']);
const NUMBER_FIELDS = new Set(['no', 'price']);

function unwrapCellValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if (v.error) return null;
    if (Array.isArray(v.richText)) return v.richText.map((rt) => rt.text).join('');
    if ('result' in v) return unwrapCellValue(v.result);
    if ('text' in v) return v.text;
    return null;
  }
  return v;
}

function toImportBool(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(s)) return true;
  if (['false', 'no', 'n', '0'].includes(s)) return false;
  return null;
}

function toImportDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO, e.g. from a re-imported export
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function toImportNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

router.post('/import', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    return res.status(400).json({ error: 'Could not read the uploaded file as an Excel workbook (.xlsx)' });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ error: 'The workbook has no sheets' });

  const headerLookup = {};
  COLUMNS.forEach(([key, label]) => {
    headerLookup[label.toLowerCase().trim()] = key;
  });

  const colFieldMap = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const text = String(unwrapCellValue(cell.value) ?? '').toLowerCase().trim();
    if (headerLookup[text]) colFieldMap[colNumber] = headerLookup[text];
  });

  if (!Object.keys(colFieldMap).length) {
    return res.status(400).json({
      error: 'No recognized column headers found in row 1. Expected headers like "Label", "Device Name", '
        + '"Condition", "Serial Number"... (same as the Export Excel file).',
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const record = {};
    let hasData = false;
    for (const [colNumber, field] of Object.entries(colFieldMap)) {
      let value = unwrapCellValue(row.getCell(Number(colNumber)).value);
      if (value === '') value = null;
      if (value !== null) hasData = true;

      if (BOOLEAN_FIELDS.has(field)) value = toImportBool(value);
      else if (DATE_FIELDS.has(field)) value = toImportDate(value);
      else if (NUMBER_FIELDS.has(field)) value = toImportNumber(value);
      else if (value !== null) value = String(value).trim() || null;

      if (field === 'line_manager' && value) value = value.replace(/\s*\([^)]*\)\s*$/, '').trim() || null;

      record[field] = value;
    }

    if (!hasData) continue; // fully blank row
    if (!record.device_name) {
      errors.push(`Row ${rowNumber}: missing "Device Name", skipped`);
      skipped++;
      continue;
    }

    try {
      let existing = null;
      if (record.label) existing = await db('assets').where({ label: record.label }).first();
      if (!existing && record.serial_number) {
        existing = await db('assets').where({ serial_number: record.serial_number }).first();
      }

      if (existing) {
        const [asset] = await db('assets')
          .where({ id: existing.id })
          .update({ ...record, updated_at: db.fn.now() })
          .returning('*');
        if ('employee_name' in record) {
          await logAssignmentChange(
            asset.id,
            existing.employee_name,
            asset.employee_name,
            asset.employee_id,
            req.user.username
          );
        }
        updated++;
      } else {
        const [asset] = await db('assets').insert(record).returning('*');
        if (asset.employee_name) {
          await logAssignmentChange(asset.id, null, asset.employee_name, asset.employee_id, req.user.username);
        }
        created++;
      }
    } catch (err) {
      errors.push(`Row ${rowNumber}: ${err.message}`);
      skipped++;
    }
  }

  res.json({ created, updated, skipped, errors: errors.slice(0, 50) });
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
