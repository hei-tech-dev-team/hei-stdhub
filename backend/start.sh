#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLASKMAIL_PORT="${FLASKMAIL_PORT:-5050}"
FLASKMAIL_PID=""
PYTHON_BIN=""

cleanup() {
  echo "Shutting down..."
  [ -n "$FLASKMAIL_PID" ] && kill "$FLASKMAIL_PID" 2>/dev/null || true
  exit
}
trap cleanup SIGINT SIGTERM EXIT

if [ -f "$DIR/flaskmail/venv/bin/python" ]; then
  PYTHON_BIN="$DIR/flaskmail/venv/bin/python"
elif command -v python3 >/dev/null 2>&1 && python3 -c "import flask, flask_mail, dotenv" >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
fi

# Start Flask-Mail when dependencies are installed. If not, Node uses its email fallbacks.
if [ -n "$PYTHON_BIN" ]; then
  echo "Starting Flask-Mail on port $FLASKMAIL_PORT..."
  FLASKMAIL_PORT="$FLASKMAIL_PORT" "$PYTHON_BIN" "$DIR/flaskmail/app.py" &
  FLASKMAIL_PID=$!

  # Wait for Flask-Mail to be ready (up to 15 seconds)
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:$FLASKMAIL_PORT/health" >/dev/null 2>&1; then
      echo "Flask-Mail is ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "WARNING: Flask-Mail did not start in time. Node will start without it."
    fi
    sleep 0.5
  done
else
  echo "WARNING: Flask-Mail dependencies not found. Configure RESEND_API_KEY or SMTP_* env vars for Node email fallback."
fi

echo "Starting Node.js server..."
exec node server.js
