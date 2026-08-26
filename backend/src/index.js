require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const employeeRoutes = require('./routes/employees');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`VAM backend listening on port ${port}`));
