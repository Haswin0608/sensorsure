import { DiagEvent } from '../types';

export function exportEventsToCsv(events: DiagEvent[]): void {
  const headers = [
    'Event ID',
    'Timestamp',
    'ISO Time',
    'Sensor ID',
    'Sensor Name',
    'Channel',
    'Rule',
    'Severity',
    'Title',
    'Observed',
    'Limit Text',
    'State',
    'Reviewed',
    'Is Test',
  ];

  const rows = events.map((ev) => [
    ev.id,
    ev.timestamp,
    new Date(ev.timestamp).toISOString(),
    ev.sensorId,
    `"${ev.sensorName.replace(/"/g, '""')}"`,
    `"${ev.channel.replace(/"/g, '""')}"`,
    ev.rule,
    ev.severity,
    `"${ev.title.replace(/"/g, '""')}"`,
    ev.observed !== null ? ev.observed : 'N/A',
    `"${ev.limitText.replace(/"/g, '""')}"`,
    ev.state,
    ev.reviewed ? 'Yes' : 'No',
    ev.isTest ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sensorsure_diagnostic_events_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
