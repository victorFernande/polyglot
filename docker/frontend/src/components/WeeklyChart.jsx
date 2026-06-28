import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function WeeklyChart({ data }) {
  const chartData = Object.entries(data || {}).map(([day, minutes]) => ({
    day,
    minutes
  }))

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={{ stroke: '#333' }}
          />
          <YAxis 
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={{ stroke: '#333' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a2e', 
              border: '1px solid #333',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar 
            dataKey="minutes" 
            fill="#e94560" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
