require('dotenv').config();
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('../db');

const SOURCE_FILE = path.join(__dirname, '../../seed/data/assets-source.xlsx');
const CHUNK_SIZE = 100;

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

function cellValue(row, col) {
  return unwrapCellValue(row.getCell(col).value);
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && value === 0) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '#N/A' || trimmed === '0') return null;
    return trimmed;
  }
  return String(value);
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toUpperCase() === 'TRUE';
  return null;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '#N/A') return null;
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function normalizeAccount(account) {
  if (!account) return account;
  return account.includes('@') ? account : `${account}@vsol.vn`;
}

async function importEmployees(workbook) {
  const sheet = workbook.getWorksheet('Employee');
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return; // title row + header row
    const account = cleanText(cellValue(row, 2));
    const name = cleanText(cellValue(row, 3));
    if (!account && !name) return;
    rows.push({
      account: normalizeAccount(account),
      name,
      job_title: cleanText(cellValue(row, 4)),
      business_unit: cleanText(cellValue(row, 5)),
      job_family: cleanText(cellValue(row, 6)),
      project: cleanText(cellValue(row, 7)),
      line_manager: cleanText(cellValue(row, 8)),
      line_manager_domain: cleanText(cellValue(row, 9)),
      onboard_date: toDate(cellValue(row, 10)),
      last_date: toDate(cellValue(row, 11)),
      status: cleanText(cellValue(row, 12)),
      location: cleanText(cellValue(row, 13)),
      note: cleanText(cellValue(row, 14)),
    });
  });

  const seen = new Set();
  const deduped = rows.filter((r) => {
    const key = r.account || `name:${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (let i = 0; i < deduped.length; i += CHUNK_SIZE) {
    await db('employees').insert(deduped.slice(i, i + CHUNK_SIZE)).onConflict('account').ignore();
  }
  return deduped.length;
}

async function importAssets(workbook) {
  const sheet = workbook.getWorksheet('Detail');
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    const no = toNumber(cellValue(row, 1));
    if (no === null) return; // skip blank trailing rows
    const location = cleanText(cellValue(row, 7));
    if (location === 'IPL') return; // IPL location retired, excluded from import
    rows.push({
      no,
      device_name: cleanText(cellValue(row, 2)),
      condition: cleanText(cellValue(row, 3)),
      business_unit: cleanText(cellValue(row, 4)),
      job_family: cleanText(cellValue(row, 5)),
      project: cleanText(cellValue(row, 6)),
      location,
      old_label: cleanText(cellValue(row, 8)),
      label: cleanText(cellValue(row, 9)),
      brand: cleanText(cellValue(row, 10)),
      description: cleanText(cellValue(row, 11)),
      chip: cleanText(cellValue(row, 12)),
      storage: cleanText(cellValue(row, 13)),
      intune: toBool(cellValue(row, 14)),
      license_win11: toBool(cellValue(row, 15)),
      serial_number: cleanText(cellValue(row, 16)),
      purchase_date: toDate(cellValue(row, 17)),
      vendor: cleanText(cellValue(row, 18)),
      price: toNumber(cellValue(row, 19)),
      invoice_number: cleanText(cellValue(row, 20)),
      retrieval_date: toDate(cellValue(row, 21)),
      retrieval_reason: cleanText(cellValue(row, 22)),
      retriever_name: cleanText(cellValue(row, 23)),
      retriever_id: cleanText(cellValue(row, 24)),
      retriever_job_title: cleanText(cellValue(row, 25)),
      retriever_dept: cleanText(cellValue(row, 26)),
      returner_name: cleanText(cellValue(row, 27)),
      returner_id: cleanText(cellValue(row, 28)),
      returner_job_title: cleanText(cellValue(row, 29)),
      returner_dept: cleanText(cellValue(row, 30)),
      handover_date: toDate(cellValue(row, 31)),
      handover_staff: cleanText(cellValue(row, 32)),
      handover_staff_id: cleanText(cellValue(row, 33)),
      handover_staff_job_title: cleanText(cellValue(row, 34)),
      handover_staff_dept: cleanText(cellValue(row, 35)),
      employee_name: cleanText(cellValue(row, 36)),
      employee_id: cleanText(cellValue(row, 37)),
      employee_job_title: cleanText(cellValue(row, 38)),
      employee_dept: cleanText(cellValue(row, 39)),
      line_manager: cleanText(cellValue(row, 40)),
      repair_date: toDate(cellValue(row, 41)),
      repair_details: cleanText(cellValue(row, 42)),
      note: cleanText(cellValue(row, 43)),
      note2: cleanText(cellValue(row, 44)),
      form_no: cleanText(cellValue(row, 45)),
    });
  });

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await db('assets').insert(rows.slice(i, i + CHUNK_SIZE));
  }
  return rows.length;
}

async function importFileVault(workbook) {
  const sheet = workbook.getWorksheet('File Vault');
  if (!sheet) return 0;
  const rows = [];
  sheet.eachRow((row) => {
    const label = cleanText(cellValue(row, 1));
    const recovery_key = cleanText(cellValue(row, 2));
    if (!label && !recovery_key) return;
    rows.push({ label, recovery_key });
  });
  if (rows.length) await db('file_vault').insert(rows);
  return rows.length;
}

async function importWindowsKeys(workbook) {
  const sheet = workbook.getWorksheet('Backup Window Key');
  if (!sheet) return 0;
  const rows = [];
  sheet.eachRow((row) => {
    const label = cleanText(cellValue(row, 1));
    const product_key = cleanText(cellValue(row, 2));
    const os_version = cleanText(cellValue(row, 3));
    if (!label && !product_key) return;
    rows.push({ label, product_key, os_version });
  });
  if (rows.length) await db('windows_keys').insert(rows);
  return rows.length;
}

async function alreadyImported() {
  const [{ count }] = await db('assets').count('id as count');
  return Number(count) > 0;
}

async function main() {
  if (await alreadyImported()) {
    console.log('Assets table already has data, skipping Excel import.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_FILE);

  console.log(`Imported ${await importEmployees(workbook)} employees.`);
  console.log(`Imported ${await importAssets(workbook)} assets.`);
  console.log(`Imported ${await importFileVault(workbook)} file vault entries.`);
  console.log(`Imported ${await importWindowsKeys(workbook)} windows keys.`);
}

main()
  .catch((err) => {
    console.error('import-excel failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
