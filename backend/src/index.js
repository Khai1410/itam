require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { checkServiceExpirations, teamsConfigured } = require('./lib/teamsAlert');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const employeeRoutes = require('./routes/employees');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const systemAccountRoutes = require('./routes/systemAccounts');
const serviceRoutes = require('./routes/services');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/system-accounts', systemAccountRoutes);
app.use('/api/services', serviceRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (teamsConfigured()) {
  cron.schedule('0 9 * * *', () => {
    checkServiceExpirations().catch((err) => console.error('Teams expiration check failed:', err));
  });
  console.log('Service expiration Teams alerts scheduled (daily at 09:00).');

  // This app only runs while the machine is on, so the 09:00 schedule above
  // gets silently skipped on any day the machine boots later than that — also
  // run once on startup (per-service dedup makes this safe, never double-alerts).
  checkServiceExpirations().catch((err) => console.error('Startup Teams expiration check failed:', err));
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`ITAM backend listening on port ${port}`));
