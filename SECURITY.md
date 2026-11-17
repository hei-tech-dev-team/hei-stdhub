# Security policy

**Never** disclose a vulnerability in a public issue, chat or PR.
Report it privately via *Security → Report a vulnerability* on this repository,
or directly to the maintainers. We acknowledge reports within 72 hours.

Rules for contributors:
- no secrets in the repository (`.env` is ignored and CI rejects tracked env files; the gitleaks scan blocks PRs);
- production secrets live in the hosting provider and GitHub Environments, never in a file;
- if a credential is exposed, rotate it with `docs/SECRET_ROTATION.md` — deleting the file is not enough;
- every authorization check happens on the backend;
- no account with a default password in production seeds.
