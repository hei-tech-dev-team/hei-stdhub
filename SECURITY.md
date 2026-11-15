# Security policy

**Never** disclose a vulnerability in a public issue, chat or PR.
Report it privately via *Security → Report a vulnerability* on this repository,
or directly to the maintainers. We acknowledge reports within 72 hours.

Rules for contributors:
- no secrets in the repository (`.env` is ignored; the gitleaks scan blocks PRs);
- every authorization check happens on the backend;
- no account with a default password in production seeds.
