.PHONY: install docsync flaskmail flaskmail-install help

help:
	@echo "Available commands:"
	@echo "  make install         - Install Python dependencies (docs)"
	@echo "  make docsync         - Run documentation sync"
	@echo "  make flaskmail       - Start Flask-Mail email service (port 5050)"
	@echo "  make flaskmail-install - Install Flask-Mail dependencies"

install:
	python3 -m venv scripts/venv
	scripts/venv/bin/pip install --upgrade pip
	scripts/venv/bin/pip install google-generativeai python-dotenv
	@echo "Dependencies installed"

docsync:
	scripts/venv/bin/python3 scripts/doc_sync.py

flaskmail-install:
	python3 -m venv backend/flaskmail/venv
	backend/flaskmail/venv/bin/pip install -r backend/flaskmail/requirements.txt
	@echo "Flask-Mail dependencies installed"

flaskmail:
	backend/flaskmail/venv/bin/python backend/flaskmail/app.py
