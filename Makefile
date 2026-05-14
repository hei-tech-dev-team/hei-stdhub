.PHONY: install docsync help

help:
	@echo "Available commands:"
	@echo "  make install    - Install Python dependencies"
	@echo "  make docsync    - Run documentation sync"

install:
	python3 -m venv scripts/venv
	scripts/venv/bin/pip install --upgrade pip
	scripts/venv/bin/pip install google-generativeai python-dotenv
	@echo "Dependencies installed"

docsync:
	.venv/bin/python3 scripts/doc_sync.py
