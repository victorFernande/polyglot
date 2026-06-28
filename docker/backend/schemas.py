from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class WaveStatus(str, Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"

class PhaseStatus(str, Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"

class ActivityType(str, Enum):
    INPUT = "input"
    SRS = "srs"
    SHADOWING = "shadowing"
    PRODUCTION = "production"

# ============== USER ==============
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    total_xp: int
    level: int
    current_streak: int
    best_streak: int
    last_study_date: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserStats(BaseModel):
    total_xp: int
    level: int
    current_streak: int
    best_streak: int
    total_hours: float
    vocabulary_count: int
    phrases_count: int
    achievements_count: int
    next_level_xp: int
    progress_percent: float

# ============== WAVE ==============
class WaveCreate(BaseModel):
    wave_number: int = Field(..., ge=1, le=4)
    language: str
    language_name: str
    anchor: str

class WaveResponse(BaseModel):
    id: int
    wave_number: int
    language: str
    language_name: str
    anchor: str
    status: WaveStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_xp: int
    vocabulary_count: int
    phrases_count: int
    hours_input: float
    phases: List["PhaseResponse"] = []
    
    class Config:
        from_attributes = True

# ============== PHASE ==============
class PhaseResponse(BaseModel):
    id: int
    phase_number: int
    name: str
    status: PhaseStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    xp_earned: int
    tasks_completed: int
    total_tasks: int
    progress_percent: float
    tasks: List["TaskResponse"] = []
    
    class Config:
        from_attributes = True

# ============== TASK ==============
class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    xp_reward: int
    completed: bool
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class TaskComplete(BaseModel):
    task_id: int

# ============== STUDY LOG ==============
class StudyLogCreate(BaseModel):
    activity_type: ActivityType
    duration_minutes: int = Field(..., ge=1, le=480)
    notes: Optional[str] = None

class StudyLogResponse(BaseModel):
    id: int
    date: datetime
    activity_type: ActivityType
    duration_minutes: int
    xp_earned: int
    notes: Optional[str]
    
    class Config:
        from_attributes = True

# ============== ACHIEVEMENT ==============
class AchievementResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    xp_reward: int
    requirement_type: str
    requirement_value: int
    earned: bool = False
    earned_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============== XP / LEVEL ==============
class XPEarned(BaseModel):
    xp_earned: int
    total_xp: int
    level_up: bool
    new_level: Optional[int] = None
    streak_maintained: bool
    streak_broken: bool

class LevelInfo(BaseModel):
    current_level: int
    current_xp: int
    xp_for_next_level: int
    progress_percent: float
    title: str

# ============== LEADERBOARD ==============
class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    level: int
    total_xp: int
    current_streak: int
    achievements_count: int

# ============== DASHBOARD ==============
class DashboardData(BaseModel):
    user: UserResponse
    stats: UserStats
    active_wave: Optional[WaveResponse]
    active_phase: Optional[PhaseResponse]
    recent_logs: List[StudyLogResponse]
    achievements: List[AchievementResponse]
    level_info: LevelInfo
    daily_goal_progress: dict
    weekly_stats: dict
