#!/bin/bash
# update.sh

# 1. Pull the latest code changes from the git repository
echo "-> Pulling latest changes from git..."
git pull

# 2. Install/update any npm dependencies
echo "-> Installing npm dependencies..."
npm install

# 3. Trigger Vite to rebuild by "touching" the config file
# Vite's dev server will detect the change and reload.
echo "-> Triggering Vite reload..."
touch vite.config.ts

echo "-> Update process complete."
