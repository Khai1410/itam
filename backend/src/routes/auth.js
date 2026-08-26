const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = await db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await db('users').select('id', 'username', 'role', 'created_at').orderBy('username');
  res.json(users);
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or viewer' });
  }

  const existing = await db('users').where({ username }).first();
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users').insert({ username, password_hash, role }).returning(['id', 'username', 'role', 'created_at']);
  res.status(201).json(user);
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const deleted = await db('users').where({ id: req.params.id }).del();
  if (!deleted) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

module.exports = router;
