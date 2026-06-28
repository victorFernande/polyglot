import os

from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import enum
from datetime import datetime

Base = declarative_base()

class WaveStatus(str, enum.Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"

class PhaseStatus(str, enum.Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Gamificação
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    last_study_date = Column(DateTime, nullable=True)
    
    # Progresso
    waves = relationship("Wave", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    study_logs = relationship("StudyLog", back_populates="user", cascade="all, delete-orphan")
    exercise_sessions = relationship("ExerciseSession", back_populates="user", cascade="all, delete-orphan")

class Wave(Base):
    __tablename__ = "waves"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    wave_number = Column(Integer)  # 1=DE, 2=FR, 3=RU, 4=JP
    language = Column(String)  # german, french, russian, japanese
    language_name = Column(String)  # Alemão, Francês, Russo, Japonês
    anchor = Column(String)  # Rammstein, etc.
    status = Column(String, default=WaveStatus.LOCKED)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Métricas
    total_xp = Column(Integer, default=0)
    vocabulary_count = Column(Integer, default=0)
    phrases_count = Column(Integer, default=0)
    hours_input = Column(Float, default=0.0)
    
    user = relationship("User", back_populates="waves")
    phases = relationship("Phase", back_populates="wave", cascade="all, delete-orphan")

class Phase(Base):
    __tablename__ = "phases"
    
    id = Column(Integer, primary_key=True, index=True)
    wave_id = Column(Integer, ForeignKey("waves.id"))
    phase_number = Column(Integer)  # 1-4
    name = Column(String)  # O Despertar, Primeiras Palavras, etc.
    status = Column(String, default=PhaseStatus.LOCKED)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Métricas
    xp_earned = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    total_tasks = Column(Integer, default=7)
    
    wave = relationship("Wave", back_populates="phases")
    tasks = relationship("Task", back_populates="phase", cascade="all, delete-orphan")

    @property
    def progress_percent(self):
        total_tasks = int(getattr(self, "total_tasks", 0) or 0)
        tasks_completed = int(getattr(self, "tasks_completed", 0) or 0)
        if total_tasks == 0:
            return 0.0
        return min((tasks_completed / total_tasks) * 100, 100.0)

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"))
    title = Column(String)
    description = Column(Text)
    xp_reward = Column(Integer, default=10)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    phase = relationship("Phase", back_populates="tasks")

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True)  # first_word, streak_7, etc.
    name = Column(String)
    description = Column(String)
    icon = Column(String)  # emoji
    xp_reward = Column(Integer, default=50)
    requirement_type = Column(String)  # streak, vocabulary, phase, wave
    requirement_value = Column(Integer)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    earned_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")

class StudyLog(Base):
    __tablename__ = "study_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(DateTime, default=datetime.utcnow)
    activity_type = Column(String)  # input, srs, shadowing, production
    duration_minutes = Column(Integer)
    xp_earned = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="study_logs")

class ExerciseLesson(Base):
    __tablename__ = "exercise_lessons"
    __table_args__ = (UniqueConstraint("language_code", "slug", name="uq_exercise_lesson_language_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    language_code = Column(String, index=True)  # de, fr, ru, jp
    language_name = Column(String)
    slug = Column(String, index=True)
    title = Column(String)
    description = Column(Text)
    order_index = Column(Integer, default=1)
    xp_base = Column(Integer, default=20)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ExerciseItem", back_populates="lesson", cascade="all, delete-orphan", order_by="ExerciseItem.order_index")
    sessions = relationship("ExerciseSession", back_populates="lesson", cascade="all, delete-orphan")

    @property
    def language(self):
        return self.language_code

    @language.setter
    def language(self, value):
        self.language_code = value

class ExerciseItem(Base):
    __tablename__ = "exercise_items"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("exercise_lessons.id"), index=True)
    order_index = Column(Integer, default=1)
    type = Column(String)  # choice, build, match
    prompt = Column(Text)
    answer = Column(JSON)
    options = Column(JSON, nullable=True)
    tiles = Column(JSON, nullable=True)
    pairs = Column(JSON, nullable=True)
    hint = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=10)

    lesson = relationship("ExerciseLesson", back_populates="items")
    answers = relationship("ExerciseAnswer", back_populates="item", cascade="all, delete-orphan")

class ExerciseSession(Base):
    __tablename__ = "exercise_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    lesson_id = Column(Integer, ForeignKey("exercise_lessons.id"), index=True)
    status = Column(String, default="in_progress")
    hearts_start = Column(Integer, default=5)
    hearts_left = Column(Integer, default=5)
    current_index = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="exercise_sessions")
    lesson = relationship("ExerciseLesson", back_populates="sessions")
    answers = relationship("ExerciseAnswer", back_populates="session", cascade="all, delete-orphan")

