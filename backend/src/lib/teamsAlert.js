const db = require('../db');

function teamsConfigured() {
  return Boolean(process.env.TEAMS_WEBHOOK_URL);
}

async function sendTeamsMessage(text) {
  const res = await fetch(process.env.TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Teams webhook responded ${res.status}`);
}

// Finds services expiring within the alert window and nags about each of
// them — keeps repeating until the expiration_date is updated (renewed) past
// the window, by design, so the reminder can't be missed. The automatic
// schedule (startup + 09:00) is throttled to once per calendar day per
// service; a manual run (force: true, from the "Check Now" button) always
// sends regardless of when it last fired.
async function checkServiceExpirations({ force = false } = {}) {
  if (!teamsConfigured()) return { sent: 0, skipped: 'Teams webhook not configured' };

  const alertDays = parseInt(process.env.SERVICE_ALERT_DAYS, 10) || 60;

  let query = db('services')
    .whereNotNull('expiration_date')
    .where('expiration_date', '>=', db.fn.now())
    .whereRaw(`expiration_date <= CURRENT_DATE + ?::int`, [alertDays]);

  if (!force) {
    query = query.where((builder) => {
      builder.whereNull('last_alert_sent_at').orWhereRaw('last_alert_sent_at::date < CURRENT_DATE');
    });
  }

  const due = await query.orderBy('expiration_date');

  let sent = 0;
  for (const service of due) {
    const days = Math.ceil((new Date(service.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    const dateLabel = new Date(service.expiration_date).toLocaleDateString('en-GB');
    const text =
      `⚠️ **Service renewal needed — ${service.service_name}**\n\n` +
      `Expires **${dateLabel}** (in ${days} day${days === 1 ? '' : 's'}). ` +
      `Mount: ${service.mount ?? '-'}. Please arrange budget/renewal in time.`;

    await sendTeamsMessage(text);
    await db('services')
      .where({ id: service.id })
      .update({ alerted_expiration_date: service.expiration_date, last_alert_sent_at: db.fn.now() });
    sent++;
  }

  return { sent, checked: due.length };
}

module.exports = { teamsConfigured, checkServiceExpirations };
