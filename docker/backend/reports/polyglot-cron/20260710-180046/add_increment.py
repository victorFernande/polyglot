from models import SessionLocal
from services import ExerciseService

langs = ["de", "fr", "ru", "jp", "en"]
db = SessionLocal()
try:
    for lang in langs:
        added = ExerciseService.add_next_incremental_batch(db, lang, 5)
        print(f"{lang}: added={added}")
finally:
    db.close()
