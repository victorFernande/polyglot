from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from models import init_db, SessionLocal, User, Wave, Phase, Task, StudyLog, Achievement, ExerciseLesson, ExerciseSession
from schemas import *
from services import GamificationService, WaveService, ExerciseService
from tts_service import TTSService

app = FastAPI(
    title="Polyglot API",
    description="API gamificada para aprendizado de línguas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============== INIT ==============
@app.on_event("startup")
def startup():
    init_db()

# ============== USERS ==============
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(username=user.username, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Inicializar ondas
    WaveService.initialize_waves(db, db_user.id)
    
    return db_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/stats", response_model=UserStats)
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    total_hours = sum(w.hours_input for w in user.waves)
    total_vocab = sum(w.vocabulary_count for w in user.waves)
    total_phrases = sum(w.phrases_count for w in user.waves)
    ach_count = len(user.achievements)
    
    level = GamificationService.calculate_level(user.total_xp)
    next_xp = GamificationService.xp_for_level(level + 1)
    progress = (user.total_xp / next_xp * 100) if next_xp > 0 else 100
    
    return UserStats(
        total_xp=user.total_xp,
        level=level,
        current_streak=user.current_streak,
        best_streak=user.best_streak,
        total_hours=total_hours,
        vocabulary_count=total_vocab,
        phrases_count=total_phrases,
        achievements_count=ach_count,
        next_level_xp=next_xp,
        progress_percent=min(progress, 100)
    )

# ============== WAVES ==============
@app.get("/users/{user_id}/waves", response_model=List[WaveResponse])
def get_waves(user_id: int, db: Session = Depends(get_db)):
    waves = db.query(Wave).filter(Wave.user_id == user_id).all()
    return waves

@app.get("/users/{user_id}/waves/active", response_model=Optional[WaveResponse])
def get_active_wave(user_id: int, db: Session = Depends(get_db)):
    wave = db.query(Wave).filter(
        Wave.user_id == user_id,
        Wave.status == WaveStatus.ACTIVE
    ).first()
    return wave

# ============== PHASES ==============
@app.get("/waves/{wave_id}/phases", response_model=List[PhaseResponse])
def get_phases(wave_id: int, db: Session = Depends(get_db)):
    phases = db.query(Phase).filter(Phase.wave_id == wave_id).all()
    return phases

@app.get("/phases/{phase_id}", response_model=PhaseResponse)
def get_phase(phase_id: int, db: Session = Depends(get_db)):
    phase = db.query(Phase).filter(Phase.id == phase_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return phase

# ============== TASKS ==============
@app.get("/phases/{phase_id}/tasks", response_model=List[TaskResponse])
def get_tasks(phase_id: int, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.phase_id == phase_id).all()
    return tasks

@app.post("/tasks/{task_id}/complete")
def complete_task(task_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = WaveService.complete_task(db, user, task_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

# ============== STUDY LOGS ==============
@app.post("/users/{user_id}/study", response_model=StudyLogResponse)
def log_study(user_id: int, log: StudyLogCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calcular XP
    base_xp = GamificationService.xp_for_activity(log.activity_type, log.duration_minutes)
    
    # Verificar streak
    streak_maintained, streak_count, streak_broken = GamificationService.check_streak(user)
    
    # Aplicar multiplicador de streak
    multiplier = GamificationService.streak_multiplier(streak_count)
    total_xp = int(base_xp * multiplier)
    
    # Criar log
    study_log = StudyLog(
        user_id=user_id,
        activity_type=log.activity_type,
        duration_minutes=log.duration_minutes,
        xp_earned=total_xp,
        notes=log.notes
    )
    db.add(study_log)
    
    # Atualizar usuário
    user.total_xp += total_xp
    user.last_study_date = datetime.utcnow()
    
    # Atualizar horas da onda ativa
    active_wave = db.query(Wave).filter(
        Wave.user_id == user_id,
        Wave.status == WaveStatus.ACTIVE
    ).first()
    if active_wave:
        active_wave.hours_input += log.duration_minutes / 60
    
    # Verificar conquistas
    new_achievements = GamificationService.check_achievements(db, user)
    
    db.commit()
    db.refresh(study_log)
    
    return study_log

@app.get("/users/{user_id}/logs", response_model=List[StudyLogResponse])
def get_logs(user_id: int, limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(StudyLog).filter(
        StudyLog.user_id == user_id
    ).order_by(StudyLog.date.desc()).limit(limit).all()
    return logs

# ============== ACHIEVEMENTS ==============
@app.get("/users/{user_id}/achievements", response_model=List[AchievementResponse])
def get_achievements(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    all_achievements = db.query(Achievement).all()
    user_achievements = {ua.achievement_id: ua for ua in user.achievements}
    
    result = []
    for ach in all_achievements:
        earned = ach.id in user_achievements
        earned_at = user_achievements[ach.id].earned_at if earned else None
        result.append(AchievementResponse(
            id=ach.id,
            code=ach.code,
            name=ach.name,
            description=ach.description,
            icon=ach.icon,
            xp_reward=ach.xp_reward,
            requirement_type=ach.requirement_type,
            requirement_value=ach.requirement_value,
            earned=earned,
            earned_at=earned_at
        ))
    
    return result

# ============== DASHBOARD ==============
@app.get("/users/{user_id}/dashboard")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Stats
    total_hours = sum(w.hours_input for w in user.waves)
    total_vocab = sum(w.vocabulary_count for w in user.waves)
    total_phrases = sum(w.phrases_count for w in user.waves)
    ach_count = len(user.achievements)
    
    level = GamificationService.calculate_level(user.total_xp)
    next_xp = GamificationService.xp_for_level(level + 1)
    progress = (user.total_xp / next_xp * 100) if next_xp > 0 else 100
    
    stats = UserStats(
        total_xp=user.total_xp,
        level=level,
        current_streak=user.current_streak,
        best_streak=user.best_streak,
        total_hours=total_hours,
        vocabulary_count=total_vocab,
        phrases_count=total_phrases,
        achievements_count=ach_count,
        next_level_xp=next_xp,
        progress_percent=min(progress, 100)
    )
    
    # Active wave/phase
    active_wave = db.query(Wave).filter(
        Wave.user_id == user_id,
        Wave.status == WaveStatus.ACTIVE
    ).first()
    
    active_phase = None
    if active_wave:
        active_phase = db.query(Phase).filter(
            Phase.wave_id == active_wave.id,
            Phase.status == PhaseStatus.ACTIVE
        ).first()
    
    # Recent logs
    recent_logs = db.query(StudyLog).filter(
        StudyLog.user_id == user_id
    ).order_by(StudyLog.date.desc()).limit(10).all()
    
    # Achievements
    all_achievements = db.query(Achievement).all()
    user_achievements = {ua.achievement_id: ua for ua in user.achievements}
    achievements = []
    for ach in all_achievements:
        earned = ach.id in user_achievements
        earned_at = user_achievements[ach.id].earned_at if earned else None
        achievements.append(AchievementResponse(
            id=ach.id, code=ach.code, name=ach.name,
            description=ach.description, icon=ach.icon,
            xp_reward=ach.xp_reward, requirement_type=ach.requirement_type,
            requirement_value=ach.requirement_value,
            earned=earned, earned_at=earned_at
        ))
    
    # Level info
    level_info = GamificationService.get_level_info(user)
    
    # Daily goals
    daily_goals = GamificationService.get_daily_goal_progress(user)
    
    # Weekly stats
    weekly_stats = GamificationService.get_weekly_stats(user)
    
    return {
        "user": UserResponse.model_validate(user),
        "stats": stats,
        "active_wave": WaveResponse.model_validate(active_wave) if active_wave else None,
        "active_phase": PhaseResponse.model_validate(active_phase) if active_phase else None,
        "recent_logs": [StudyLogResponse.model_validate(log) for log in recent_logs],
        "achievements": achievements,
        "level_info": level_info,
        "daily_goal_progress": daily_goals,
        "weekly_stats": weekly_stats
    }

# ============== LEADERBOARD ==============
@app.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.total_xp.desc()).limit(limit).all()
    
    result = []
    for i, user in enumerate(users, 1):
        ach_count = len(user.achievements)
        result.append(LeaderboardEntry(
            rank=i,
            username=user.username,
            level=GamificationService.calculate_level(user.total_xp),
            total_xp=user.total_xp,
            current_streak=user.current_streak,
            achievements_count=ach_count
        ))
    
    return result

# ============== XP / LEVEL ==============
@app.get("/users/{user_id}/level")
def get_level(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return GamificationService.get_level_info(user)

# ============== TTS ==============
@app.post("/tts")
async def synthesize_tts(request: TTSRequest):
    try:
        audio_path = await TTSService.synthesize(request.text, request.lang)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"TTS unavailable: {exc}")
    return FileResponse(audio_path, media_type="audio/mpeg", filename=audio_path.name)


# ============== HEALTH ==============
@app.get("/health")
def health():
    return {"status": "ok", "service": "polyglot-api"}


# ============== EXERCISES ==============
@app.post("/users/{user_id}/bootstrap")
def bootstrap_user(user_id: int, db: Session = Depends(get_db)):
    user = ExerciseService.bootstrap_user(db, user_id)
    return {"id": user.id, "username": user.username, "email": user.email, "created_at": user.created_at, "total_xp": user.total_xp, "level": user.level, "current_streak": user.current_streak, "best_streak": user.best_streak, "last_study_date": user.last_study_date, "user": UserResponse.model_validate(user), "lessons_count": len(ExerciseService.list_lessons(db, user.id))}

@app.post("/users/bootstrap")
def bootstrap_default_user(db: Session = Depends(get_db)):
    return bootstrap_user(1, db)

@app.get("/exercise-lessons", response_model=List[ExerciseLessonResponse])
def list_exercise_lessons(user_id: int = 1, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first(): ExerciseService.bootstrap_user(db, user_id)
    return ExerciseService.list_lessons(db, user_id)

@app.get("/exercise-sessions/{session_id}")
def get_exercise_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ExerciseSession).filter(ExerciseSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Exercise session not found")
    return ExerciseService.session_payload(session, include_items=True)

@app.get("/exercise-path")
def get_exercise_path(user_id: int = 1, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first(): ExerciseService.bootstrap_user(db, user_id)
    return ExerciseService.learning_path(db, user_id)

@app.get("/flashcards")
def get_flashcards(language: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    ExerciseService.seed_lessons(db)
    return ExerciseService.flashcards(db, language=language, limit=limit)

@app.get("/exercise-lessons/{lesson_id}")
def get_exercise_lesson(lesson_id: int, db: Session = Depends(get_db)):
    payload = ExerciseService.get_lesson_payload(db, lesson_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return payload

@app.post("/exercise-lessons/{lesson_id}/sessions")
def start_exercise_session(lesson_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == user_id).first(): ExerciseService.bootstrap_user(db, user_id)
    session = ExerciseService.start_session(db, user_id=user_id, lesson_id=lesson_id)
    if not session: raise HTTPException(status_code=404, detail="Exercise lesson not found")
    return ExerciseService.session_payload(session, include_items=True)

@app.post("/exercise-sessions/{session_id}/answer", response_model=ExerciseAnswerResult)
def answer_exercise_session(session_id: int, answer: ExerciseAnswerCreate, db: Session = Depends(get_db)):
    result = ExerciseService.answer_session(db, session_id=session_id, item_id=answer.item_id, payload=answer.payload)
    if not result: raise HTTPException(status_code=400, detail="Exercise session or item not available")
    return result

@app.post("/exercise-sessions/{session_id}/complete")
def complete_exercise_session(session_id: int, db: Session = Depends(get_db)):
    result = ExerciseService.complete_session(db, session_id=session_id)
    if not result: raise HTTPException(status_code=404, detail="Exercise session not found")
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
