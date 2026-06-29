import hashlib
from pathlib import Path

import edge_tts


class TTSService:
    CACHE_DIR = Path("data/tts-cache")
    VOICES = {
        "pt-BR": "pt-BR-FranciscaNeural",
        "de-DE": "de-DE-KatjaNeural",
        "fr-FR": "fr-FR-DeniseNeural",
        "ru-RU": "ru-RU-SvetlanaNeural",
        "ja-JP": "ja-JP-NanamiNeural",
        "en-US": "en-US-JennyNeural",
    }

    @classmethod
    def voice_for_lang(cls, lang: str) -> str:
        return cls.VOICES.get(lang, cls.VOICES["pt-BR"])

    @classmethod
    def cache_path(cls, text: str, lang: str) -> Path:
        voice = cls.voice_for_lang(lang)
        digest = hashlib.sha256(f"{lang}\0{voice}\0{text}".encode("utf-8")).hexdigest()[:24]
        return cls.CACHE_DIR / f"{digest}.mp3"

    @classmethod
    async def synthesize(cls, text: str, lang: str) -> Path:
        clean_text = " ".join(str(text or "").split())
        if not clean_text:
            raise ValueError("text is required")
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path = cls.cache_path(clean_text, lang)
        if path.exists() and path.stat().st_size > 0:
            return path
        communicate = edge_tts.Communicate(clean_text, cls.voice_for_lang(lang))
        await communicate.save(str(path))
        return path
