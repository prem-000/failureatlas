import React from 'react';

interface ActivityHeatmapProps {
  data: Array<{ date: string; count: number }>;
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const max = Math.max(...data.map(d => d.count), 1);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const countMap = new Map(data.map(d => [d.date, d.count]));

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {days.map(day => {
          const count = countMap.get(day) || 0;
          const intensity = count > 0 ? Math.max(0.2, count / max) : 0;
          return (
            <div
              key={day}
              title={`${day}: ${count} submission${count !== 1 ? 's' : ''}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: count > 0 ? `rgba(255,95,82,${intensity})` : '#1a1a1a',
                border: '1px solid #1f1f1f',
                cursor: 'default',
                transition: 'background 0.2s',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#3f3f46' }}>30 days ago</span>
        <span style={{ fontSize: 10, color: '#3f3f46' }}>Today</span>
      </div>
    </div>
  );
}
