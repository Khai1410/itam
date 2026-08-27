const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { applyFilters } = require('./assets');
const { COLUMNS } = require('../lib/assetColumns');

const router = express.Router();

function formatDate(d) {
  if (!(d instanceof Date)) return d;
  return d.toISOString().slice(0, 10);
}

async function fetchFilteredAssets(query) {
  const rows = await applyFilters(db('assets'), query).orderBy('id');
  return rows.map((row) => ({
    ...row,
    purchase_date: formatDate(row.purchase_date),
    retrieval_date: formatDate(row.retrieval_date),
    handover_date: formatDate(row.handover_date),
    repair_date: formatDate(row.repair_date),
  }));
}

router.get('/assets.xlsx', requireAuth, async (req, res) => {
  const rows = await fetchFilteredAssets(req.query);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assets');
  sheet.columns = COLUMNS.map(([key, header]) => ({ header, key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="assets.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/assets.csv', requireAuth, async (req, res) => {
  const rows = await fetchFilteredAssets(req.query);

  const header = COLUMNS.map(([, label]) => csvEscape(label)).join(',');
  const lines = rows.map((row) => COLUMNS.map(([key]) => csvEscape(row[key])).join(','));
  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
  res.send('﻿' + csv);
});

module.exports = router;
