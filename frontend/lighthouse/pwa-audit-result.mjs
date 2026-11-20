/**
 * Shared result shape for the custom PWA audits.
 *
 * Each requirement is reported separately so a single flaky check can be
 * downgraded to `warn` in lighthouserc.cjs without weakening the category.
 */
export function pwaAuditResult(checks) {
  return {
    score: checks.every((check) => check.ok) ? 1 : 0,
    details: {
      type: "table",
      headings: [
        { key: "name", valueType: "text", label: "Requirement" },
        { key: "result", valueType: "text", label: "Result" },
      ],
      items: checks.map((check) => ({
        name: check.name,
        result: `${check.ok ? "Passed" : "Failed"}${check.detail ? ` — ${check.detail}` : ""}`,
      })),
    },
  };
}
