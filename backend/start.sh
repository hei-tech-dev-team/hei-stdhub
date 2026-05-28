#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
FLASKMAIL_DIR="$DIR/flaskmail"
VENV_DIR="$FLASKMAIL_DIR/venv"

# Start FlaskMail in background
export FLASKMAIL_PORT="${FLASKMAIL_PORT:-5050}"

if [ -f "$VENV_DIR/bin/python" ]; then
    echo "Starting FlaskMail on port $FLASKMAIL_PORT ..."
    cd "$FLASKMAIL_DIR"
    nohup "$VENV_DIR/bin/python" app.py > /tmp/flaskmail.log 2>&1 &
    FLASKMAIL_PID=$!
    echo "FlaskMail started (PID: $FLASKMAIL_PID)"
    cd "$DIR"

    # Wait for FlaskMail to be ready
    for i in $(seq 1 15); do
        if curl -s "http://localhost:$FLASKMAIL_PORT/health" > /dev/null 2>&1; then
            echo "FlaskMail is ready"
            break
        fi
        sleep 0.5
    done
else
    echo "WARNING: FlaskMail venv not found at $VENV_DIR — emails will not be sent"
fi

# Start the Node.js server
echo "Starting Node.js server..."
exec node server.js
