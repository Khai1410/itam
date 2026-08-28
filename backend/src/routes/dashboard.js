const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['In Use', 'In Stock', 'Damaged', 'Lost', 'Sold', 'Warranty'];

function pivotByStatus(rows, groupKey) {
  const map = new Map();
  for (const row of rows) {
    const key = row[groupKey] || 'Unknown';
    if (!map.has(key)) {
      const entry = { [groupKey]: key, quantity: 0 };
      STATUSES.forEach((s) => (entry[s] = 0));
      map.set(key, entry);
    }
    const entry = map.get(key);
    entry.quantity += Number(row.count);
    if (STATUSES.includes(row.condition)) {
      entry[row.condition] += Number(row.count);
    }
  }
  return Array.from(map.values());
}

router.get('/summary', requireAuth, async (req, res) => {
  const [totalRow] = await db('assets').count('id as count');
  const byStatusRows = await db('assets')
    .select('condition')
    .count('id as count')
    .groupBy('condition');

  const byType = pivotByStatus(
    await db('assets').select('device_name', 'condition').count('id as count').groupBy('device_name', 'condition'),
    'device_name'
  );

  const byLocation = pivotByStatus(
    await db('assets').select('location', 'condition').count('id as count').groupBy('location', 'condition'),
    'location'
  );

  const byBusinessUnit = pivotByStatus(
    await db('assets')
      .select('business_unit', 'condition')
      .whereNotNull('business_unit')
      .count('id as count')
      .groupBy('business_unit', 'condition'),
    'business_unit'
  );

  const byChip = pivotByStatus(
    await db('assets')
      .select('chip', 'condition')
      .where('device_name', 'LAPTOP')
      .whereNotNull('chip')
      .count('id as count')
      .groupBy('chip', 'condition'),
    'chip'
  );

  const byStorage = pivotByStatus(
    await db('assets')
      .select('storage', 'condition')
      .where('device_name', 'LAPTOP')
      .whereNotNull('storage')
      .count('id as count')
      .groupBy('storage', 'condition'),
    'storage'
  );

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = 0;
    return acc;
  }, {});
  byStatusRows.forEach((r) => {
    if (STATUSES.includes(r.condition)) statusCounts[r.condition] = Number(r.count);
  });

  const [{ sum: totalValue }] = await db('assets').sum('price as sum');

  const [licenseRow] = await db('assets')
    .where('device_name', 'LAPTOP')
    .select(
      db.raw('count(*) as total'),
      db.raw('count(*) filter (where license_win11 = true) as licensed')
    );

  const activityLimit = Math.min(Math.max(parseInt(req.query.activityLimit, 10) || 30, 1), 100);
  const { rows: recentActivity } = await db.raw(`
    select * from (
      select h.id, h.employee_name, h.employee_account, a.label, a.device_name,
             h.assigned_at as event_at, 'assigned' as event_type
      from asset_assignment_history h join assets a on a.id = h.asset_id
      union all
      select h.id, h.employee_name, h.employee_account, a.label, a.device_name,
             h.unassigned_at as event_at, 'returned' as event_type
      from asset_assignment_history h join assets a on a.id = h.asset_id
      where h.unassigned_at is not null
    ) events
    order by event_at desc
    limit ?
  `, [activityLimit]);

  res.json({
    total: Number(totalRow.count),
    totalValue: Number(totalValue) || 0,
    licenseStats: {
      total: Number(licenseRow.total),
      licensed: Number(licenseRow.licensed),
    },
    statusCounts,
    byType,
    byLocation,
    byBusinessUnit,
    byChip,
    byStorage,
    recentActivity,
  });
});

module.exports = router;
