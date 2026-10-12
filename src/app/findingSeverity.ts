export type FindingSeverity = 'error' | 'warning' | 'info';

export interface FindingSeverityCounts {
  errors: number;
  warnings: number;
  informational: number;
  total: number;
}

export interface FindingWithSeverity {
  severity?: unknown;
}

export const findingSeverityPresentation: Record<FindingSeverity, {
  label: string;
  surface: string;
  highlight: string;
  badge: string;
  border: string;
  icon: string;
  message: string;
}> = {
  error: {
    label: 'Error',
    surface: 'bg-red-100',
    highlight: 'bg-red-900/30 border-red-500',
    badge: 'bg-red-100 text-red-800',
    border: 'border-red-500',
    icon: 'text-red-600',
    message: 'text-red-800',
  },
  warning: {
    label: 'Warning',
    surface: 'bg-amber-100',
    highlight: 'bg-amber-900/30 border-amber-500',
    badge: 'bg-amber-100 text-amber-900',
    border: 'border-amber-500',
    icon: 'text-amber-700',
    message: 'text-amber-900',
  },
  info: {
    label: 'Informational',
    surface: 'bg-blue-100',
    highlight: 'bg-blue-900/30 border-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-500',
    icon: 'text-blue-600',
    message: 'text-blue-800',
  },
};

export function normalizeFindingSeverity(severity: unknown): FindingSeverity {
  const normalized = typeof severity === 'string' ? severity.trim().toLowerCase() : '';
  if (normalized === 'warning') return 'warning';
  if (['info', 'informational', 'information', 'notice', 'hidden', 'hint'].includes(normalized)) {
    return 'info';
  }
  return 'error';
}

export function normalizeFindings<T extends FindingWithSeverity>(
  findings: readonly T[],
): Array<T & { severity: FindingSeverity }> {
  return findings.map((finding) => ({
    ...finding,
    severity: normalizeFindingSeverity(finding.severity),
  }));
}

export function countFindings(findings: readonly FindingWithSeverity[]): FindingSeverityCounts {
  const counts: FindingSeverityCounts = {
    errors: 0,
    warnings: 0,
    informational: 0,
    total: findings.length,
  };
  for (const finding of findings) {
    const severity = normalizeFindingSeverity(finding.severity);
    if (severity === 'error') counts.errors += 1;
    else if (severity === 'warning') counts.warnings += 1;
    else counts.informational += 1;
  }
  return counts;
}

export function dominantFindingSeverity(counts: FindingSeverityCounts): FindingSeverity | null {
  if (counts.errors > 0) return 'error';
  if (counts.warnings > 0) return 'warning';
  if (counts.informational > 0) return 'info';
  return null;
}

export function formatFindingCounts(counts: FindingSeverityCounts): string {
  if (counts.total === 0) return 'No findings';
  const parts: string[] = [];
  if (counts.errors > 0) parts.push(`${counts.errors} error${counts.errors === 1 ? '' : 's'}`);
  if (counts.warnings > 0) parts.push(`${counts.warnings} warning${counts.warnings === 1 ? '' : 's'}`);
  if (counts.informational > 0) parts.push(`${counts.informational} informational`);
  return `${parts.join(' · ')} (${counts.total} total)`;
}