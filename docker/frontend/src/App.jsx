import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Waves from './pages/Waves'
import Study from './pages/Study'
import Achievements from './pages/Achievements'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/waves" element={<Waves />} />
        <Route path="/study" element={<Study />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  )
}

export default App
