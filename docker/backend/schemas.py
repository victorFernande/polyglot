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


# ============== EXERCISES ==============
class ExerciseItemResponse(BaseModel):
    id: int
    order_index: int
    type: str
    prompt: str
    answer: object
    options: Optional[list] = None
    tiles: Optional[list] = None
    pairs: Optional[list] = None
    hint: Optional[str] = None
    explanation: Optional[str] = None
    xp_reward: int

    class Config:
        from_attributes = True

class ExerciseLessonResponse(BaseModel):
    id: int
    language_code: str
    language: Optional[str] = None
    language_name: str
    slug: str
    title: str
    description: str
    order_index: int
    xp_base: int
    active: bool
    items_count: int = 0
    session_size: int = 10
    total_sessions: int = 0
    best_score: int = 0
    completed_sessions: int = 0
    active_session_id: Optional[int] = None
    items: List[ExerciseItemResponse] = []

    class Config:
        from_attributes = True

class ExerciseSessionResponse(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    status: str
    hearts_start: int
    hearts_left: int
    current_index: int
    correct_count: int
    total_count: int
    xp_earned: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    current_item: Optional[ExerciseItemResponse] = None
    items: List[ExerciseItemResponse] = []

    class Config:
        from_attributes = True

class ExerciseAnswerCreate(BaseModel):
    item_id: int
    payload: object

class ExerciseAnswerResult(BaseModel):
    session: ExerciseSessionResponse
    is_correct: bool
    xp_earned: int
    correct_answer: object
    explanation: Optional[str] = None
    mistake_feedback: Optional[dict] = None
    completed: bool = False

class ExerciseCompleteResult(BaseModel):
    id: int
    status: str
    xp_earned: int
    correct_count: int
    total_count: int
    hearts_left: int
    vocabulary_added: int = 0
    phrases_added: int = 0
    new_achievements: List[str] = []
    already_completed: bool = False


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    lang: str = Field(default="pt-BR", max_length=12)
