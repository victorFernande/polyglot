import React from 'react'

export default function StreakCalendar() {
  // Simplified calendar view
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const weeks = [
    [0, 0, 0, 1, 1, 1, 0], // Last week
    [1, 1, 0, 1, 1, 0, 1], // Previous week
    [1, 1, 1, 1, 0, 1, 1], // 2 weeks ago
    [0, 1, 1, 0, 1, 1, 1], // 3 weeks ago
  ]

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Calendário de Streak</h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs text-gray-500">
            {day}
          </div>
        ))}
        {weeks.flat().map((active, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
              active
                ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                : 'bg-white/5 text-gray-600'
            }`}
          >
            {active ? '🔥' : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
