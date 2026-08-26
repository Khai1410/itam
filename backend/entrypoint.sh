#!/bin/sh
set -e

echo "Running migrations..."
npx knex migrate:latest

echo "Ensuring admin user..."
node src/seed/create-admin.js

echo "Importing Excel data (skipped if already imported)..."
node src/seed/import-excel.js

echo "Starting server..."
exec node src/index.js
