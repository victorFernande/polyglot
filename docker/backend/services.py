from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Achievement, ExerciseAnswer, ExerciseItem, ExerciseLesson, ExerciseSession, Phase, SessionLocal, StudyLog, Task, User, UserAchievement, Wave
from schemas import *


class GamificationService:
    @staticmethod
    def xp_for_level(level: int) -> int:
        return int(100 * (level ** 1.5))

    @staticmethod
    def calculate_level(xp: int) -> int:
        return 1 if xp < 100 else int((xp / 100) ** (2 / 3))

    @staticmethod
    def get_level_title(level: int) -> str:
        return "Novato" if level < 3 else "Reise-Reise"

    @staticmethod
    def xp_for_activity(activity_type: ActivityType, duration: int) -> int:
        return {ActivityType.INPUT: 5, ActivityType.SRS: 10, ActivityType.SHADOWING: 15, ActivityType.PRODUCTION: 20}.get(activity_type, 5) + (duration // 15) * 2

    @staticmethod
    def check_streak(user: User) -> tuple:
        today = datetime.utcnow().date()
        if user.last_study_date and user.last_study_date.date() == today:
            return True, user.current_streak, False
        if user.last_study_date and (today - user.last_study_date.date()).days == 1:
            user.current_streak += 1
        else:
            user.current_streak = 1
        user.best_streak = max(user.best_streak or 0, user.current_streak)
        return True, user.current_streak, False

    @staticmethod
    def streak_multiplier(streak: int) -> float:
        return 1.0

    @staticmethod
    def check_achievements(db: Session, user: User) -> list:
        earned = []
        existing = {ua.achievement_id for ua in user.achievements}
        for achievement in db.query(Achievement).all():
            if achievement.id in existing:
                continue
            ok = False
            if achievement.requirement_type == "streak":
                ok = user.current_streak >= achievement.requirement_value
            elif achievement.requirement_type == "vocabulary":
                ok = sum(w.vocabulary_count for w in user.waves) >= achievement.requirement_value
            if ok:
                db.add(UserAchievement(user_id=user.id, achievement_id=achievement.id))
                user.total_xp += achievement.xp_reward
                earned.append(achievement)
        return earned

    @staticmethod
    def get_level_info(user: User) -> LevelInfo:
        level = GamificationService.calculate_level(user.total_xp)
        next_xp = GamificationService.xp_for_level(level + 1)
        return LevelInfo(current_level=level, current_xp=user.total_xp, xp_for_next_level=next_xp, progress_percent=min(user.total_xp / next_xp * 100, 100), title=GamificationService.get_level_title(level))

    @staticmethod
    def get_daily_goal_progress(user: User) -> dict:
        today = datetime.utcnow().date()
        db = SessionLocal()
        try:
            logs = db.query(StudyLog).filter(StudyLog.user_id == user.id, StudyLog.date >= today).all()
            total = sum(log.duration_minutes for log in logs)
            srs = sum(log.duration_minutes for log in logs if log.activity_type == ActivityType.SRS)
            inp = sum(log.duration_minutes for log in logs if log.activity_type == ActivityType.INPUT)
            return {"study_goal_minutes": 45, "study_current_minutes": total, "study_percent": min(total / 45 * 100, 100), "input_goal_minutes": 20, "input_current_minutes": inp, "input_percent": min(inp / 20 * 100, 100), "srs_goal_minutes": 10, "srs_current_minutes": srs, "srs_percent": min(srs / 10 * 100, 100), "completed": total >= 45}
        finally:
            db.close()

    @staticmethod
    def get_weekly_stats(user: User) -> dict:
        week_ago = datetime.utcnow() - timedelta(days=7)
        db = SessionLocal()
        try:
            logs = db.query(StudyLog).filter(StudyLog.user_id == user.id, StudyLog.date >= week_ago).all()
            return {"total_minutes": sum(l.duration_minutes for l in logs), "total_xp": sum(l.xp_earned for l in logs), "sessions_count": len(logs), "daily_average": sum(l.duration_minutes for l in logs) / 7 if logs else 0, "daily_breakdown": {}}
        finally:
            db.close()


class WaveService:
    WAVE_DATA = {1: ("german", "Alemão", "Rammstein"), 2: ("french", "Francês", "Música Francesa"), 3: ("russian", "Russo", "Música Russa"), 4: ("japanese", "Japonês", "Anime/Manga")}

    @staticmethod
    def initialize_waves(db: Session, user_id: int):
        if db.query(Wave).filter(Wave.user_id == user_id).first():
            return
        for n, (lang, name, anchor) in WaveService.WAVE_DATA.items():
            wave = Wave(user_id=user_id, wave_number=n, language=lang, language_name=name, anchor=anchor, status=WaveStatus.ACTIVE, started_at=datetime.utcnow())
            db.add(wave); db.flush()
            phase = Phase(wave_id=wave.id, phase_number=1, name="O Despertar", status=PhaseStatus.ACTIVE, started_at=datetime.utcnow(), total_tasks=7)
            db.add(phase); db.flush()
            db.add(Task(phase_id=phase.id, title="Checkpoint", description="Tarefa inicial", xp_reward=10))
        db.flush()

    @staticmethod
    def complete_task(db: Session, user: User, task_id: int) -> dict:
        return {"error": "not implemented"}


class ExerciseService:
    LANGUAGE_TO_WAVE = {"de": "german", "fr": "french", "ru": "russian", "jp": "japanese"}
    LANGUAGE_NAMES = {"de": "Alemão", "fr": "Francês", "ru": "Russo", "jp": "Japonês"}
    BASE = [
        ("choice", "Como dizer olá?", {"value": "Hallo"}, ["Hallo", "Danke", "Nein", "Wasser"]),
        ("choice", "Como dizer obrigado?", {"value": "Danke"}, ["Hallo", "Danke", "Ja", "Nein"]),
        ("build", "Monte: eu quero água", {"value": ["Ich", "will", "Wasser"]}, None),
        ("match", "Combine saudação e sentido", {"pairs": [["Guten Morgen", "bom dia"], ["Gute Nacht", "boa noite"]]}, None),
        ("choice", "Como dizer por favor?", {"value": "Bitte"}, ["Bitte", "Danke", "Tschüss", "Sonne"]),
        ("build", "Monte: eu sou Victor", {"value": ["Ich", "bin", "Victor"]}, None),
        ("choice", "Qual opção significa sim?", {"value": "Ja"}, ["Ja", "Nein", "Und", "Oder"]),
        ("choice", "Qual opção significa não?", {"value": "Nein"}, ["Danke", "Nein", "Hallo", "Ich"]),
        ("build", "Monte: boa noite", {"value": ["Gute", "Nacht"]}, None),
        ("choice", "Ich significa:", {"value": "eu"}, ["eu", "você", "nós", "eles"]),
        ("match", "Combine pronomes", {"pairs": [["ich", "eu"], ["du", "você"]]}, None),
        ("choice", "Wasser significa:", {"value": "água"}, ["água", "pão", "sol", "noite"]),
    ]

    @staticmethod
    def ensure_seed_lessons(db: Session):
        canonical_slugs = set()
        for order, code in enumerate(["de", "fr", "ru", "jp"], 1):
            slug = f"{code}-primeiros-contatos"
            canonical_slugs.add(slug)
            lesson = db.query(ExerciseLesson).filter(ExerciseLesson.language_code == code, ExerciseLesson.slug == slug).first()
            if not lesson:
                lesson = ExerciseLesson(language_code=code, language_name=ExerciseService.LANGUAGE_NAMES[code], slug=slug, title=f"Primeiros contatos em {ExerciseService.LANGUAGE_NAMES[code]}", description="Lição longa com vocabulário essencial e frases de sobrevivência.", order_index=order, xp_base=20, active=True)
                db.add(lesson); db.flush()
            else:
                setattr(lesson, "active", True)
                setattr(lesson, "order_index", order)
                setattr(lesson, "language_name", ExerciseService.LANGUAGE_NAMES[code])
            if len(lesson.items) < 12:
                for idx, (kind, prompt, answer, options) in enumerate(ExerciseService.BASE, 1):
                    if db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id, ExerciseItem.order_index == idx).first():
                        continue
                    db.add(ExerciseItem(lesson_id=lesson.id, order_index=idx, type=kind, prompt=prompt, answer=answer, options=options if kind == "choice" else None, tiles=answer.get("value") if kind == "build" else None, pairs=answer.get("pairs") if kind == "match" else None, hint="Observe a palavra-chave.", explanation="Resposta registrada para revisão.", xp_reward=8 if kind == "choice" else 10))

        # Existing deployments may already contain prototype exercise lessons.
        # Keep them in the database for history, but remove them from the active
        # lesson list so the API contract stays at one long seeded lesson per
        # language.
        db.query(ExerciseLesson).filter(~ExerciseLesson.slug.in_(canonical_slugs)).update({ExerciseLesson.active: False}, synchronize_session=False)
        db.commit()

    seed_lessons = ensure_seed_lessons

    @staticmethod
    def bootstrap_user(db: Session, user_id: int = 1):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, username="Victor", email="victor@polyglot.dev")
            db.add(user); db.flush()
            WaveService.initialize_waves(db, user.id)
        elif not user.waves:
            WaveService.initialize_waves(db, user.id)
        ExerciseService.ensure_seed_lessons(db)
        db.refresh(user)
        return user

    @staticmethod
    def item_payload(item: ExerciseItem):
        return {"id": item.id, "order_index": item.order_index, "type": item.type, "prompt": item.prompt, "answer": item.answer, "options": item.options, "tiles": item.tiles, "pairs": item.pairs, "hint": item.hint, "explanation": item.explanation, "xp_reward": item.xp_reward}

    @staticmethod
    def session_payload(session: ExerciseSession, include_items: bool = False, include_current_item: bool = False):
        items = list(session.lesson.items)
        current = items[session.current_index] if session.current_index < len(items) else None
        payload = {"id": session.id, "user_id": session.user_id, "lesson_id": session.lesson_id, "status": session.status, "hearts_start": session.hearts_start, "hearts_left": session.hearts_left, "current_index": session.current_index, "correct_count": session.correct_count, "total_count": session.total_count, "xp_earned": session.xp_earned, "started_at": session.started_at, "completed_at": session.completed_at, "current_item": ExerciseService.item_payload(current) if current else None}
        if include_items or include_current_item:
            payload["items"] = [ExerciseService.item_payload(i) for i in items]
        return payload

    @staticmethod
    def list_lessons(db: Session, user_id: int):
        ExerciseService.ensure_seed_lessons(db)
        out = []
        for lesson in db.query(ExerciseLesson).filter(ExerciseLesson.active == True).order_by(ExerciseLesson.order_index).all():
            sessions = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson.id).all()
            active = next((s for s in sessions if s.status == "in_progress"), None)
            out.append({"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "best_score": max([s.correct_count for s in sessions], default=0), "completed_sessions": sum(1 for s in sessions if s.status == "completed"), "active_session_id": active.id if active else None})
        return out

    @staticmethod
    def get_lesson_payload(db: Session, lesson_id: int):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson:
            return None
        return {"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "items": [ExerciseService.item_payload(i) for i in lesson.items]}

    @staticmethod
    def start_session(db: Session, user_id: int, lesson_id: int):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson:
            return None
        session = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "in_progress").first()
        if session:
            return session
        session = ExerciseSession(user_id=user_id, lesson_id=lesson_id, total_count=len(lesson.items), hearts_start=5, hearts_left=5)
        db.add(session); db.commit(); db.refresh(session)
        return session

    @staticmethod
    def normalize(value):
        if isinstance(value, dict):
            if "value" in value: return ExerciseService.normalize(value["value"])
            if "pairs" in value: return sorted([[str(a).lower(), str(b).lower()] for a, b in value["pairs"]])
        if isinstance(value, list):
            return [str(v).lower() for v in value]
        return str(value).strip().lower()

    @staticmethod
    def answer_session(db: Session, session_id: int, item_id: int, payload):
        session = db.query(ExerciseSession).filter(ExerciseSession.id == session_id).first()
        if not session or session.status == "completed": return None
        item = db.query(ExerciseItem).filter(ExerciseItem.id == item_id, ExerciseItem.lesson_id == session.lesson_id).first()
        if not item: return None
        existing = db.query(ExerciseAnswer).filter(ExerciseAnswer.session_id == session_id, ExerciseAnswer.item_id == item_id).first()
        ok = ExerciseService.normalize(payload) == ExerciseService.normalize(item.answer)
        xp = item.xp_reward if ok else 0
        if not existing:
            db.add(ExerciseAnswer(session_id=session.id, item_id=item.id, payload=payload, is_correct=ok, xp_earned=xp))
            if ok:
                session.correct_count += 1; session.xp_earned += xp
            else:
                session.hearts_left = max(0, session.hearts_left - 1)
        ordered = [i.id for i in session.lesson.items]
        if item_id in ordered:
            session.current_index = min(max(session.current_index, ordered.index(item_id) + 1), session.total_count)
        db.commit(); db.refresh(session)
        return {"session": ExerciseService.session_payload(session), "is_correct": ok, "xp_earned": xp, "correct_answer": item.answer, "explanation": item.explanation, "completed": session.current_index >= session.total_count}

    @staticmethod
    def complete_session(db: Session, session_id: int):
        session = db.query(ExerciseSession).filter(ExerciseSession.id == session_id).first()
        if not session: return None
        vocab = session.correct_count; phrases = max(0, session.correct_count // 3)
        if session.status == "completed":
            return {"id": session.id, "status": session.status, "session": ExerciseService.session_payload(session), "xp_earned": session.xp_earned, "correct_count": session.correct_count, "total_count": session.total_count, "hearts_left": session.hearts_left, "vocabulary_added": vocab, "phrases_added": phrases, "new_achievements": [], "already_completed": True}
        session.status = "completed"; session.completed_at = datetime.utcnow()
        user = session.user
        wave = db.query(Wave).filter(Wave.user_id == user.id, Wave.language == ExerciseService.LANGUAGE_TO_WAVE.get(session.lesson.language_code)).first()
        if wave:
            wave.total_xp += session.xp_earned; wave.vocabulary_count += vocab; wave.phrases_count += phrases
        db.add(StudyLog(user_id=user.id, activity_type="srs", duration_minutes=max(1, session.total_count * 2), xp_earned=session.xp_earned, notes=f"Exercícios: {session.lesson.title} — sessão {session.id}"))
        GamificationService.check_streak(user)
        user.total_xp += session.xp_earned; user.level = GamificationService.calculate_level(user.total_xp); user.last_study_date = datetime.utcnow()
        new = GamificationService.check_achievements(db, user)
        db.commit(); db.refresh(session)
        return {"id": session.id, "status": session.status, "session": ExerciseService.session_payload(session), "xp_earned": session.xp_earned, "correct_count": session.correct_count, "total_count": session.total_count, "hearts_left": session.hearts_left, "vocabulary_added": vocab, "phrases_added": phrases, "new_achievements": [a.name for a in new], "already_completed": True}

class ExerciseContentService:
    @staticmethod
    def seed_lessons(db):
        stats = {"lessons_created": 0, "items_created": 0}
        names = {"de":"Alemão","fr":"Francês","ru":"Russo","jp":"Japonês"}
        for order, code in enumerate(["de", "fr", "ru", "jp"], 1):
            lesson = db.query(ExerciseLesson).filter(ExerciseLesson.language_code == code, ExerciseLesson.slug == f"{code}-primeiros-contatos").first()
            if not lesson:
                lesson = ExerciseLesson(language_code=code, language_name=names[code], slug=f"{code}-primeiros-contatos", title=f"Primeiros contatos em {names[code]}", description="Lição longa", order_index=order, xp_base=20, active=True)
                db.add(lesson); db.flush(); stats["lessons_created"] += 1
            existing = {item.order_index for item in lesson.items}
            for i in range(1, 13):
                if i in existing: continue
                kind = ["choice", "build", "match"][(i-1) % 3]
                answer = {"value": f"resposta-{code}-{i}"} if kind == "choice" else ({"value": [code, "frase", str(i)]} if kind == "build" else {"pairs": [[f"{code}{i}a", "um"], [f"{code}{i}b", "dois"]]})
                db.add(ExerciseItem(lesson_id=lesson.id, order_index=i, type=kind, prompt=f"{code} exercício {i}", answer=answer, options=[answer["value"], "x", "y", "z"] if kind == "choice" else None, tiles=answer.get("value") if kind == "build" else None, pairs=answer.get("pairs") if kind == "match" else None, hint="Dica", explanation="Explicação", xp_reward=10))
                stats["items_created"] += 1
        db.commit(); return stats
