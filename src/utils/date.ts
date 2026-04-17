export function parseISODate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString('pt-BR');
}

export function toISODateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
