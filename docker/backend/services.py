from datetime import datetime, timedelta
from urllib.parse import quote

from sqlalchemy.orm import Session
from models import Achievement, ExerciseAnswer, ExerciseItem, ExerciseLesson, ExerciseSession, Phase, SessionLocal, StudyLog, Task, User, UserAchievement, Wave
from schemas import *
from curriculum import A1_UNITS


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
    WAVE_DATA = {1: ("german", "Alemão", "Rammstein"), 2: ("french", "Francês", "Música Francesa"), 3: ("russian", "Russo", "Música Russa"), 4: ("japanese", "Japonês", "Anime/Manga"), 5: ("english", "Inglês", "Pop/Internet") }

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
    LANGUAGE_TO_WAVE = {"de": "german", "fr": "french", "ru": "russian", "jp": "japanese", "en": "english"}
    LANGUAGE_NAMES = {"de": "Alemão", "fr": "Francês", "ru": "Russo", "jp": "Japonês", "en": "Inglês"}
    VISUAL_VOCAB = {
        "de": [("ambulância", "Krankenwagen", "ambulance"), ("café", "Kaffee", "coffee"), ("bola", "Ball", "ball"), ("garfo", "Gabel", "fork"), ("trem", "Zug", "train"), ("casa", "Haus", "house"), ("camisa", "Hemd", "shirt"), ("telefone", "Telefon", "phone"), ("livro", "Buch", "book"), ("água", "Wasser", "water")],
        "fr": [("ambulância", "ambulance", "ambulance"), ("café", "café", "coffee"), ("bola", "ballon", "ball"), ("garfo", "fourchette", "fork"), ("trem", "train", "train"), ("casa", "maison", "house"), ("camisa", "chemise", "shirt"), ("telefone", "téléphone", "phone"), ("livro", "livre", "book"), ("água", "eau", "water")],
        "ru": [("ambulância", "скорая помощь", "ambulance"), ("café", "кофе", "coffee"), ("bola", "мяч", "ball"), ("garfo", "вилка", "fork"), ("trem", "поезд", "train"), ("casa", "дом", "house"), ("camisa", "рубашка", "shirt"), ("telefone", "телефон", "phone"), ("livro", "книга", "book"), ("água", "вода", "water")],
        "jp": [("ambulância", "救急車", "ambulance"), ("café", "コーヒー", "coffee"), ("bola", "ボール", "ball"), ("garfo", "フォーク", "fork"), ("trem", "電車", "train"), ("casa", "家", "house"), ("camisa", "シャツ", "shirt"), ("telefone", "電話", "phone"), ("livro", "本", "book"), ("água", "水", "water")],
        "en": [("ambulância", "ambulance", "ambulance"), ("café", "coffee", "coffee"), ("bola", "ball", "ball"), ("garfo", "fork", "fork"), ("trem", "train", "train"), ("casa", "house", "house"), ("camisa", "shirt", "shirt"), ("telefone", "phone", "phone"), ("livro", "book", "book"), ("água", "water", "water")],
    }

    TOPICS = [
        ("fundamentos", "Fundamentos"),
        ("numeros", "Números"),
        ("pronomes", "Pronomes"),
        ("comidas", "Comidas"),
        ("familia", "Família"),
        ("viagem", "Viagem"),
        ("tempo", "Tempo e clima"),
        ("verbos", "Verbos essenciais"),
        ("perguntas", "Perguntas"),
        ("cultura", "Cultura e mídia"),
    ]
    THEMES = {
        "de": {
            "fundamentos": [("olá","Hallo"),("obrigado","Danke"),("por favor","Bitte"),("sim","Ja"),("não","Nein"),("água","Wasser"),("noite","Nacht"),("sol","Sonne"),("música","Musik"),("livro","Buch")],
            "numeros": [("um","eins"),("dois","zwei"),("três","drei"),("quatro","vier"),("cinco","fünf"),("seis","sechs"),("sete","sieben"),("oito","acht"),("nove","neun"),("dez","zehn")],
            "pronomes": [("eu","ich"),("você/tu","du"),("ele","er"),("ela","sie"),("nós","wir"),("vocês","ihr"),("eles/elas","sie"),("meu","mein"),("seu","dein"),("nosso","unser")],
            "comidas": [("pão","Brot"),("queijo","Käse"),("maçã","Apfel"),("carne","Fleisch"),("peixe","Fisch"),("arroz","Reis"),("café","Kaffee"),("chá","Tee"),("leite","Milch"),("água","Wasser")],
            "familia": [("mãe","Mutter"),("pai","Vater"),("irmão","Bruder"),("irmã","Schwester"),("filho","Sohn"),("filha","Tochter"),("família","Familie"),("amigo","Freund"),("criança","Kind"),("avó","Großmutter")],
            "viagem": [("trem","Zug"),("avião","Flugzeug"),("hotel","Hotel"),("rua","Straße"),("estação","Bahnhof"),("bilhete","Ticket"),("passaporte","Pass"),("cidade","Stadt"),("mapa","Karte"),("ajuda","Hilfe")],
            "tempo": [("hoje","heute"),("amanhã","morgen"),("ontem","gestern"),("chuva","Regen"),("sol","Sonne"),("frio","kalt"),("quente","warm"),("semana","Woche"),("hora","Stunde"),("dia","Tag")],
            "verbos": [("ser/estar","sein"),("ter","haben"),("querer","wollen"),("ir","gehen"),("fazer","machen"),("ver","sehen"),("ouvir","hören"),("comer","essen"),("beber","trinken"),("aprender","lernen")],
            "perguntas": [("quem","wer"),("o quê","was"),("onde","wo"),("quando","wann"),("por quê","warum"),("como","wie"),("quanto","wie viel"),("qual","welche"),("você entende?","Verstehst du?"),("onde fica?","Wo ist?")],
            "cultura": [("canção","Lied"),("filme","Film"),("notícia","Nachricht"),("jogo","Spiel"),("arte","Kunst"),("história","Geschichte"),("futebol","Fußball"),("teatro","Theater"),("museu","Museum"),("Rammstein","Rammstein")],
        },
        "fr": {
            "fundamentos": [("olá","bonjour"),("obrigado","merci"),("por favor","s'il vous plaît"),("sim","oui"),("não","non"),("água","eau"),("noite","nuit"),("sol","soleil"),("música","musique"),("livro","livre")],
            "numeros": [("um","un"),("dois","deux"),("três","trois"),("quatro","quatre"),("cinco","cinq"),("seis","six"),("sete","sept"),("oito","huit"),("nove","neuf"),("dez","dix")],
            "pronomes": [("eu","je"),("você/tu","tu"),("ele","il"),("ela","elle"),("nós","nous"),("vocês","vous"),("eles","ils"),("meu","mon"),("seu","ton"),("nosso","notre")],
            "comidas": [("pão","pain"),("queijo","fromage"),("maçã","pomme"),("carne","viande"),("peixe","poisson"),("arroz","riz"),("café","café"),("chá","thé"),("leite","lait"),("água","eau")],
            "familia": [("mãe","mère"),("pai","père"),("irmão","frère"),("irmã","sœur"),("filho","fils"),("filha","fille"),("família","famille"),("amigo","ami"),("criança","enfant"),("avó","grand-mère")],
            "viagem": [("trem","train"),("avião","avion"),("hotel","hôtel"),("rua","rue"),("estação","gare"),("bilhete","billet"),("passaporte","passeport"),("cidade","ville"),("mapa","carte"),("ajuda","aide")],
            "tempo": [("hoje","aujourd'hui"),("amanhã","demain"),("ontem","hier"),("chuva","pluie"),("sol","soleil"),("frio","froid"),("quente","chaud"),("semana","semaine"),("hora","heure"),("dia","jour")],
            "verbos": [("ser/estar","être"),("ter","avoir"),("querer","vouloir"),("ir","aller"),("fazer","faire"),("ver","voir"),("ouvir","entendre"),("comer","manger"),("beber","boire"),("aprender","apprendre")],
            "perguntas": [("quem","qui"),("o quê","quoi"),("onde","où"),("quando","quand"),("por quê","pourquoi"),("como","comment"),("quanto","combien"),("qual","quel"),("você entende?","tu comprends?"),("onde fica?","où est?")],
            "cultura": [("canção","chanson"),("filme","film"),("notícia","nouvelle"),("jogo","jeu"),("arte","art"),("história","histoire"),("futebol","football"),("teatro","théâtre"),("museu","musée"),("Paris","Paris")],
        },
        "ru": {
            "fundamentos": [("olá","привет"),("obrigado","спасибо"),("por favor","пожалуйста"),("sim","да"),("não","нет"),("água","вода"),("noite","ночь"),("sol","солнце"),("música","музыка"),("livro","книга")],
            "numeros": [("um","один"),("dois","два"),("três","три"),("quatro","четыре"),("cinco","пять"),("seis","шесть"),("sete","семь"),("oito","восемь"),("nove","девять"),("dez","десять")],
            "pronomes": [("eu","я"),("você/tu","ты"),("ele","он"),("ela","она"),("nós","мы"),("vocês","вы"),("eles/elas","они"),("meu","мой"),("seu","твой"),("nosso","наш")],
            "comidas": [("pão","хлеб"),("queijo","сыр"),("maçã","яблоко"),("carne","мясо"),("peixe","рыба"),("arroz","рис"),("café","кофе"),("chá","чай"),("leite","молоко"),("água","вода")],
            "familia": [("mãe","мама"),("pai","папа"),("irmão","брат"),("irmã","сестра"),("filho","сын"),("filha","дочь"),("família","семья"),("amigo","друг"),("criança","ребёнок"),("avó","бабушка")],
            "viagem": [("trem","поезд"),("avião","самолёт"),("hotel","отель"),("rua","улица"),("estação","станция"),("bilhete","билет"),("passaporte","паспорт"),("cidade","город"),("mapa","карта"),("ajuda","помощь")],
            "tempo": [("hoje","сегодня"),("amanhã","завтра"),("ontem","вчера"),("chuva","дождь"),("sol","солнце"),("frio","холодно"),("quente","тепло"),("semana","неделя"),("hora","час"),("dia","день")],
            "verbos": [("ser/estar","быть"),("ter","иметь"),("querer","хотеть"),("ir","идти"),("fazer","делать"),("ver","видеть"),("ouvir","слышать"),("comer","есть"),("beber","пить"),("aprender","учить")],
            "perguntas": [("quem","кто"),("o quê","что"),("onde","где"),("quando","когда"),("por quê","почему"),("como","как"),("quanto","сколько"),("qual","какой"),("você entende?","ты понимаешь?"),("onde fica?","где находится?")],
            "cultura": [("canção","песня"),("filme","фильм"),("notícia","новость"),("jogo","игра"),("arte","искусство"),("história","история"),("futebol","футбол"),("teatro","театр"),("museu","музей"),("Moscou","Москва")],
        },
        "jp": {
            "fundamentos": [("olá","こんにちは"),("obrigado","ありがとう"),("por favor","ください"),("sim","はい"),("não","いいえ"),("água","水"),("noite","夜"),("sol","太陽"),("música","音楽"),("livro","本")],
            "numeros": [("um","一"),("dois","二"),("três","三"),("quatro","四"),("cinco","五"),("seis","六"),("sete","七"),("oito","八"),("nove","九"),("dez","十")],
            "pronomes": [("eu","私"),("você","あなた"),("ele","彼"),("ela","彼女"),("nós","私たち"),("vocês","あなたたち"),("eles/elas","彼ら"),("meu","私の"),("seu","あなたの"),("nosso","私たちの")],
            "comidas": [("pão","パン"),("queijo","チーズ"),("maçã","りんご"),("carne","肉"),("peixe","魚"),("arroz","ご飯"),("café","コーヒー"),("chá","お茶"),("leite","牛乳"),("água","水")],
            "familia": [("mãe","母"),("pai","父"),("irmão","兄弟"),("irmã","姉妹"),("filho","息子"),("filha","娘"),("família","家族"),("amigo","友達"),("criança","子供"),("avó","祖母")],
            "viagem": [("trem","電車"),("avião","飛行機"),("hotel","ホテル"),("rua","通り"),("estação","駅"),("bilhete","切符"),("passaporte","パスポート"),("cidade","町"),("mapa","地図"),("ajuda","助け")],
            "tempo": [("hoje","今日"),("amanhã","明日"),("ontem","昨日"),("chuva","雨"),("sol","太陽"),("frio","寒い"),("quente","暑い"),("semana","週"),("hora","時間"),("dia","日")],
            "verbos": [("ser/estar","です"),("ter","持つ"),("querer","ほしい"),("ir","行く"),("fazer","する"),("ver","見る"),("ouvir","聞く"),("comer","食べる"),("beber","飲む"),("aprender","学ぶ")],
            "perguntas": [("quem","誰"),("o quê","何"),("onde","どこ"),("quando","いつ"),("por quê","なぜ"),("como","どう"),("quanto","いくら"),("qual","どれ"),("você entende?","分かりますか"),("onde fica?","どこですか")],
            "cultura": [("canção","歌"),("filme","映画"),("notícia","ニュース"),("jogo","ゲーム"),("arte","芸術"),("história","歴史"),("futebol","サッカー"),("teatro","劇場"),("museu","博物館"),("anime","アニメ")],
        },

        "en": {
            "fundamentos": [("olá","hello"),("obrigado","thank you"),("por favor","please"),("sim","yes"),("não","no"),("água","water"),("noite","night"),("sol","sun"),("música","music"),("livro","book")],
            "numeros": [("um","one"),("dois","two"),("três","three"),("quatro","four"),("cinco","five"),("seis","six"),("sete","seven"),("oito","eight"),("nove","nine"),("dez","ten")],
            "pronomes": [("eu","I"),("você","you"),("ele","he"),("ela","she"),("nós","we"),("vocês/eles","they"),("meu","my"),("seu","your"),("nosso","our"),("deles","their")],
            "comidas": [("pão","bread"),("queijo","cheese"),("maçã","apple"),("carne","meat"),("peixe","fish"),("arroz","rice"),("café","coffee"),("chá","tea"),("leite","milk"),("água","water")],
            "familia": [("mãe","mother"),("pai","father"),("irmão","brother"),("irmã","sister"),("filho","son"),("filha","daughter"),("família","family"),("amigo","friend"),("criança","child"),("avó","grandmother")],
            "viagem": [("trem","train"),("avião","airplane"),("hotel","hotel"),("rua","street"),("estação","station"),("bilhete","ticket"),("passaporte","passport"),("cidade","city"),("mapa","map"),("ajuda","help")],
            "tempo": [("hoje","today"),("amanhã","tomorrow"),("ontem","yesterday"),("chuva","rain"),("sol","sun"),("frio","cold"),("quente","hot"),("semana","week"),("hora","hour"),("dia","day")],
            "verbos": [("ser/estar","be"),("ter","have"),("querer","want"),("ir","go"),("fazer","do"),("ver","see"),("ouvir","hear"),("comer","eat"),("beber","drink"),("aprender","learn")],
            "perguntas": [("quem","who"),("o quê","what"),("onde","where"),("quando","when"),("por quê","why"),("como","how"),("quanto","how much"),("qual","which"),("você entende?","do you understand?"),("onde fica?","where is it?")],
            "cultura": [("canção","song"),("filme","movie"),("notícia","news"),("jogo","game"),("arte","art"),("história","history"),("futebol","soccer"),("teatro","theater"),("museu","museum"),("internet","internet")],
        },
    }
    SESSION_SIZE = 10
    TARGET_ITEMS = 1000

    @staticmethod
    def _choice(prompt, answer, options, idx):
        opts = list(dict.fromkeys([answer] + options))[:4]
        return {"type":"choice","prompt":prompt,"answer":{"value":answer},"options":opts,"tiles":None,"pairs":None,"hint":"Escolha a opção correta e fale em voz alta antes de confirmar.","explanation":f"Resposta correta: {answer}.","xp_reward":8 + (idx % 3)}

    @staticmethod
    def _build(prompt, words, extras, idx):
        tiles = list(dict.fromkeys(extras + words))
        return {"type":"build","prompt":prompt,"answer":{"value":words},"options":None,"tiles":tiles,"pairs":None,"hint":"Monte a frase na ordem natural do idioma.","explanation":"Frases curtas ajudam a fixar padrões sem decorar regras isoladas.","xp_reward":10 + (idx % 4)}

    @staticmethod
    def _match(prompt, pairs, idx):
        return {"type":"match","prompt":prompt,"answer":{"pairs":pairs},"options":None,"tiles":None,"pairs":pairs,"hint":"Combine pelo significado, não pela aparência da palavra.","explanation":"Matching fortalece reconhecimento rápido de vocabulário.","xp_reward":12 + (idx % 4)}

    @staticmethod
    def _icon_svg(icon_key: str, idx: int):
        bg = ["#dbeafe", "#ffedd5", "#dcfce7", "#fae8ff", "#fef9c3", "#fee2e2"][idx % 6]
        icons = {
            "ambulance": '<rect x="16" y="38" width="58" height="26" rx="6" fill="#fff" stroke="#ef4444" stroke-width="4"/><rect x="55" y="30" width="18" height="34" rx="4" fill="#fff" stroke="#ef4444" stroke-width="4"/><path d="M33 44v14M26 51h14" stroke="#ef4444" stroke-width="5"/><circle cx="29" cy="70" r="7" fill="#111827"/><circle cx="65" cy="70" r="7" fill="#111827"/>' ,
            "coffee": '<rect x="25" y="38" width="36" height="30" rx="8" fill="#92400e"/><path d="M61 45h8a8 8 0 0 1 0 16h-8" fill="none" stroke="#92400e" stroke-width="5"/><path d="M34 30c-5-6 5-8 0-14M47 30c-5-6 5-8 0-14" stroke="#6b7280" stroke-width="4" fill="none"/><rect x="22" y="70" width="50" height="6" rx="3" fill="#fb923c"/>',
            "ball": '<circle cx="48" cy="48" r="30" fill="#fff" stroke="#111827" stroke-width="4"/><path d="M48 18v60M18 48h60M28 28c14 12 26 12 40 0M28 68c14-12 26-12 40 0" stroke="#2563eb" stroke-width="4" fill="none"/>',
            "fork": '<path d="M32 18v32M42 18v32M52 18v32M32 50c0 10 20 10 20 0" stroke="#64748b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M42 50v30" stroke="#64748b" stroke-width="7" stroke-linecap="round"/>',
            "train": '<rect x="24" y="18" width="48" height="52" rx="10" fill="#2563eb"/><rect x="32" y="28" width="32" height="16" rx="3" fill="#bfdbfe"/><circle cx="36" cy="56" r="5" fill="#fff"/><circle cx="60" cy="56" r="5" fill="#fff"/><path d="M34 78h28" stroke="#111827" stroke-width="5"/>',
            "house": '<path d="M18 45l30-25 30 25" fill="#f97316"/><rect x="26" y="44" width="44" height="34" rx="4" fill="#fb923c"/><rect x="42" y="56" width="12" height="22" fill="#7c2d12"/>',
            "shirt": '<path d="M30 24l10 8h16l10-8 14 14-10 12-6-5v33H32V45l-6 5-10-12 14-14z" fill="#22c55e" stroke="#166534" stroke-width="3"/>',
            "phone": '<rect x="32" y="14" width="32" height="68" rx="8" fill="#111827"/><rect x="37" y="22" width="22" height="46" rx="3" fill="#38bdf8"/><circle cx="48" cy="74" r="3" fill="#fff"/>',
            "book": '<path d="M18 22h28c7 0 10 4 10 10v44H28c-6 0-10-4-10-10V22z" fill="#8b5cf6"/><path d="M56 32c0-6 4-10 10-10h12v54H56V32z" fill="#a78bfa"/><path d="M30 36h16M30 48h16" stroke="#fff" stroke-width="4"/>',
            "water": '<path d="M48 16c16 20 24 32 24 45a24 24 0 0 1-48 0c0-13 8-25 24-45z" fill="#38bdf8"/><circle cx="40" cy="56" r="7" fill="#bae6fd"/>',
            "bread": '<path d="M20 50c0-17 12-30 28-30s28 13 28 30v12c0 8-6 14-14 14H34c-8 0-14-6-14-14V50z" fill="#d97706"/><path d="M32 40c6-8 14-8 20 0M48 38c6-7 13-7 18 0" stroke="#fef3c7" stroke-width="5" fill="none" stroke-linecap="round"/>',
            "person": '<circle cx="48" cy="30" r="13" fill="#f59e0b"/><path d="M24 78c3-17 13-27 24-27s21 10 24 27" fill="#2563eb"/><path d="M34 62h28" stroke="#bfdbfe" stroke-width="4"/>',
            "clock": '<circle cx="48" cy="48" r="31" fill="#fff" stroke="#0f172a" stroke-width="5"/><path d="M48 28v22l15 9" stroke="#0f172a" stroke-width="5" fill="none" stroke-linecap="round"/>',
        }
        shape = icons.get(icon_key, icons["book"])
        return f'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="22" fill="{bg}"/>{shape}</svg>'

    @staticmethod
    def _svg_data_uri(svg: str) -> str:
        return f"data:image/svg+xml;charset=UTF-8,{quote(svg, safe='')}"

    @staticmethod
    def _icon_key_for_phrase(portuguese: str, foreign: str, topic: str = "") -> str:
        text = f"{portuguese} {foreign}".casefold()
        keyword_icons = [
            (("olá", "hallo", "hello", "bonjour", "привет", "здравствуйте", "こんにちは", "cumprimentar"), "person"),
            (("café", "kaffee", "coffee", "кофе", "コーヒー"), "coffee"),
            (("água", "wasser", "water", "eau", "воду", "вода", "水"), "water"),
            (("pão", "brot", "bread", "pain", "хлеб", "パン"), "bread"),
            (("trem", "estação", "bahnhof", "station", "gare", "вокзал", "駅"), "train"),
            (("casa", "moro", "moradia", "wohne", "home", "house", "maison", "дом", "家"), "house"),
            (("camisa", "casaco", "roup", "hemd", "shirt", "chemise", "рубаш", "シャツ"), "shirt"),
            (("telefone", "phone", "téléphone", "телефон", "電話"), "phone"),
            (("livro", "estudo", "learn", "lerne", "study", "уч", "勉強", "本"), "book"),
            (("conta", "preço", "custa", "quanto", "bill", "price", "combien", "сколько", "いくら"), "clock"),
            (("nome", "professor", "irmã", "irmão", "mãe", "pai", "família", "victor", "teacher", "sister", "brother", "名前", "先生"), "person"),
            (("comida", "prato", "garfo", "frango", "restaurante", "gabel", "fork", "fourchette", "вилка", "フォーク"), "fork"),
            (("bola", "esporte", "futebol", "ball", "football", "футбол", "サッカー"), "ball"),
        ]
        for keywords, icon_key in keyword_icons:
            if any(keyword in text for keyword in keywords):
                return icon_key
        return "book"

    @staticmethod
    def _image_choice(prompt, answer, options, idx):
        unique = []
        seen = set()
        for portuguese, foreign, icon_key in [(answer[0], answer[1], answer[2])] + options:
            key = str(foreign).casefold()
            if key in seen:
                continue
            svg = ExerciseService._icon_svg(icon_key, len(unique))
            unique.append({"label_pt": portuguese, "value": foreign, "icon_key": icon_key, "svg": svg, "image_src": ExerciseService._svg_data_uri(svg)})
            seen.add(key)
            if len(unique) == 4:
                break
        return {"type":"image_choice","prompt":prompt,"answer":{"value":answer[1]},"options":unique,"tiles":None,"pairs":None,"hint":"Olhe o ícone, leia o significado em português e escolha a palavra/frase correta no idioma estudado.","explanation":f"A imagem correta representa: {answer[0]} = {answer[1]}.","xp_reward":9 + (idx % 3)}

    @staticmethod
    def _image_choice_from_phrases(prefix, phrases, answer_index, idx, topic_name):
        answer_pt, answer_foreign = phrases[answer_index]
        answer = (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, topic_name))
        distractors = []
        for option_index, (pt, foreign) in enumerate(phrases):
            if option_index == answer_index:
                continue
            distractors.append((pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, topic_name)))
            if len(distractors) == 3:
                break
        prompt = f"{prefix}: escolha a imagem/frase que representa “{answer_pt}” ({answer_foreign})"
        return ExerciseService._image_choice(prompt, answer, distractors, idx)

    @staticmethod
    def _matching_sample(vocab, start, size=4):
        sample = []
        seen_foreign = set()
        seen_portuguese = set()
        for portuguese, foreign in vocab[start:] + vocab[:start]:
            foreign_key = str(foreign).casefold()
            portuguese_key = str(portuguese).casefold()
            if foreign_key in seen_foreign or portuguese_key in seen_portuguese:
                continue
            sample.append((portuguese, foreign))
            seen_foreign.add(foreign_key)
            seen_portuguese.add(portuguese_key)
            if len(sample) == size:
                break
        return sample

    @staticmethod
    def _items_need_regeneration(lesson: ExerciseLesson, generated: list[dict]) -> bool:
        existing = sorted(list(lesson.items), key=lambda item: item.order_index)
        if len(existing) != len(generated):
            return True
        for item, expected in zip(existing, generated):
            if (
                item.type != expected["type"]
                or item.prompt != expected["prompt"]
                or item.answer != expected["answer"]
                or item.options != expected["options"]
                or item.tiles != expected["tiles"]
                or item.pairs != expected["pairs"]
                or item.hint != expected["hint"]
                or item.explanation != expected["explanation"]
                or item.xp_reward != expected["xp_reward"]
            ):
                return True
        return False

    @staticmethod
    def generate_items(code: str):
        name = ExerciseService.LANGUAGE_NAMES[code]
        items = []
        for unit_index, unit in enumerate(A1_UNITS, 1):
            phrases = unit["phrases"][code]
            all_foreign = [foreign for _pt, foreign in phrases]
            for topic_index, topic_name in enumerate(unit["topics"], 1):
                for question_index, (pt, target) in enumerate(phrases, 1):
                    idx = (unit_index - 1) * 100 + (topic_index - 1) * 10 + question_index
                    prefix = f"Unidade {unit_index}/10 — {unit['title']} · Tópico {topic_index}/10 — {topic_name}"
                    hint = f"Mini-aula: {unit['goal']} Foque na situação comunicativa antes de decorar palavras isoladas."
                    explanation = f"{unit['title']}: “{target}” corresponde a “{pt}”. Use esta frase pronta como bloco real de comunicação em {name}."
                    mode = question_index % 3
                    if question_index == 4:
                        item = ExerciseService._image_choice_from_phrases(prefix, phrases, topic_index - 1, idx, topic_name)
                    elif mode == 1:
                        wrong = [x for x in all_foreign if x != target][:3]
                        item = ExerciseService._choice(f"{prefix}: como dizer “{pt}” em {name}?", target, wrong, idx)
                    elif mode == 2:
                        words = target.split()
                        extras = [word for foreign in all_foreign[:5] for word in foreign.split()]
                        item = ExerciseService._build(f"{prefix}: monte a frase “{pt}”", words, extras, idx)
                    else:
                        sample = ExerciseService._matching_sample(phrases, question_index - 1)
                        pairs = [[foreign, portuguese] for portuguese, foreign in sample]
                        item = ExerciseService._match(f"{prefix}: combine frases úteis", pairs, idx)
                    item["hint"] = hint
                    if item["type"] != "image_choice":
                        item["explanation"] = explanation
                    items.append(item)
        return items[:ExerciseService.TARGET_ITEMS]

    @staticmethod
    def ensure_seed_lessons(db: Session):
        canonical_slugs = set()
        for order, code in enumerate(["de", "fr", "ru", "jp", "en"], 1):
            slug = f"{code}-trilha-a1-situacional-1000"
            canonical_slugs.add(slug)
            lesson = db.query(ExerciseLesson).filter(ExerciseLesson.language_code == code, ExerciseLesson.slug == slug).first()
            if not lesson:
                lesson = ExerciseLesson(language_code=code, language_name=ExerciseService.LANGUAGE_NAMES[code], slug=slug, title=f"Trilha A1 Situacional 1000 — {ExerciseService.LANGUAGE_NAMES[code]}", description="1000 exercícios em 10 unidades comunicativas: café, apresentação, viagem, restaurante, contato, família, trabalho no presente, roupas, hábitos e preferências. Cada unidade tem 10 tópicos e cada tópico tem 10 questões.", order_index=order, xp_base=20, active=True)
                db.add(lesson); db.flush()
            else:
                lesson.active = True; lesson.order_index = order; lesson.language_name = ExerciseService.LANGUAGE_NAMES[code]; lesson.title = f"Trilha A1 Situacional 1000 — {ExerciseService.LANGUAGE_NAMES[code]}"; lesson.description = "1000 exercícios em 10 unidades comunicativas: café, apresentação, viagem, restaurante, contato, família, trabalho no presente, roupas, hábitos e preferências. Cada unidade tem 10 tópicos e cada tópico tem 10 questões."
            generated = ExerciseService.generate_items(code)
            if ExerciseService._items_need_regeneration(lesson, generated):
                db.query(ExerciseItem).filter(ExerciseItem.lesson_id == lesson.id).delete(); db.flush()
                for idx, item in enumerate(generated, 1):
                    db.add(ExerciseItem(lesson_id=lesson.id, order_index=idx, type=item["type"], prompt=item["prompt"], answer=item["answer"], options=item["options"], tiles=item["tiles"], pairs=item["pairs"], hint=item["hint"], explanation=item["explanation"], xp_reward=item["xp_reward"]))
        db.query(ExerciseLesson).filter(~ExerciseLesson.slug.in_(canonical_slugs)).update({ExerciseLesson.active: False}, synchronize_session=False)
        db.commit()

    seed_lessons = ensure_seed_lessons

    @staticmethod
    def bootstrap_user(db: Session, user_id: int = 1):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            username = "Victor" if user_id == 1 else f"Victor{user_id}"
            email = "victor@polyglot.dev" if user_id == 1 else f"victor+{user_id}@polyglot.dev"
            user = User(id=user_id, username=username, email=email)
            db.add(user); db.flush(); WaveService.initialize_waves(db, user.id)
        elif not user.waves:
            WaveService.initialize_waves(db, user.id)
        ExerciseService.ensure_seed_lessons(db); db.refresh(user); return user

    @staticmethod
    def item_payload(item: ExerciseItem):
        return {"id": item.id, "order_index": item.order_index, "type": item.type, "prompt": item.prompt, "answer": item.answer, "options": item.options, "tiles": item.tiles, "pairs": item.pairs, "hint": item.hint, "explanation": item.explanation, "xp_reward": item.xp_reward}

    @staticmethod
    def _session_number(db: Session, session: ExerciseSession):
        sessions = db.query(ExerciseSession).filter(ExerciseSession.user_id == session.user_id, ExerciseSession.lesson_id == session.lesson_id).order_by(ExerciseSession.id).all()
        return [s.id for s in sessions].index(session.id)

    @staticmethod
    def session_items(db: Session, session: ExerciseSession):
        items = list(session.lesson.items)
        chunks = max(1, (len(items) + ExerciseService.SESSION_SIZE - 1) // ExerciseService.SESSION_SIZE)
        number = ExerciseService._session_number(db, session)
        offset = (number % chunks) * ExerciseService.SESSION_SIZE
        return items[offset:offset + ExerciseService.SESSION_SIZE]

    @staticmethod
    def session_payload(session: ExerciseSession, include_items: bool = False, include_current_item: bool = False, db: Session | None = None):
        created_db = db is None
        db = db or SessionLocal()
        items = ExerciseService.session_items(db, session)
        current = items[session.current_index] if session.current_index < len(items) else None
        payload = {"id": session.id, "user_id": session.user_id, "lesson_id": session.lesson_id, "status": session.status, "hearts_start": session.hearts_start, "hearts_left": session.hearts_left, "current_index": session.current_index, "correct_count": session.correct_count, "total_count": session.total_count, "xp_earned": session.xp_earned, "started_at": session.started_at, "completed_at": session.completed_at, "current_item": ExerciseService.item_payload(current) if current else None}
        if include_items or include_current_item:
            payload["items"] = [ExerciseService.item_payload(i) for i in items]
        if created_db:
            db.close()
        return payload

    @staticmethod
    def list_lessons(db: Session, user_id: int):
        ExerciseService.ensure_seed_lessons(db); out = []
        for lesson in db.query(ExerciseLesson).filter(ExerciseLesson.active == True).order_by(ExerciseLesson.order_index).all():
            sessions = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson.id).all()
            active = next((s for s in sessions if s.status == "in_progress"), None)
            completed = [s for s in sessions if s.status == "completed"]
            total_sessions = (len(lesson.items) + ExerciseService.SESSION_SIZE - 1) // ExerciseService.SESSION_SIZE
            out.append({"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "session_size": ExerciseService.SESSION_SIZE, "total_sessions": total_sessions, "best_score": max([s.correct_count for s in completed], default=0), "completed_sessions": len(completed), "active_session_id": active.id if active else None})
        return out

    @staticmethod
    def learning_path(db: Session, user_id: int):
        lessons = ExerciseService.list_lessons(db, user_id)
        return [{**lesson, "nodes": [{"number": i + 1, "status": "completed" if i < lesson["completed_sessions"] else ("current" if i == lesson["completed_sessions"] else "locked"), "questions": lesson["session_size"]} for i in range(lesson["total_sessions"])]} for lesson in lessons]

    @staticmethod
    def get_lesson_payload(db: Session, lesson_id: int):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson: return None
        return {"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "session_size": ExerciseService.SESSION_SIZE, "total_sessions": (len(lesson.items)+ExerciseService.SESSION_SIZE-1)//ExerciseService.SESSION_SIZE, "items": [ExerciseService.item_payload(i) for i in lesson.items]}

    @staticmethod
    def start_session(db: Session, user_id: int, lesson_id: int):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson: return None
        session = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "in_progress").first()
        if session:
            if int(session.current_index or 0) < int(session.total_count or 0):
                return session
            ExerciseService.complete_session(db, session.id)
        completed_count = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "completed").count()
        total_sessions = max(1, (len(lesson.items) + ExerciseService.SESSION_SIZE - 1) // ExerciseService.SESSION_SIZE)
        offset = (completed_count % total_sessions) * ExerciseService.SESSION_SIZE
        count = min(ExerciseService.SESSION_SIZE, len(lesson.items) - offset)
        session = ExerciseSession(user_id=user_id, lesson_id=lesson_id, total_count=count, hearts_start=5, hearts_left=5, current_index=0)
        db.add(session); db.commit(); db.refresh(session); return session

    @staticmethod
    def normalize(value):
        if isinstance(value, dict):
            if "value" in value: return ExerciseService.normalize(value["value"])
            if "pairs" in value: return sorted([[str(a).casefold(), str(b).casefold()] for a, b in value["pairs"]])
            return sorted([[str(a).casefold(), str(b).casefold()] for a, b in value.items()])
        if isinstance(value, list): return [str(v).casefold() for v in value]
        return str(value).strip().casefold()

    @staticmethod
    def readable_answer(value):
        if isinstance(value, dict):
            if "value" in value:
                return ExerciseService.readable_answer(value["value"])
            if "pairs" in value:
                return "; ".join([f"{left} = {right}" for left, right in value["pairs"]])
            return "; ".join([f"{left} = {right}" for left, right in value.items()])
        if isinstance(value, list):
            return " ".join([str(v) for v in value])
        return str(value)

    @staticmethod
    def mistake_feedback(payload, correct_answer, explanation):
        your_answer = ExerciseService.readable_answer(payload)
        expected = ExerciseService.readable_answer(correct_answer)
        return {
            "your_answer": payload,
            "correct_answer": correct_answer,
            "message": f"Você respondeu: {your_answer}. Resposta correta: {expected}.",
            "explanation": explanation or "Compare sua resposta com a forma correta antes de seguir para fixar o padrão.",
        }

    @staticmethod
    def answer_session(db: Session, session_id: int, item_id: int, payload):
        session = db.query(ExerciseSession).filter(ExerciseSession.id == session_id).first()
        if not session or session.status == "completed": return None
        items = ExerciseService.session_items(db, session)
        allowed = [i.id for i in items]
        if item_id not in allowed: return None
        item = db.query(ExerciseItem).filter(ExerciseItem.id == item_id).first()
        existing = db.query(ExerciseAnswer).filter(ExerciseAnswer.session_id == session_id, ExerciseAnswer.item_id == item_id).first()
        ok = ExerciseService.normalize(payload) == ExerciseService.normalize(item.answer)
        xp = item.xp_reward if ok else 0
        if not existing:
            db.add(ExerciseAnswer(session_id=session.id, item_id=item.id, payload=payload, is_correct=ok, xp_earned=xp))
            if ok:
                session.correct_count += 1
                session.xp_earned += xp
                session.current_index = min(max(session.current_index, allowed.index(item_id) + 1), session.total_count)
            else:
                session.hearts_left = max(0, session.hearts_left - 1)
                session.current_index = min(max(session.current_index, allowed.index(item_id) + 1), session.total_count)
        elif not existing.is_correct and ok:
            existing.payload = payload
            existing.is_correct = True
            existing.xp_earned = xp
            session.correct_count += 1
            session.xp_earned += xp
            session.current_index = min(max(session.current_index, allowed.index(item_id) + 1), session.total_count)
        elif existing.is_correct:
            xp = 0
            session.current_index = min(max(session.current_index, allowed.index(item_id) + 1), session.total_count)
        db.commit(); db.refresh(session)
        feedback = None if ok else ExerciseService.mistake_feedback(payload, item.answer, item.explanation)
        return {"session": ExerciseService.session_payload(session, include_items=True, db=db), "is_correct": ok, "xp_earned": xp, "correct_answer": item.answer, "explanation": item.explanation, "mistake_feedback": feedback, "completed": session.current_index >= session.total_count}

    @staticmethod
    def complete_session(db: Session, session_id: int):
        session = db.query(ExerciseSession).filter(ExerciseSession.id == session_id).first()
        if not session: return None
        vocab = session.correct_count; phrases = max(0, session.correct_count // 3)
        if session.status == "completed":
            return {"id": session.id, "status": session.status, "session": ExerciseService.session_payload(session, db=db), "xp_earned": session.xp_earned, "correct_count": session.correct_count, "total_count": session.total_count, "hearts_left": session.hearts_left, "vocabulary_added": vocab, "phrases_added": phrases, "new_achievements": [], "already_completed": True}
        session.status = "completed"; session.completed_at = datetime.utcnow(); user = session.user
        wave = db.query(Wave).filter(Wave.user_id == user.id, Wave.language == ExerciseService.LANGUAGE_TO_WAVE.get(session.lesson.language_code)).first()
        if wave: wave.total_xp += session.xp_earned; wave.vocabulary_count += vocab; wave.phrases_count += phrases
        db.add(StudyLog(user_id=user.id, activity_type="srs", duration_minutes=max(1, session.total_count), xp_earned=session.xp_earned, notes=f"Exercícios: {session.lesson.title} — sessão {session.id}"))
        GamificationService.check_streak(user); user.total_xp += session.xp_earned; user.level = GamificationService.calculate_level(user.total_xp); user.last_study_date = datetime.utcnow()
        new = GamificationService.check_achievements(db, user); db.commit(); db.refresh(session)
        return {"id": session.id, "status": session.status, "session": ExerciseService.session_payload(session, db=db), "xp_earned": session.xp_earned, "correct_count": session.correct_count, "total_count": session.total_count, "hearts_left": session.hearts_left, "vocabulary_added": vocab, "phrases_added": phrases, "new_achievements": [a.name for a in new], "already_completed": False}

    @staticmethod
    def flashcards(db: Session, language: str | None = None, limit: int = 100):
        q = db.query(ExerciseLesson).filter(ExerciseLesson.active == True)
        if language: q = q.filter(ExerciseLesson.language_code == language)
        cards = []
        for lesson in q.order_by(ExerciseLesson.order_index).all():
            for item in lesson.items[:limit]:
                back = item.answer.get("value") if isinstance(item.answer, dict) and "value" in item.answer else item.answer
                if isinstance(back, list): back = " ".join(back)
                if isinstance(back, dict) and "pairs" in back: back = "; ".join([f"{a} = {b}" for a,b in back["pairs"]])
                cards.append({"id": item.id, "language_code": lesson.language_code, "language_name": lesson.language_name, "front": item.prompt, "back": back, "hint": item.hint, "explanation": item.explanation, "type": item.type})
        return cards[:limit]