class ExerciseAnswer(Base):
    __tablename__ = "exercise_answers"
    __table_args__ = (UniqueConstraint("session_id", "item_id", name="uq_exercise_answer_session_item"),)

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exercise_sessions.id"), index=True)
    item_id = Column(Integer, ForeignKey("exercise_items.id"), index=True)
    payload = Column(JSON)
    is_correct = Column(Boolean, default=False)
    xp_earned = Column(Integer, default=0)
    answered_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ExerciseSession", back_populates="answers")
    item = relationship("ExerciseItem", back_populates="answers")

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./polyglot.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    # Migração defensiva: versões antigas de desenvolvimento criaram exercise_lessons.language.
    # A versão persistente final usa language_code; se o schema antigo existir, recria apenas
    # as tabelas de exercícios para não afetar usuário, ondas, tarefas nem logs.
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            tables = {row[0] for row in conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'")}
            if "exercise_lessons" in tables:
                cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(exercise_lessons)")}
                if "language_code" not in cols:
                    for table in ["exercise_answers", "exercise_sessions", "exercise_items", "exercise_lessons"]:
                        conn.exec_driver_sql(f"DROP TABLE IF EXISTS {table}")
    Base.metadata.create_all(bind=engine)
    
    # Seed achievements
    db = SessionLocal()
    try:
        achievements = [
            Achievement(code="first_step", name="Primeiro Passo", description="Complete sua primeira tarefa", icon="👣", xp_reward=10, requirement_type="task", requirement_value=1),
            Achievement(code="streak_3", name="Fogo Baixo", description="3 dias de streak", icon="🔥", xp_reward=30, requirement_type="streak", requirement_value=3),
            Achievement(code="streak_7", name="Fogo Médio", description="7 dias de streak", icon="🔥", xp_reward=70, requirement_type="streak", requirement_value=7),
            Achievement(code="streak_14", name="Fogo Alto", description="14 dias de streak", icon="🔥", xp_reward=150, requirement_type="streak", requirement_value=14),
            Achievement(code="streak_30", name="Fogo Infernal", description="30 dias de streak", icon="🔥", xp_reward=500, requirement_type="streak", requirement_value=30),
            Achievement(code="vocab_50", name="Colecionador", description="Aprenda 50 palavras", icon="📚", xp_reward=50, requirement_type="vocabulary", requirement_value=50),
            Achievement(code="vocab_100", name="Linguista", description="Aprenda 100 palavras", icon="🎓", xp_reward=100, requirement_type="vocabulary", requirement_value=100),
            Achievement(code="phase_1", name="Despertar", description="Complete a FASE 1", icon="🌅", xp_reward=50, requirement_type="phase", requirement_value=1),
            Achievement(code="phase_2", name="Primeiras Palavras", description="Complete a FASE 2", icon="💬", xp_reward=100, requirement_type="phase", requirement_value=2),
            Achievement(code="phase_3", name="Estruturas", description="Complete a FASE 3", icon="🏗️", xp_reward=150, requirement_type="phase", requirement_value=3),
            Achievement(code="boss_defeated", name="Caçador de Bosses", description="Derrote seu primeiro Boss", icon="⚔️", xp_reward=300, requirement_type="wave", requirement_value=1),
            Achievement(code="wave_1", name="Ondas Iniciante", description="Complete a Onda 1", icon="🌊", xp_reward=500, requirement_type="wave", requirement_value=1),
            Achievement(code="polyglot", name="Poliglota", description="Complete todas as 4 ondas", icon="🌍", xp_reward=5000, requirement_type="wave", requirement_value=4),
        ]
        
        for ach in achievements:
            existing = db.query(Achievement).filter(Achievement.code == ach.code).first()
            if not existing:
                db.add(ach)
        
        db.commit()
    finally:
        db.close()
