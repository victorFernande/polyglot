from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import User, Wave, Phase, Task, StudyLog, Achievement, UserAchievement, init_db, SessionLocal
from schemas import *
import math

class GamificationService:
    """Serviço central de gamificação do Polyglot"""
    
    # Sistema de níveis com títulos temáticos de Rammstein
    LEVEL_TITLES = {
        1: "Novato",
        2: "Aprendiz", 
        3: "Reise-Reise",
        4: "Herzeleid",
        5: "Sehnsucht",
        6: "Mutter",
        7: "Reise, Reise",
        8: "Rosenrot",
        9: "Liebe ist für alle da",
        10: "Deutschland",
        15: "Feuer Frei",
        20: "Mein Herz Brennt",
        25: "Ich Will",
        30: "Du Hast",
        40: "Rammstein",
        50: "Poliglota Supremo"
    }
    
    @staticmethod
    def xp_for_level(level: int) -> int:
        """XP necessário para alcançar um nível (fórmula exponencial suave)"""
        return int(100 * (level ** 1.5))
    
    @staticmethod
    def calculate_level(xp: int) -> int:
        """Calcula o nível baseado no XP total"""
        if xp < 100:
            return 1
        return int((xp / 100) ** (2/3))
    
    @staticmethod
    def get_level_title(level: int) -> str:
        """Retorna o título temático do nível"""
        # Encontra o maior título aplicável
        applicable = {k: v for k, v in GamificationService.LEVEL_TITLES.items() if k <= level}
        if not applicable:
            return "Novato"
        return applicable[max(applicable.keys())]
    
    @staticmethod
    def xp_for_activity(activity_type: ActivityType, duration: int) -> int:
        """Calcula XP baseado no tipo de atividade e duração"""
        base_xp = {
            ActivityType.INPUT: 5,
            ActivityType.SRS: 10,
            ActivityType.SHADOWING: 15,
            ActivityType.PRODUCTION: 20
        }
        
        # Bônus por duração (a cada 15 min)
        duration_bonus = (duration // 15) * 2
        
        # Bônus de streak (aplicado depois)
        return base_xp.get(activity_type, 5) + duration_bonus
    
    @staticmethod
    def check_streak(user: User) -> tuple:
        """Verifica e atualiza o streak do usuário"""
        today = datetime.utcnow().date()
        
        if user.last_study_date:
            last_date = user.last_study_date.date()
            diff = (today - last_date).days
            
            if diff == 0:
                # Já estudou hoje, mantém streak
                return True, user.current_streak, False
            elif diff == 1:
                # Estudou ontem, streak continua
                user.current_streak += 1
                if user.current_streak > user.best_streak:
                    user.best_streak = user.current_streak
                return True, user.current_streak, False
            else:
                # Streak quebrado
                broken_streak = user.current_streak
                user.current_streak = 1
                return False, 1, True
        else:
            # Primeira vez
            user.current_streak = 1
            user.best_streak = 1
            return True, 1, False
    
    @staticmethod
    def streak_multiplier(streak: int) -> float:
        """Multiplicador de XP baseado no streak"""
        if streak >= 30:
            return 2.0
        elif streak >= 14:
            return 1.5
        elif streak >= 7:
            return 1.3
        elif streak >= 3:
            return 1.1
        return 1.0
    
    @staticmethod
    def check_achievements(db: Session, user: User) -> list:
        """Verifica e concede conquistas"""
        earned = []
        
        # Buscar todas as conquistas
        all_achievements = db.query(Achievement).all()
        user_achievements = {ua.achievement_id for ua in user.achievements}
        
        for achievement in all_achievements:
            if achievement.id in user_achievements:
                continue
                
            earned_achievement = False
            
            if achievement.requirement_type == "streak":
                if user.current_streak >= achievement.requirement_value:
                    earned_achievement = True
                    
            elif achievement.requirement_type == "vocabulary":
                total_vocab = sum(w.vocabulary_count for w in user.waves)
                if total_vocab >= achievement.requirement_value:
                    earned_achievement = True
                    
            elif achievement.requirement_type == "task":
                total_tasks = sum(
                    sum(p.tasks_completed for p in w.phases)
                    for w in user.waves
                )
                if total_tasks >= achievement.requirement_value:
                    earned_achievement = True
                    
            elif achievement.requirement_type == "phase":
                completed_phases = sum(
                    1 for w in user.waves
                    for p in w.phases if p.status == PhaseStatus.COMPLETED
                )
                if completed_phases >= achievement.requirement_value:
                    earned_achievement = True
                    
            elif achievement.requirement_type == "wave":
                completed_waves = sum(
                    1 for w in user.waves if w.status == WaveStatus.COMPLETED
                )
                if completed_waves >= achievement.requirement_value:
                    earned_achievement = True
            
            if earned_achievement:
                user_ach = UserAchievement(
                    user_id=user.id,
                    achievement_id=achievement.id
                )
                db.add(user_ach)
                user.total_xp += achievement.xp_reward
                earned.append(achievement)
        
        if earned:
            db.commit()
            
        return earned
    
    @staticmethod
    def get_level_info(user: User) -> LevelInfo:
        """Retorna informações detalhadas do nível"""
        current_level = GamificationService.calculate_level(user.total_xp)
        xp_for_current = GamificationService.xp_for_level(current_level)
        xp_for_next = GamificationService.xp_for_level(current_level + 1)
        
        xp_in_level = user.total_xp - xp_for_current
        xp_needed = xp_for_next - xp_for_current
        progress = (xp_in_level / xp_needed * 100) if xp_needed > 0 else 100
        
        return LevelInfo(
            current_level=current_level,
            current_xp=user.total_xp,
            xp_for_next_level=xp_for_next,
            progress_percent=min(progress, 100),
            title=GamificationService.get_level_title(current_level)
        )
    
    @staticmethod
    def get_daily_goal_progress(user: User) -> dict:
        """Retorna progresso das metas diárias"""
        today = datetime.utcnow().date()
        
        # Buscar logs de hoje
        db = SessionLocal()
        try:
            logs_today = db.query(StudyLog).filter(
                StudyLog.user_id == user.id,
                StudyLog.date >= today
            ).all()
            
            total_minutes = sum(log.duration_minutes for log in logs_today)
            input_minutes = sum(log.duration_minutes for log in logs_today if log.activity_type == ActivityType.INPUT)
            srs_minutes = sum(log.duration_minutes for log in logs_today if log.activity_type == ActivityType.SRS)
            
            return {
                "study_goal_minutes": 45,
                "study_current_minutes": total_minutes,
                "study_percent": min(total_minutes / 45 * 100, 100),
                "input_goal_minutes": 20,
                "input_current_minutes": input_minutes,
                "input_percent": min(input_minutes / 20 * 100, 100),
                "srs_goal_minutes": 10,
                "srs_current_minutes": srs_minutes,
                "srs_percent": min(srs_minutes / 10 * 100, 100),
                "completed": total_minutes >= 45
            }
        finally:
            db.close()
    
    @staticmethod
    def get_weekly_stats(user: User) -> dict:
        """Retorna estatísticas da semana"""
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        db = SessionLocal()
        try:
            logs_week = db.query(StudyLog).filter(
                StudyLog.user_id == user.id,
                StudyLog.date >= week_ago
            ).all()
            
            daily_minutes = {}
            for log in logs_week:
                day = log.date.strftime("%a")
                daily_minutes[day] = daily_minutes.get(day, 0) + log.duration_minutes
            
            return {
                "total_minutes": sum(log.duration_minutes for log in logs_week),
                "total_xp": sum(log.xp_earned for log in logs_week),
                "sessions_count": len(logs_week),
                "daily_average": sum(log.duration_minutes for log in logs_week) / 7,
                "daily_breakdown": daily_minutes
            }
        finally:
            db.close()

class WaveService:
    """Serviço de gerenciamento de ondas e fases"""
    
    WAVE_DATA = {
        1: {
            "language": "german",
            "language_name": "Alemão",
            "anchor": "Rammstein",
            "phases": [
                {"name": "O Despertar", "total_tasks": 7},
                {"name": "Primeiras Palavras", "total_tasks": 10},
                {"name": "Estruturas", "total_tasks": 8},
                {"name": "O Boss", "total_tasks": 5}
            ]
        },
        2: {
            "language": "french",
            "language_name": "Francês",
            "anchor": "Música Francesa",
            "phases": [
                {"name": "L'Éveil", "total_tasks": 7},
                {"name": "Premiers Mots", "total_tasks": 10},
                {"name": "Structures", "total_tasks": 8},
                {"name": "Le Boss", "total_tasks": 5}
            ]
        },
        3: {
            "language": "russian",
            "language_name": "Russo",
            "anchor": "Música Russa",
            "phases": [
                {"name": "Пробуждение", "total_tasks": 7},
                {"name": "Первые Слова", "total_tasks": 10},
                {"name": "Структуры", "total_tasks": 8},
                {"name": "Босс", "total_tasks": 5}
            ]
        },
        4: {
            "language": "japanese",
            "language_name": "Japonês",
            "anchor": "Anime/Manga",
            "phases": [
                {"name": "目覚め (Mezame)", "total_tasks": 7},
                {"name": "最初の言葉", "total_tasks": 10},
                {"name": "構造", "total_tasks": 8},
                {"name": "ボス", "total_tasks": 5}
            ]
        }
    }
    
    @staticmethod
    def initialize_waves(db: Session, user_id: int):
        """Inicializa as 4 ondas para um novo usuário"""
        for wave_num, data in WaveService.WAVE_DATA.items():
            wave = Wave(
                user_id=user_id,
                wave_number=wave_num,
                language=data["language"],
                language_name=data["language_name"],
                anchor=data["anchor"],
                status=WaveStatus.ACTIVE
            )
            
            wave.started_at = datetime.utcnow()
            
            db.add(wave)
            db.flush()  # Para obter o ID
            
            # Criar fases
            for i, phase_data in enumerate(data["phases"], 1):
                phase = Phase(
                    wave_id=wave.id,
                    phase_number=i,
                    name=phase_data["name"],
                    status=PhaseStatus.ACTIVE if i == 1 else PhaseStatus.LOCKED,
                    total_tasks=phase_data["total_tasks"]
                )
                
                if i == 1:
                    phase.started_at = datetime.utcnow()
                
                db.add(phase)
                db.flush()
                
                # Criar tasks padrão para a fase 1 de cada onda
                if i == 1:
                    tasks = [
                        {"title": "Alfabeto Alemão", "description": "Aprender as 30 letras do alfabeto", "xp": 10},
                        {"title": "Vogais Umlaut", "description": "Praticar ä, ö, ü", "xp": 10},
                        {"title": "Consoantes Duras", "description": "ch, sch, ck, tz, ng", "xp": 10},
                        {"title": "R Gutural", "description": "Praticar o R da garganta", "xp": 15},
                        {"title": "Entonação", "description": "Padrões de frases e perguntas", "xp": 10},
                        {"title": "Shadowing 'Sonne'", "description": "Cantar junto com Rammstein", "xp": 20},
                        {"title": "Checkpoint FASE 1", "description": "Teste de leitura em voz alta", "xp": 25}
                    ]
                    
                    for task_data in tasks:
                        task = Task(
                            phase_id=phase.id,
                            title=task_data["title"],
                            description=task_data["description"],
                            xp_reward=task_data["xp"]
                        )
                        db.add(task)
        
        db.commit()
    
    @staticmethod
    def complete_task(db: Session, user: User, task_id: int) -> dict:
        """Completa uma tarefa e retorna recompensas"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task or task.completed:
            return {"error": "Task not found or already completed"}
        
        # Marcar como completa
        task.completed = True
        task.completed_at = datetime.utcnow()
        
        # Atualizar fase
        phase = db.query(Phase).filter(Phase.id == task.phase_id).first()
        phase.tasks_completed += 1
        phase.xp_earned += task.xp_reward
        
        # Verificar se fase completou
        phase_completed = False
        if phase.tasks_completed >= phase.total_tasks:
            phase.status = PhaseStatus.COMPLETED
            phase.completed_at = datetime.utcnow()
            phase_completed = True
            
            # XP bônus por completar fase
            phase_bonus = 50 * phase.phase_number
            phase.xp_earned += phase_bonus
            
            # Ativar próxima fase
            next_phase = db.query(Phase).filter(
                Phase.wave_id == phase.wave_id,
                Phase.phase_number == phase.phase_number + 1
            ).first()
            
            if next_phase:
                next_phase.status = PhaseStatus.ACTIVE
                next_phase.started_at = datetime.utcnow()
            else:
                # Completou todas as fases da onda
                wave = db.query(Wave).filter(Wave.id == phase.wave_id).first()
                wave.status = WaveStatus.COMPLETED
                wave.completed_at = datetime.utcnow()
                
                # Ativar próxima onda
                next_wave = db.query(Wave).filter(
                    Wave.user_id == user.id,
                    Wave.wave_number == wave.wave_number + 1
                ).first()
                
                if next_wave:
                    next_wave.status = WaveStatus.ACTIVE
                    next_wave.started_at = datetime.utcnow()
                    
                    # Ativar primeira fase da próxima onda
                    next_phase = db.query(Phase).filter(
                        Phase.wave_id == next_wave.id,
                        Phase.phase_number == 1
                    ).first()
                    if next_phase:
                        next_phase.status = PhaseStatus.ACTIVE
                        next_phase.started_at = datetime.utcnow()
        
        # Atualizar onda
        wave = db.query(Wave).filter(Wave.id == phase.wave_id).first()
        wave.total_xp += task.xp_reward + (50 * phase.phase_number if phase_completed else 0)
        
        # Atualizar usuário
        user.total_xp += task.xp_reward + (50 * phase.phase_number if phase_completed else 0)
        
        # Verificar conquistas
        new_achievements = GamificationService.check_achievements(db, user)
        
        db.commit()
        
        return {
            "xp_earned": task.xp_reward,
            "phase_completed": phase_completed,
            "phase_bonus": 50 * phase.phase_number if phase_completed else 0,
            "new_achievements": [ach.name for ach in new_achievements]
        }
