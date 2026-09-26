#!/bin/sh
set -e

# Apply pending migrations before serving traffic. "migrate deploy" only
# applies existing migrations and never generates new ones, so it is safe to
# run unattended on every container start.
npm run db:deploy

# exec replaces the shell process with node, so node becomes PID 1 and
# receives SIGTERM directly from the platform on redeploy/stop.
exec node dist/index.js
