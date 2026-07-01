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
    def completed_exercise_sessions_count(db: Session, user: User) -> int:
        return db.query(ExerciseSession).filter(
            ExerciseSession.user_id == user.id,
            ExerciseSession.status == "completed",
        ).count()

    @staticmethod
    def completed_languages_count(db: Session, user: User) -> int:
        completed = 0
        lessons = db.query(ExerciseLesson).filter(ExerciseLesson.active == True).all()
        for lesson in lessons:
            total_items = len(lesson.items)
            if total_items <= 0:
                continue
            answered_items = sum(
                int(session.total_count or 0)
                for session in db.query(ExerciseSession).filter(
                    ExerciseSession.user_id == user.id,
                    ExerciseSession.lesson_id == lesson.id,
                    ExerciseSession.status == "completed",
                ).all()
            )
            if answered_items >= total_items:
                completed += 1
        return completed

    @staticmethod
    def check_achievements(db: Session, user: User) -> list:
        earned = []
        existing = {ua.achievement_id for ua in user.achievements}
        completed_sessions = GamificationService.completed_exercise_sessions_count(db, user)
        completed_languages = GamificationService.completed_languages_count(db, user)
        for achievement in db.query(Achievement).all():
            if achievement.id in existing:
                continue
            ok = False
            if achievement.requirement_type == "streak":
                ok = user.current_streak >= achievement.requirement_value
            elif achievement.requirement_type == "vocabulary":
                ok = sum(w.vocabulary_count for w in user.waves) >= achievement.requirement_value
            elif achievement.requirement_type == "exercise_sessions":
                ok = completed_sessions >= achievement.requirement_value
            elif achievement.requirement_type == "completed_languages":
                ok = completed_languages >= achievement.requirement_value
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
    SPEECH_LANGS = {"de": "de-DE", "fr": "fr-FR", "ru": "ru-RU", "jp": "ja-JP", "en": "en-US"}
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
    SESSION_SIZE = 20
    TARGET_ITEMS = 1000
    INCREMENTAL_ITEM_TARGETS = {"de": 1120, "fr": 1030, "ru": 1030, "jp": 1030, "en": 1030}
    JP_BEGINNER_KANA = {
        "私の名前はビクトルです。": "わたしのなまえはビクトルです。",
        "ブラジル出身です。": "ブラジルしゅっしんです。",
        "サンパウロに住んでいます。": "サンパウロにすんでいます。",
        "ポルトガル語を話します。": "ポルトガルごをはなします。",
        "私は先生です。": "わたしはせんせいです。",
        "日本語を勉強しています。": "にほんごをべんきょうしています。",
        "お名前は何ですか。": "おなまえはなんですか。",
        "どこの出身ですか。": "どこのしゅっしんですか。",
        "音楽が好きです。": "おんがくがすきです。",
        "よろしくお願いします。": "よろしくおねがいします。",
        "コーヒーをお願いします。": "コーヒーをおねがいします。",
        "水をお願いします。": "みずをおねがいします。",
        "パンをお願いします。": "パンをおねがいします。",
        "お願いします。": "おねがいします。",
        "お会計をお願いします。": "おかいけいをおねがいします。",
        "はい、合っています。": "はい、あっています。",
        "水": "みず",
        "願": "ねが",
        "会": "かい",
        "計": "けい",
        "合": "あ",
        "私": "わたし",
        "名": "な",
        "前": "まえ",
        "出": "しゅつ",
        "身": "しん",
        "住": "す",
        "語": "ご",
        "話": "はな",
        "先": "せん",
        "生": "せい",
        "日": "に",
        "勉": "べん",
        "強": "きょう",
        "何": "なん",
        "音": "おん",
        "楽": "がく",
        "好": "す",
        "言": "こと",
        "葉": "ば",
        "聞": "き",
        "読": "よ",
        "本": "ほん",
        "電": "でん",
        "車": "しゃ",
        "太": "たい",
        "陽": "よう",
        "一": "いち",
        "二": "に",
        "三": "さん",
        "四": "よん",
        "五": "ご",
        "六": "ろく",
        "七": "なな",
        "八": "はち",
        "九": "きゅう",
        "十": "じゅう",
    }
    JP_BEGINNER_DISTRACTOR_CHUNKS = ["はい", "いいえ", "どうぞ", "です", "か", "を", "は", "。", "ありがとう", "ください"]
    JP_BEGINNER_ROMAJI_DISTRACTOR_CHUNKS = ["hai", "iie", "douzo", "desu", "ka", "o", "wa", "arigatou", "kudasai"]
    JP_BEGINNER_ROMAJI = {
        "こんにちは": "konnichiwa",
        "コーヒーをおねがいします。": "koohii o onegaishimasu",
        "みずをおねがいします。": "mizu o onegaishimasu",
        "パンをおねがいします。": "pan o onegaishimasu",
        "おねがいします。": "onegaishimasu",
        "ありがとうございます。": "arigatou gozaimasu",
        "いくらですか。": "ikura desu ka",
        "おかいけいをおねがいします。": "okaikei o onegaishimasu",
        "はい、あっています。": "hai, atte imasu",
        "さようなら。": "sayounara",
    }
    JP_BEGINNER_CHUNKS = {
        "こんにちは": ["こ", "ん", "に", "ち", "は"],
        "コーヒーをおねがいします。": ["コーヒー", "を", "おねがいします", "。"],
        "みずをおねがいします。": ["みず", "を", "おねがいします", "。"],
        "パンをおねがいします。": ["パン", "を", "おねがいします", "。"],
        "おねがいします。": ["おねがいします", "。"],
        "ありがとうございます。": ["ありがとう", "ございます", "。"],
        "いくらですか。": ["いくら", "です", "か", "。"],
        "おかいけいをおねがいします。": ["おかいけい", "を", "おねがいします", "。"],
        "はい、あっています。": ["はい", "、", "あっています", "。"],
        "さようなら。": ["さようなら", "。"],
        "わたしのなまえはビクトルです。": ["わたし", "の", "なまえ", "は", "ビクトル", "です", "。"],
        "ブラジルしゅっしんです。": ["ブラジル", "しゅっしん", "です", "。"],
        "サンパウロにすんでいます。": ["サンパウロ", "に", "すんで", "います", "。"],
        "ポルトガルごをはなします。": ["ポルトガルご", "を", "はなします", "。"],
        "わたしはせんせいです。": ["わたし", "は", "せんせい", "です", "。"],
        "にほんごをべんきょうしています。": ["にほんご", "を", "べんきょう", "しています", "。"],
        "おなまえはなんですか。": ["おなまえ", "は", "なん", "です", "か", "。"],
        "どこのしゅっしんですか。": ["どこ", "の", "しゅっしん", "です", "か", "。"],
        "おんがくがすきです。": ["おんがく", "が", "すき", "です", "。"],
        "よろしくおねがいします。": ["よろしく", "おねがいします", "。"],
    }
    JP_BEGINNER_ROMAJI_CHUNKS = {
        "konnichiwa": ["kon", "nichi", "wa"],
        "koohii o onegaishimasu": ["koohii", "o", "onegaishimasu"],
        "mizu o onegaishimasu": ["mizu", "o", "onegaishimasu"],
        "pan o onegaishimasu": ["pan", "o", "onegaishimasu"],
        "onegaishimasu": ["onegai", "shimasu"],
        "arigatou gozaimasu": ["arigatou", "gozaimasu"],
        "ikura desu ka": ["ikura", "desu", "ka"],
        "okaikei o onegaishimasu": ["okaikei", "o", "onegaishimasu"],
        "hai, atte imasu": ["hai", "atte", "imasu"],
        "sayounara": ["sayou", "nara"],
    }
    RU_BEGINNER_LATIN = {
        "Здравствуйте": "zdravstvuyte",
        "Я хочу кофе.": "ya khochu kofe",
        "Воду, пожалуйста.": "vodu pozhaluysta",
        "Я хочу хлеб.": "ya khochu khleb",
        "Пожалуйста.": "pozhaluysta",
        "Спасибо.": "spasibo",
        "Сколько это стоит?": "skolko eto stoit",
        "Счёт, пожалуйста.": "schyot pozhaluysta",
        "Да, правильно.": "da pravilno",
        "До свидания.": "do svidaniya",
    }
    RU_TRANSLIT = {
        "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya",
        "А":"a","Б":"b","В":"v","Г":"g","Д":"d","Е":"e","Ё":"yo","Ж":"zh","З":"z","И":"i","Й":"y","К":"k","Л":"l","М":"m","Н":"n","О":"o","П":"p","Р":"r","С":"s","Т":"t","У":"u","Ф":"f","Х":"kh","Ц":"ts","Ч":"ch","Ш":"sh","Щ":"sch","Ъ":"","Ы":"y","Ь":"","Э":"e","Ю":"yu","Я":"ya",
    }
    RU_BEGINNER_DISTRACTOR_CHUNKS = ["da", "net", "pozhaluysta", "spasibo", "ya", "eto", "kofe", "voda"]

    @staticmethod
    def target_items_for_language(code: str):
        return ExerciseService.INCREMENTAL_ITEM_TARGETS.get(code, ExerciseService.TARGET_ITEMS)

    @staticmethod
    def _choice(prompt, answer, options, idx):
        opts = list(dict.fromkeys([answer] + options))[:4]
        return {"type":"choice","prompt":prompt,"answer":{"value":answer},"options":opts,"tiles":None,"pairs":None,"hint":"Escolha a opção correta e fale em voz alta antes de confirmar.","explanation":f"Resposta correta: {answer}.","xp_reward":8 + (idx % 3)}

    @staticmethod
    def _listen_choice(prompt, answer, options, idx):
        item = ExerciseService._choice(prompt, answer, options, idx)
        item["type"] = "listen_choice"
        item["hint"] = "Ouça o áudio, repita em voz alta e escolha o que foi dito. O áudio alterna português e idioma estudado quando necessário."
        return item

    @staticmethod
    def _context_choice(prompt, answer, options, idx):
        item = ExerciseService._choice(prompt, answer, options, idx)
        item["type"] = "context_choice"
        item["hint"] = "Pense na situação real antes de escolher: o objetivo é comunicar, não só traduzir palavra por palavra."
        return item

    @staticmethod
    def _build(prompt, words, extras, idx):
        tiles = list(dict.fromkeys(extras + words))
        return {"type":"build","prompt":prompt,"answer":{"value":words},"options":None,"tiles":tiles,"pairs":None,"hint":"Monte a frase na ordem natural do idioma.","explanation":"Frases curtas ajudam a fixar padrões sem decorar regras isoladas.","xp_reward":10 + (idx % 4)}

    @staticmethod
    def _listen_build(prompt, words, extras, idx):
        item = ExerciseService._build(prompt, words, extras, idx)
        item["type"] = "listen_build"
        item["hint"] = "Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
        return item

    @staticmethod
    def _sequence_dialogue(prompt, phrases, idx):
        tiles = list(phrases)
        if len(tiles) > 1:
            shift = (idx % (len(tiles) - 1)) + 1
            tiles = tiles[shift:] + tiles[:shift]
        return {"type":"sequence_dialogue","prompt":prompt,"answer":{"value":phrases},"options":None,"tiles":tiles,"pairs":None,"hint":"Use a lógica do enunciado para ordenar as frases no idioma estudado, sem tradução direta em cada carta.","explanation":"A ordem correta reconstrói o fluxo da situação pelo significado: começo, contexto, detalhe e fechamento.","xp_reward":12 + (idx % 4)}

    @staticmethod
    def _coherent_sequence_pairs(unit, code: str, topic_index: int):
        # Use the real communicative phrases from the unit, not the expanded
        # metalinguistic vocabulary bank. The four-card sequence should read
        # like a short dialogue/introduction that a learner can order by logic.
        unit_pairs = unit["phrases"][code]
        if unit["title"] == "Apresente-se":
            start = max(0, min(len(unit_pairs) - 4, topic_index - 4))
        else:
            start = (topic_index - 1) % len(unit_pairs)
        return [[unit_pairs[(start + offset) % len(unit_pairs)][0], unit_pairs[(start + offset) % len(unit_pairs)][1]] for offset in range(4)]

    @staticmethod
    def _match(prompt, pairs, idx):
        return {"type":"match","prompt":prompt,"answer":{"pairs":pairs},"options":None,"tiles":None,"pairs":pairs,"hint":"Combine pelo significado, não pela aparência da palavra.","explanation":"Matching fortalece reconhecimento rápido de vocabulário.","xp_reward":12 + (idx % 4)}

    @staticmethod
    def _listen_match(prompt, pairs, idx):
        item = ExerciseService._match(prompt, pairs, idx)
        item["type"] = "listen_match"
        item["hint"] = "Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
        item["explanation"] = "Cada áudio fala uma palavra ou frase no idioma estudado; o par correto é a tradução em português."
        return item

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
            "dessert": '<path d="M24 34h48l-6 38H30L24 34z" fill="#f472b6" stroke="#be185d" stroke-width="4"/><path d="M31 34c3-10 11-16 17-16s14 6 17 16" fill="#fde68a"/><circle cx="54" cy="20" r="5" fill="#ef4444"/><path d="M36 46h24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
            "no_meat": '<circle cx="48" cy="48" r="32" fill="#fff7ed" stroke="#ef4444" stroke-width="5"/><path d="M32 56c6-16 28-16 32 0 2 8-4 14-16 14S30 64 32 56z" fill="#f97316"/><path d="M24 24l48 48" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>',
            "recommendation": '<circle cx="48" cy="42" r="24" fill="#fef3c7" stroke="#f59e0b" stroke-width="4"/><path d="M48 24l6 12 13 2-10 9 3 13-12-7-12 7 3-13-10-9 13-2 6-12z" fill="#facc15"/><path d="M32 75h32" stroke="#92400e" stroke-width="5" stroke-linecap="round"/>',
            "receipt": '<path d="M28 16h40v64l-7-5-7 5-6-5-7 5-6-5-7 5V16z" fill="#fff" stroke="#0f172a" stroke-width="4"/><path d="M38 30h20M38 44h20M38 58h14" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>',
            "menu": '<rect x="26" y="18" width="44" height="60" rx="5" fill="#fef3c7" stroke="#92400e" stroke-width="4"/><path d="M36 34h24M36 46h24M36 58h18" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>',
            "table": '<path d="M24 40h48v8H24z" fill="#92400e"/><path d="M32 48v28M64 48v28" stroke="#92400e" stroke-width="7" stroke-linecap="round"/><circle cx="48" cy="31" r="9" fill="#38bdf8"/>',
            "soup": '<path d="M24 48h48c0 14-11 25-24 25S24 62 24 48z" fill="#f97316"/><path d="M20 48h56" stroke="#7c2d12" stroke-width="5" stroke-linecap="round"/><path d="M37 32c-4-5 4-8 0-13M49 32c-4-5 4-8 0-13" stroke="#94a3b8" stroke-width="4" fill="none"/>',
            "speech": '<path d="M20 24h56v34H45L31 72V58H20V24z" fill="#38bdf8" stroke="#0f172a" stroke-width="4"/><path d="M32 38h32M32 48h22" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
            "thanks": '<circle cx="36" cy="36" r="10" fill="#f59e0b"/><circle cx="60" cy="36" r="10" fill="#f59e0b"/><path d="M24 72c4-15 13-23 24-23s20 8 24 23" fill="#22c55e"/><path d="M38 58l10 8 14-18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
            "check": '<circle cx="48" cy="48" r="32" fill="#22c55e"/><path d="M31 49l11 11 24-26" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
            "goodbye": '<circle cx="48" cy="30" r="12" fill="#f59e0b"/><path d="M29 78c2-16 10-28 19-28s17 12 19 28" fill="#6366f1"/><path d="M67 35c8 4 11 10 9 17M72 28c13 7 18 17 15 30" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round"/>',
            "question": '<circle cx="48" cy="48" r="32" fill="#fef3c7" stroke="#f59e0b" stroke-width="4"/><path d="M39 39c1-8 8-13 16-9 8 4 6 14-1 18-4 2-6 4-6 8" stroke="#92400e" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="48" cy="66" r="4" fill="#92400e"/>',
        }
        shape = icons.get(icon_key, icons["speech"])
        return f'<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="22" fill="{bg}"/>{shape}</svg>'

    @staticmethod
    def _svg_data_uri(svg: str) -> str:
        return f"data:image/svg+xml;charset=UTF-8,{quote(svg, safe='')}"

    @staticmethod
    def _icon_key_for_phrase(portuguese: str, foreign: str, topic: str = "") -> str:
        text = f"{portuguese} {foreign} {topic}".casefold()
        keyword_icons = [
            (("obrigado", "agradecer", "danke", "thank", "merci", "спасибо", "ありがとうございます"), "thanks"),
            (("até logo", "desped", "goodbye", "auf wiedersehen", "au revoir", "до свид", "さようなら"), "goodbye"),
            (("sim", "certo", "yes", "stimmt", "correct", "oui", "да", "はい"), "check"),
            (("sobremesa", "dessert", "десерт", "デザート"), "dessert"),
            (("sem carne", "ohne fleisch", "no meat", "sans viande", "без мяса", "肉なし"), "no_meat"),
            (("recomendação", "recomenda", "empfehlen", "recommend", "recommandez", "рекоменду", "おすすめ"), "recommendation"),
            (("conta", "rechnung", "bill", "addition", "счёт", "お会計"), "receipt"),
            (("por favor", "please", "bitte", "s'il vous plaît", "пожалуйста", "お願いします"), "speech"),
            (("menu", "speisekarte", "меню", "メニュー"), "menu"),
            (("mesa", "tisch", "table", "стол", "席"), "table"),
            (("entrada", "sopa", "suppe", "soup", "soupe", "суп", "スープ"), "soup"),
            (("olá", "hallo", "hello", "bonjour", "привет", "здравствуйте", "こんにちは", "cumprimentar"), "person"),
            (("café", "kaffee", "coffee", "кофе", "コーヒー"), "coffee"),
            (("água", "wasser", "water", "eau", "воду", "вода", "水"), "water"),
            (("pão", "brot", "bread", "pain", "хлеб", "パン"), "bread"),
            (("trem", "estação", "bahnhof", "station", "gare", "вокзал", "駅"), "train"),
            (("casa", "moro", "moradia", "wohne", "haus", "home", "house", "maison", "дом", "家"), "house"),
            (("camisa", "casaco", "roup", "hemd", "shirt", "chemise", "рубаш", "シャツ"), "shirt"),
            (("telefone", "phone", "téléphone", "телефон", "電話"), "phone"),
            (("livro", "book", "livre", "книга"), "book"),
            (("preço", "custa", "quanto", "price", "combien", "сколько", "いくら"), "receipt"),
            (("nome", "professor", "irmã", "irmão", "mãe", "pai", "família", "victor", "teacher", "sister", "brother", "名前", "先生"), "person"),
            (("comida", "prato", "garfo", "frango", "hähnchen", "chicken", "restaurante", "gabel", "fork", "fourchette", "вилка", "フォーク"), "fork"),
            (("bola", "esporte", "futebol", "ball", "football", "футбол", "サッカー"), "ball"),
        ]
        for keywords, icon_key in keyword_icons:
            if any(keyword in text for keyword in keywords):
                return icon_key
        if any(marker in text for marker in ("livro", "book", "livre", "книга")):
            return "book"
        return "speech"

    @staticmethod
    def _image_choice(prompt, answer, options, idx):
        unique = []
        seen = set()
        for portuguese, foreign, icon_key in [(answer[0], answer[1], answer[2])] + options:
            key = str(foreign).casefold()
            if key in seen:
                continue
            svg = ExerciseService._icon_svg(icon_key, len(unique))
            unique.append({"label_pt": portuguese, "display_text": foreign, "value": foreign, "icon_key": icon_key, "svg": svg, "image_src": ExerciseService._svg_data_uri(svg)})
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
        prompt = f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”"
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
    def _unit_phrase_window(unit, code: str, start: int, size: int = 4):
        phrases = unit["phrases"][code]
        return [phrases[(start + offset) % len(phrases)] for offset in range(size)]

    @staticmethod
    def _build_tokens(code: str, target: str):
        words = target.split()
        if len(words) >= 2:
            return words
        if code == "jp" and len(target) > 1:
            return [char for char in target if char.strip()]
        return words

    @staticmethod
    def _build_source_phrase(unit, code: str, topic_index: int, question_index: int):
        phrases = unit["phrases"][code]
        start = (topic_index + question_index - 2) % len(phrases)
        for offset in range(len(phrases)):
            pt, foreign = phrases[(start + offset) % len(phrases)]
            if len(ExerciseService._build_tokens(code, foreign)) >= 2:
                return pt, foreign
        return phrases[start]

    @staticmethod
    def _japanese_beginner_text(value: str, script: str = "kana"):
        text = str(value)
        for original, kana in sorted(ExerciseService.JP_BEGINNER_KANA.items(), key=lambda item: len(item[0]), reverse=True):
            text = text.replace(original, kana)
        if script == "romaji":
            for kana, romaji in sorted(ExerciseService.JP_BEGINNER_ROMAJI.items(), key=lambda item: len(item[0]), reverse=True):
                text = text.replace(kana, romaji)
        return text

    @staticmethod
    def _japanese_beginner_value(value, script: str = "kana"):
        if isinstance(value, str):
            return ExerciseService._japanese_beginner_text(value, script)
        if isinstance(value, list):
            return [ExerciseService._japanese_beginner_value(item, script) for item in value]
        if isinstance(value, dict):
            return {key: ExerciseService._japanese_beginner_value(item, script) for key, item in value.items()}
        return value

    @staticmethod
    def _japanese_beginner_tokens(tokens, script: str = "kana"):
        joined = "".join(str(token) for token in tokens)
        kana = ExerciseService._japanese_beginner_text(joined, "kana")
        if script == "romaji":
            romaji = ExerciseService._japanese_beginner_text(kana, "romaji")
            if romaji in ExerciseService.JP_BEGINNER_ROMAJI_CHUNKS:
                return ExerciseService.JP_BEGINNER_ROMAJI_CHUNKS[romaji]
            return romaji.replace(",", "").split()
        if kana in ExerciseService.JP_BEGINNER_CHUNKS:
            return ExerciseService.JP_BEGINNER_CHUNKS[kana]
        return [chunk for chunk in ExerciseService._build_tokens("jp", kana) if chunk]

    @staticmethod
    def _scaffold_japanese_beginner_item(item: dict, script: str = "kana"):
        original_answer = item.get("answer") or {}
        scaffolded = ExerciseService._japanese_beginner_value(item, script)
        if item.get("type") in {"build", "listen_build"} and isinstance(original_answer.get("value"), list):
            answer_tokens = ExerciseService._japanese_beginner_tokens(original_answer["value"], script)
            distractors = ExerciseService.JP_BEGINNER_ROMAJI_DISTRACTOR_CHUNKS if script == "romaji" else ExerciseService.JP_BEGINNER_DISTRACTOR_CHUNKS
            scaffolded["answer"]["value"] = answer_tokens
            scaffolded["tiles"] = list(dict.fromkeys(distractors + answer_tokens))
            label = "romaji" if script == "romaji" else "kana"
            scaffolded["explanation"] = f"A frase correta em {label} é: “{' '.join(answer_tokens)}”. Kana e kanji serão introduzidos depois."
        if script == "romaji":
            scaffolded["hint"] = f"{scaffolded.get('hint', '')} Comece pela leitura em letras latinas (romaji). Depois vamos ligar cada som aos símbolos japoneses."
        else:
            scaffolded["hint"] = f"{scaffolded.get('hint', '')} Primeiro leia em kana; o kanji entra só depois que o básico estiver firme."
        return scaffolded

    @staticmethod
    def _russian_beginner_text(value: str):
        text = str(value)
        for original, latin in sorted(ExerciseService.RU_BEGINNER_LATIN.items(), key=lambda item: len(item[0]), reverse=True):
            text = text.replace(original, latin)
        return "".join(ExerciseService.RU_TRANSLIT.get(char, char) for char in text).replace(",", "").replace(".", "").replace("?", "")

    @staticmethod
    def _russian_beginner_value(value):
        if isinstance(value, str):
            return ExerciseService._russian_beginner_text(value)
        if isinstance(value, list):
            return [ExerciseService._russian_beginner_value(item) for item in value]
        if isinstance(value, dict):
            return {key: ExerciseService._russian_beginner_value(item) for key, item in value.items()}
        return value

    @staticmethod
    def _russian_beginner_tokens(tokens):
        latin = ExerciseService._russian_beginner_text(" ".join(str(token) for token in tokens))
        return [token for token in latin.split() if token]

    @staticmethod
    def _scaffold_russian_beginner_item(item: dict):
        original_answer = item.get("answer") or {}
        scaffolded = ExerciseService._russian_beginner_value(item)
        if item.get("type") in {"build", "listen_build"} and isinstance(original_answer.get("value"), list):
            answer_tokens = ExerciseService._russian_beginner_tokens(original_answer["value"])
            scaffolded["answer"]["value"] = answer_tokens
            scaffolded["tiles"] = list(dict.fromkeys(ExerciseService.RU_BEGINNER_DISTRACTOR_CHUNKS + answer_tokens))
            scaffolded["explanation"] = f"A frase correta em letras latinas é: “{' '.join(answer_tokens)}”. O alfabeto cirílico será introduzido depois."
        scaffolded["hint"] = f"{scaffolded.get('hint', '')} Comece pela pronúncia em letras latinas; depois vamos ligar cada som ao alfabeto cirílico."
        return scaffolded

    @staticmethod
    def _items_need_regeneration(lesson: ExerciseLesson, generated: list[dict]) -> bool:
        existing = sorted(list(lesson.items), key=lambda item: item.order_index)
        if len(existing) > len(generated):
            return True
        for item, expected in zip(existing, generated[:len(existing)]):
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
    def _incremental_review_items(code: str, start_index: int, count: int):
        if count <= 0:
            return []
        name = ExerciseService.LANGUAGE_NAMES[code]
        unit = A1_UNITS[-1]
        phrases = unit["phrases"][code]
        prefix = "Sessão 51 — Revisão incremental · Preferências em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]
        items = []

        pt, target = phrases[0]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — você comenta preferências musicais. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[0:4] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = phrases[0:4]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro gosto; depois contraste; em seguida preferência; por fim comida",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — feche uma opinião simples. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        pt, target = phrases[5]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        pt, target = phrases[6]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[7:10]],
            start_index + len(items),
        ))

        image_sample = phrases[7:10] + phrases[0:1]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][7])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][7])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — você dá uma opinião curta. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[1:5]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        wrong_portuguese = [option for option in portuguese_options[5:9] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = phrases[5:9]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro filme; depois esporte; em seguida cidade; por fim clima",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[2]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — compare preferências. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:2] + options[3:4]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão acrescenta prática real sem ultrapassar 20 questões no bloco atual."
        for item in items:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de preferências."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        unit = A1_UNITS[2]
        session_52_start = len(items)
        phrases = unit["phrases"][code]
        prefix = "Sessão 52 — Revisão incremental · Viagem em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]

        pt, target = phrases[0]
        display_pt = "Eu viajo para Berlim." if code == "de" else pt
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{display_pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — você precisa se orientar na viagem. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[0:4] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[1], phrases[3], phrases[8], phrases[9]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro passagem; depois estação; em seguida ajuda; por fim chegada",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — avise sobre a chegada. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        pt, target = phrases[5]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        pt, target = phrases[6]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[7:10]],
            start_index + len(items),
        ))

        image_sample = phrases[7:10] + phrases[0:1]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][7])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][7])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — confirme a chegada de hoje. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[1:5]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        wrong_portuguese = [option for option in portuguese_options[5:9] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[5], phrases[6], phrases[7], phrases[9]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro transporte; depois horário; em seguida bagagem; por fim chegada",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[2]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — informe sobre hospedagem. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:2] + options[3:4]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão acrescenta prática real sem ultrapassar 20 questões no bloco atual."
        for item in items[session_52_start:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de viagem."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        unit = A1_UNITS[3]
        session_53_start = len(items)
        phrases = unit["phrases"][code]
        prefix = "Sessão 53 — Revisão incremental · Restaurante em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]

        pt, target = phrases[0]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — peça uma bebida. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[0:4] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = phrases[0:4]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro mesa; depois menu; em seguida entrada; por fim prato principal",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — agradeça ao final da refeição. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão abre um novo bloco com 10 questões reais, sem ultrapassar 20 questões por sessão."
        for item in items[session_53_start:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de restaurante."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        pt, target = phrases[5]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        pt, target = phrases[6]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[7:10]],
            start_index + len(items),
        ))

        image_sample = phrases[7:10] + phrases[4:5]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][7])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][7])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — agradeça ao final da refeição. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in [phrases[4], phrases[5], phrases[6], phrases[8]]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[4:8] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[4], phrases[6], phrases[7], phrases[8]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro bebida; depois restrição alimentar; em seguida recomendação; por fim conta",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — encerre o atendimento no restaurante. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        for item in items[session_53_start + 10:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de restaurante."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        unit = A1_UNITS[4]
        session_54_start = len(items)
        phrases = unit["phrases"][code]
        prefix = "Sessão 54 — Revisão incremental · Contato em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]

        pt, target = phrases[0]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — forneça seu sobrenome. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[6]
        wrong_portuguese = [option for option in portuguese_options[0:4] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = phrases[0:4]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro telefone; depois email; em seguida endereço; por fim nome",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — entregue seu contato. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão abre um novo bloco com 10 questões reais, sem ultrapassar 20 questões por sessão."
        for item in items[session_54_start:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de contato."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        pt, target = phrases[4]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        pt, target = phrases[5]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        image_sample = phrases[7:10] + phrases[3:4]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][7])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][7])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — entregue seu contato no final da conversa. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in [phrases[4], phrases[5], phrases[6], phrases[8]]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[6]
        wrong_portuguese = [option for option in portuguese_options[4:8] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[5], phrases[7], phrases[8], phrases[9]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro número; depois soletrar; em seguida mensagem; por fim contato",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — encerre deixando seu contato. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        for item in items[session_54_start + 10:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de contato."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."
        unit = A1_UNITS[5]
        session_55_start = len(items)
        phrases = unit["phrases"][code]
        prefix = "Sessão 55 — Revisão incremental · Família em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]

        pt, target = phrases[0]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — apresente um familiar. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[0:4] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[2:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = phrases[0:4]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro mãe; depois pai; em seguida irmão; por fim irmã",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — descreva sua família em uma frase curta. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão abre um novo bloco com 10 questões reais, sem ultrapassar 20 questões por sessão."
        for item in items[session_55_start:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de família."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        pt, target = phrases[4]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        pt, target = phrases[5]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        image_sample = phrases[6:10]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][6])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][6])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[7]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — fale de posse familiar. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in [phrases[5], phrases[6], phrases[7], phrases[8]]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[5]
        wrong_portuguese = [option for option in portuguese_options[6:10] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[6]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[5], phrases[6], phrases[7], phrases[8]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro filha; depois avós; em seguida idade; por fim posse",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — descreva a família como fechamento. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        for item in items[session_55_start + 10:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de família."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."

        unit = A1_UNITS[6]
        session_56_start = len(items)
        phrases = unit["phrases"][code]
        prefix = "Sessão 56 — Revisão incremental · Trabalho em contexto"
        options = [foreign for _pt, foreign in phrases]
        portuguese_options = [pt for pt, _foreign in phrases]

        pt, target = phrases[0]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[1:4]],
            start_index + len(items),
        ))

        pt, target = phrases[1]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[2:5]],
            start_index + len(items),
        ))

        image_sample = phrases[2:6]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][2])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][2])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[:8] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[4]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — fale de uma tarefa de trabalho no presente. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[5:8]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in phrases[5:9]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[7]
        wrong_portuguese = [option for option in portuguese_options[4:8] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[8]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[5], phrases[6], phrases[7], phrases[8]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro computador; depois ensinar; em seguida estudar; por fim trabalhar hoje",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — encerre a fala de trabalho com uma pausa. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        pt, target = phrases[3]
        items.append(ExerciseService._choice(
            f"{prefix}: escolha como dizer “{pt}” em {name}",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        pt, target = phrases[5]
        items.append(ExerciseService._listen_choice(
            f"{prefix}: ouça o áudio e identifique a fala que comunica “{pt}”",
            target,
            [foreign for foreign in options[6:9]],
            start_index + len(items),
        ))

        image_sample = [phrases[6], phrases[4], phrases[7], phrases[9]]
        answer_pt, answer_foreign = image_sample[0]
        items.append(ExerciseService._image_choice(
            f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”",
            (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, unit["topics"][6])),
            [(pt, foreign, ExerciseService._icon_key_for_phrase(pt, foreign, unit["topics"][6])) for pt, foreign in image_sample[1:]],
            start_index + len(items),
        ))

        pt, target = phrases[7]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._build(
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        pt, target = phrases[9]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — finalize uma fala de rotina de trabalho. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        listen_pairs = [[foreign, portuguese] for portuguese, foreign in [phrases[0], phrases[4], phrases[6], phrases[9]]]
        items.append(ExerciseService._listen_match(
            f"{prefix}: ouça cada áudio em {name} e selecione a tradução em português",
            listen_pairs,
            start_index + len(items),
        ))

        pt, target = phrases[1]
        wrong_portuguese = [option for option in portuguese_options[2:6] if option != pt][:3]
        items.append(ExerciseService._choice(
            f"{prefix}: entenda “{target}” — qual é o significado em português?",
            pt,
            wrong_portuguese,
            start_index + len(items),
        ))

        pt, target = phrases[6]
        words = ExerciseService._build_tokens(code, target)
        extras = [word for foreign in options[0:10] for word in ExerciseService._build_tokens(code, foreign)]
        items.append(ExerciseService._listen_build(
            f"{prefix}: ouça e monte em ordem natural — “{pt}”",
            words,
            extras,
            start_index + len(items),
        ))

        sequence_pairs = [phrases[0], phrases[1], phrases[4], phrases[9]]
        items.append(ExerciseService._sequence_dialogue(
            f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro profissão; depois local de trabalho; em seguida reunião; por fim pausa",
            [foreign for _portuguese, foreign in sequence_pairs],
            start_index + len(items),
        ))

        pt, target = phrases[8]
        items.append(ExerciseService._context_choice(
            f"{prefix}: situação guiada — diga que você trabalha hoje. Escolha a fala que comunica “{pt}” em {name}.",
            target,
            [foreign for foreign in options[0:3]],
            start_index + len(items),
        ))

        hint = f"Mini-aula: {unit['goal']} Esta revisão continua o bloco com questões reais, sem ultrapassar 20 questões por sessão."
        for item in items[session_56_start:]:
            if item["type"] == "listen_build":
                item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
            elif item["type"] == "listen_match":
                item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro da revisão de trabalho."
            elif item["type"] == "sequence_dialogue":
                item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
            else:
                item["hint"] = hint
            if item["type"] in {"build", "listen_build"}:
                item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
            elif item["type"] not in {"image_choice", "listen_match", "sequence_dialogue"}:
                item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."
        return items[:count]

    @staticmethod
    def _expanded_practice_bank(code: str, unit: dict, unit_index: int):
        # Start with real communicative phrases from the current unit.
        expanded = list(unit["phrases"][code])
        seen = {foreign.casefold() for _pt, foreign in expanded}

        # Then add a large rotating vocabulary bank. Vocabulary variants are
        # metalinguistic and broadly natural ("the word X", "I hear X", "I read X"),
        # avoiding nonsense like "I need hello" or duplicated full sentences.
        vocab_templates = {
            "de": [("{}", "{}"), ("a palavra {}", "das Wort {}"), ("eu ouço {}", "Ich höre {}"), ("eu leio {}", "Ich lese {}")],
            "fr": [("{}", "{}"), ("a palavra {}", "le mot {}"), ("eu ouço {}", "J'entends {}"), ("eu leio {}", "Je lis {}")],
            "ru": [("{}", "{}"), ("a palavra {}", "слово {}"), ("eu ouço {}", "Я слышу {}"), ("eu leio {}", "Я читаю {}")],
            "jp": [("{}", "{}"), ("a palavra {}", "{}という言葉"), ("eu ouço {}", "{}を聞きます"), ("eu leio {}", "{}を読みます")],
            "en": [("{}", "{}"), ("a palavra {}", "the word {}"), ("eu ouço {}", "I hear {}"), ("eu leio {}", "I read {}")],
        }[code]

        vocabulary_sources = [
            [(pt, foreign) for pt, foreign, icon in ExerciseService.VISUAL_VOCAB[code] if icon != "ambulance"]
        ]
        theme_keys = list(ExerciseService.THEMES[code].keys())
        for shift in range(len(theme_keys)):
            key = theme_keys[(unit_index + shift - 1) % len(theme_keys)]
            vocabulary_sources.append(ExerciseService.THEMES[code][key])

        for source in vocabulary_sources:
            for pt, foreign in source:
                for pt_template, foreign_template in vocab_templates:
                    item = (pt_template.format(pt), foreign_template.format(foreign))
                    foreign_key = item[1].casefold()
                    if foreign_key not in seen:
                        expanded.append(item)
                        seen.add(foreign_key)
        return expanded

    @staticmethod
    def _windowed_pairs(bank, start, size):
        return [bank[(start + offset) % len(bank)] for offset in range(size)]

    @staticmethod
    def _wrong_options(bank, target, start, size=3):
        wrong = []
        seen = {str(target).casefold()}
        for offset in range(len(bank)):
            _pt, foreign = bank[(start + offset) % len(bank)]
            key = str(foreign).casefold()
            if key in seen:
                continue
            wrong.append(foreign)
            seen.add(key)
            if len(wrong) == size:
                break
        return wrong

    @staticmethod
    def _wrong_portuguese_options(bank, target, start, size=3):
        wrong = []
        seen = {str(target).casefold()}
        for offset in range(len(bank)):
            portuguese, _foreign = bank[(start + offset) % len(bank)]
            key = str(portuguese).casefold()
            if key in seen:
                continue
            wrong.append(portuguese)
            seen.add(key)
            if len(wrong) == size:
                break
        return wrong

    @staticmethod
    def _microdialogue_prompt(prefix, topic_name, pt, opening_line):
        return (
            f"{prefix}: situação em microdiálogo no cenário “{topic_name}”\n"
            f"Pessoa: {opening_line}\n"
            "Você: ___\n"
            f"Escolha uma fala para comunicar “{pt}”."
        )

    @staticmethod
    def _prompt_for_question(prefix, question_index, pt, target, name, topic_name):
        templates = [
            f"{prefix}: como dizer “{pt}” em {name}?",
            f"{prefix}: ouça o áudio e identifique “{pt}”",
            f"{prefix}: observe a imagem e escolha a frase que representa “{pt}”",
            f"{prefix}: monte a frase em ordem natural para dizer “{pt}”",
            f"{prefix}: escolha a opção que comunica “{pt}” no tema “{topic_name}”",
            f"{prefix}: relacione cada frase ao significado em português no tema “{topic_name}”",
            f"{prefix}: escolha a melhor tradução para “{pt}”",
            f"{prefix}: organize as palavras para expressar “{pt}”",
            f"{prefix}: selecione o equivalente de “{pt}” no idioma estudado",
            f"{prefix}: escolha como dizer “{pt}” em uma fala natural",
            f"{prefix}: escolha a opção correta para “{pt}”",
            f"{prefix}: ouça a revisão e reconheça “{pt}”",
            f"{prefix}: construa a frase para dizer “{pt}”",
            f"{prefix}: escolha a fala adequada para dizer “{pt}”",
            f"{prefix}: leia as opções e encontre “{pt}”",
        ]
        return templates[(question_index - 1) % len(templates)]

    @staticmethod
    def _sequence_prompt(prefix: str, unit_title: str, sequence_pairs: list[list[str]], topic_name: str):
        portuguese_steps = [pair[0] for pair in sequence_pairs]
        if unit_title == "Apresente-se":
            return f"{prefix}: monte uma apresentação curta seguindo a ordem: nome → origem → onde mora → idioma que fala"
        return f"{prefix}: prática guiada de ordem — organize os cartões exatamente assim: primeiro {portuguese_steps[0]}; depois {portuguese_steps[1]}; em seguida {portuguese_steps[2]}; por fim {portuguese_steps[3]}"

    @staticmethod
    def generate_items(code: str):
        name = ExerciseService.LANGUAGE_NAMES[code]
        items = []
        type_patterns = [
            ["choice", "listen_choice", "image_choice", "build", "context_choice", "listen_match", "choice", "listen_build", "sequence_dialogue", "context_choice"],
            ["listen_choice", "choice", "build", "context_choice", "image_choice", "choice", "match", "sequence_dialogue", "listen_build", "context_choice"],
            ["context_choice", "image_choice", "choice", "listen_choice", "build", "listen_match", "sequence_dialogue", "context_choice", "listen_choice", "listen_build"],
            ["choice", "build", "listen_choice", "image_choice", "context_choice", "match", "listen_build", "choice", "sequence_dialogue", "listen_choice"],
            ["image_choice", "choice", "context_choice", "build", "listen_choice", "listen_match", "choice", "listen_choice", "listen_build", "sequence_dialogue"],
        ]
        for unit_index, unit in enumerate(A1_UNITS, 1):
            bank = ExerciseService._expanded_practice_bank(code, unit, unit_index)
            for topic_index, topic_name in enumerate(unit["topics"], 1):
                start = ((unit_index - 1) * 37 + (topic_index - 1) * 10) % len(bank)
                topic_pairs = ExerciseService._windowed_pairs(bank, start, 10)
                all_foreign = [foreign for _pt, foreign in bank]
                pattern = type_patterns[(topic_index - 1) % len(type_patterns)]
                for question_index, (pt, target) in enumerate(topic_pairs, 1):
                    idx = (unit_index - 1) * 100 + (topic_index - 1) * 10 + question_index
                    prefix = f"Unidade {unit_index}/10 — {unit['title']} · Tópico {topic_index}/10 — {topic_name}"
                    hint = f"Mini-aula: {unit['goal']} Este item usa vocabulário variado do contexto, não só as frases fixas da unidade."
                    explanation = f"{unit['title']}: “{target}” corresponde a “{pt}”. Use como bloco real de comunicação em {name}."
                    wrong = ExerciseService._wrong_options(bank, target, start + question_index, 3)
                    prompt = ExerciseService._prompt_for_question(prefix, question_index + topic_index - 1, pt, target, name, topic_name)
                    item_type = pattern[question_index - 1]
                    unit_phrase_count = len(unit["phrases"][code])
                    phrase_index = topic_index - 1 if (unit["title"] == "Apresente-se" and topic_name == "dizer profissão" and question_index == 2) else (topic_index + question_index - 2) % unit_phrase_count
                    pt, target = unit["phrases"][code][phrase_index]
                    varied_wrong_foreign = [foreign for pair_idx, (_pt, foreign) in enumerate(unit["phrases"][code]) if pair_idx != phrase_index][:3]
                    varied_wrong_portuguese = [portuguese for pair_idx, (portuguese, _foreign) in enumerate(unit["phrases"][code]) if pair_idx != phrase_index][:3]
                    if item_type == "choice":
                        can_use_reverse = question_index in {6, 7, 8} and pt.casefold() not in target.casefold()
                        if can_use_reverse:
                            reverse_prompt = f"{prefix}: entenda “{target}” — qual é o significado em português?"
                            item = ExerciseService._choice(reverse_prompt, pt, varied_wrong_portuguese, idx)
                        else:
                            prompt = f"{prefix}: escolha como dizer “{pt}” em {name}"
                            item = ExerciseService._choice(prompt, target, varied_wrong_foreign, idx)
                    elif item_type == "listen_choice":
                        prompt = f"{prefix}: ouça o áudio e identifique “{pt}”"
                        item = ExerciseService._listen_choice(prompt, target, varied_wrong_foreign, idx)
                    elif item_type == "image_choice":
                        sample = [(pt, target)] + [pair for pair in unit["phrases"][code] if pair[1] != target][:3]
                        answer_pt, answer_foreign = sample[0]
                        answer = (answer_pt, answer_foreign, ExerciseService._icon_key_for_phrase(answer_pt, answer_foreign, topic_name))
                        image_options = [
                            (opt_pt, opt_foreign, ExerciseService._icon_key_for_phrase(opt_pt, opt_foreign, topic_name))
                            for opt_pt, opt_foreign in sample[1:]
                        ]
                        prompt = f"{prefix}: observe a imagem e escolha a frase que representa “{answer_pt}”"
                        item = ExerciseService._image_choice(prompt, answer, image_options, idx)
                    elif item_type in {"build", "listen_build"}:
                        build_pt, build_target = pt, target
                        words = ExerciseService._build_tokens(code, build_target)
                        if len(words) < 2:
                            build_pt, build_target = ExerciseService._build_source_phrase(unit, code, topic_index, question_index)
                            words = ExerciseService._build_tokens(code, build_target)
                        extras = [word for foreign in all_foreign[start % len(all_foreign):(start % len(all_foreign)) + 12] for word in ExerciseService._build_tokens(code, foreign)]
                        if len(extras) < 8:
                            extras.extend([word for foreign in all_foreign[:12] for word in ExerciseService._build_tokens(code, foreign)])
                        if item_type == "listen_build":
                            prompt = f"{prefix}: ouça e monte em ordem natural — “{build_pt}”"
                            item = ExerciseService._listen_build(prompt, words, extras, idx)
                        else:
                            prompt = f"{prefix}: monte a frase em ordem natural para dizer “{build_pt}”"
                            item = ExerciseService._build(prompt, words, extras, idx)
                    elif item_type in {"match", "listen_match"}:
                        sample = ExerciseService._unit_phrase_window(unit, code, topic_index + question_index, 4)
                        pairs = [[foreign, portuguese] for portuguese, foreign in sample]
                        review_prefix = f"Unidade {unit_index}/10 — {unit['title']} · Revisão guiada"
                        if item_type == "listen_match":
                            prompt = f"{review_prefix}: ouça cada áudio em {name} e selecione a tradução em português"
                            item = ExerciseService._listen_match(prompt, pairs, idx)
                        else:
                            prompt = f"{review_prefix}: relacione cada frase ao significado em português"
                            item = ExerciseService._match(prompt, pairs, idx)
                    elif item_type == "sequence_dialogue":
                        sequence_pairs = ExerciseService._coherent_sequence_pairs(unit, code, topic_index)
                        phrases = [foreign for _portuguese, foreign in sequence_pairs]
                        review_prefix = f"Unidade {unit_index}/10 — {unit['title']} · Revisão guiada"
                        prompt = ExerciseService._sequence_prompt(review_prefix, unit["title"], sequence_pairs, topic_name)
                        item = ExerciseService._sequence_dialogue(prompt, phrases, idx)
                    else:
                        context_pt, context_target = pt, target
                        context_wrong = varied_wrong_foreign
                        prompt = f"{prefix}: situação guiada — você precisa comunicar “{context_pt}” no tema “{topic_name}”. Escolha a fala correta em {name}."
                        item = ExerciseService._context_choice(prompt, context_target, context_wrong, idx)
                    if item["type"] == "listen_build":
                        item["hint"] = f"{hint} Ouça a frase, repita em voz alta e monte as palavras na ordem correta."
                    elif item["type"] == "listen_match":
                        item["hint"] = f"{hint} Toque em cada áudio no idioma estudado e selecione a tradução correspondente em português."
                    elif item["type"] == "sequence_dialogue":
                        item["hint"] = f"{hint} Siga a ordem indicada no enunciado e organize apenas as frases no idioma estudado."
                    else:
                        item["hint"] = hint
                    if item["type"] == "image_choice":
                        pass
                    elif item["type"] == "listen_match":
                        item["explanation"] = f"Cada áudio em {name} deve ser ligado à tradução em português dentro do tema “{topic_name}”."
                    elif item["type"] == "match":
                        item["explanation"] = f"Cada par conecta uma frase em {name} ao significado em português dentro do tema “{topic_name}”."
                    elif item["type"] == "sequence_dialogue":
                        pass
                    elif item["type"] in {"build", "listen_build"}:
                        item["explanation"] = f"A frase correta é: “{' '.join(item['answer']['value'])}”."
                    else:
                        item["explanation"] = f"{unit['title']}: “{item['answer']['value']}” comunica a ideia pedida em {name}."
                    if code == "jp" and idx <= 100:
                        item = ExerciseService._scaffold_japanese_beginner_item(item, "romaji")
                    elif code == "jp" and idx <= 200:
                        item = ExerciseService._scaffold_japanese_beginner_item(item, "kana")
                    elif code == "ru" and idx <= 100:
                        item = ExerciseService._scaffold_russian_beginner_item(item)
                    items.append(item)
        target_count = ExerciseService.target_items_for_language(code)
        if target_count > ExerciseService.TARGET_ITEMS:
            items.extend(ExerciseService._incremental_review_items(code, ExerciseService.TARGET_ITEMS + 1, target_count - ExerciseService.TARGET_ITEMS))
        return items[:target_count]

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
            else:
                existing_count = len(lesson.items)
                for idx, item in enumerate(generated[existing_count:], existing_count + 1):
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
    def _base_session_count(lesson: ExerciseLesson):
        return max(1, (len(lesson.items) + ExerciseService.SESSION_SIZE - 1) // ExerciseService.SESSION_SIZE)

    @staticmethod
    def _session_offset(lesson: ExerciseLesson, session_number: int):
        base_sessions = ExerciseService._base_session_count(lesson)
        window_number = ((max(1, session_number) - 1) % base_sessions) + 1
        return (window_number - 1) * ExerciseService.SESSION_SIZE

    @staticmethod
    def _visible_total_sessions(lesson: ExerciseLesson, completed_numbers: set[int], active: ExerciseSession | None = None):
        base_sessions = ExerciseService._base_session_count(lesson)
        highest_seen = max(completed_numbers | ({active.session_number} if active and active.session_number else set()), default=0)
        return max(base_sessions, highest_seen + 1)

    @staticmethod
    def session_items(db: Session, session: ExerciseSession):
        items = list(session.lesson.items)
        number = (session.session_number - 1) if getattr(session, "session_number", None) else ExerciseService._session_number(db, session)
        offset = ExerciseService._session_offset(session.lesson, number + 1)
        return items[offset:offset + ExerciseService.SESSION_SIZE]

    @staticmethod
    def session_payload(session: ExerciseSession, include_items: bool = False, include_current_item: bool = False, db: Session | None = None):
        created_db = db is None
        active_db = db or SessionLocal()
        items = ExerciseService.session_items(active_db, session)
        if session.total_count != len(items):
            session.total_count = len(items)
            active_db.add(session)
            active_db.commit()
            active_db.refresh(session)
        current = items[session.current_index] if session.current_index < len(items) else None
        payload = {"id": session.id, "user_id": session.user_id, "lesson_id": session.lesson_id, "status": session.status, "hearts_start": session.hearts_start, "hearts_left": session.hearts_left, "current_index": session.current_index, "correct_count": session.correct_count, "total_count": session.total_count, "session_number": session.session_number or (ExerciseService._session_number(active_db, session) + 1), "xp_earned": session.xp_earned, "started_at": session.started_at, "completed_at": session.completed_at, "current_item": ExerciseService.item_payload(current) if current else None}
        if include_items or include_current_item:
            payload["items"] = [ExerciseService.item_payload(i) for i in items]
        if created_db:
            active_db.close()
        return payload

    @staticmethod
    def list_lessons(db: Session, user_id: int):
        ExerciseService.ensure_seed_lessons(db); out = []
        for lesson in db.query(ExerciseLesson).filter(ExerciseLesson.active == True).order_by(ExerciseLesson.order_index).all():
            sessions = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson.id).all()
            active = max((s for s in sessions if s.status == "in_progress"), key=lambda s: (s.session_number or 0, s.id), default=None)
            completed = [s for s in sessions if s.status == "completed"]
            completed_numbers = {s.session_number or (idx + 1) for idx, s in enumerate(sorted(completed, key=lambda s: s.id))}
            total_sessions = ExerciseService._visible_total_sessions(lesson, completed_numbers, active)
            out.append({"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "session_size": ExerciseService.SESSION_SIZE, "total_sessions": total_sessions, "best_score": max([s.correct_count for s in completed], default=0), "completed_sessions": len(completed_numbers), "active_session_id": active.id if active else None})
        return out

    @staticmethod
    def learning_path(db: Session, user_id: int):
        lessons = ExerciseService.list_lessons(db, user_id)
        return [{**lesson, "nodes": [{"number": i + 1, "status": "completed" if i < lesson["completed_sessions"] else ("current" if i == lesson["completed_sessions"] else "locked"), "questions": lesson["session_size"]} for i in range(lesson["total_sessions"])]} for lesson in lessons]

    @staticmethod
    def get_lesson_payload(db: Session, lesson_id: int):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson: return None
        return {"id": lesson.id, "language_code": lesson.language_code, "language": lesson.language_code, "language_name": lesson.language_name, "slug": lesson.slug, "title": lesson.title, "description": lesson.description, "order_index": lesson.order_index, "xp_base": lesson.xp_base, "active": lesson.active, "items_count": len(lesson.items), "session_size": ExerciseService.SESSION_SIZE, "total_sessions": ExerciseService._base_session_count(lesson), "items": [ExerciseService.item_payload(i) for i in lesson.items]}

    @staticmethod
    def start_session(db: Session, user_id: int, lesson_id: int, session_number: int | None = None):
        lesson = db.query(ExerciseLesson).filter(ExerciseLesson.id == lesson_id).first()
        if not lesson: return None
        requested_number = max(1, int(session_number)) if session_number else None
        if requested_number is not None:
            session = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "in_progress", ExerciseSession.session_number == requested_number).order_by(ExerciseSession.id.desc()).first()
            if session and int(session.current_index or 0) < len(ExerciseService.session_items(db, session)):
                return session
            if session:
                ExerciseService.complete_session(db, session.id)
        else:
            completed = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "completed").all()
            completed_numbers = {s.session_number or (idx + 1) for idx, s in enumerate(sorted(completed, key=lambda s: s.id))}
            highest_completed = max(completed_numbers, default=0)
            session = db.query(ExerciseSession).filter(ExerciseSession.user_id == user_id, ExerciseSession.lesson_id == lesson_id, ExerciseSession.status == "in_progress").order_by(ExerciseSession.session_number.desc(), ExerciseSession.id.desc()).first()
            if session:
                session_number = session.session_number or 0
                if int(session.current_index or 0) < len(ExerciseService.session_items(db, session)) and session_number > highest_completed:
                    return session
                if int(session.current_index or 0) >= len(ExerciseService.session_items(db, session)):
                    ExerciseService.complete_session(db, session.id)
                    highest_completed = max(highest_completed, session_number)
            requested_number = (highest_completed + 1) if highest_completed else 1
        offset = ExerciseService._session_offset(lesson, requested_number)
        count = min(ExerciseService.SESSION_SIZE, len(lesson.items) - offset)
        session = ExerciseSession(user_id=user_id, lesson_id=lesson_id, total_count=count, session_number=requested_number, hearts_start=5, hearts_left=5, current_index=0)
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
        if session.total_count != len(items):
            session.total_count = len(items)
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
        db.add(session)
        db.flush()
        wave = db.query(Wave).filter(Wave.user_id == user.id, Wave.language == ExerciseService.LANGUAGE_TO_WAVE.get(session.lesson.language_code)).first()
        if wave: wave.total_xp += session.xp_earned; wave.vocabulary_count += vocab; wave.phrases_count += phrases
        visible_session_number = session.session_number or (ExerciseService._session_number(db, session) + 1)
        db.add(StudyLog(user_id=user.id, activity_type="srs", duration_minutes=max(1, session.total_count), xp_earned=session.xp_earned, notes=f"Exercícios: {session.lesson.title} — sessão {visible_session_number}"))
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
                card = {"id": item.id, "language_code": lesson.language_code, "language_name": lesson.language_name, "front": item.prompt, "back": back, "hint": item.hint, "explanation": item.explanation, "type": item.type}
                if item.type == "listen_choice" or "ouça" in f"{item.prompt} {item.hint}".casefold():
                    card["audio_text"] = str(back or "").strip()
                    card["audio_lang"] = ExerciseService.SPEECH_LANGS.get(lesson.language_code, "pt-BR")
                cards.append(card)
        return cards[:limit]

