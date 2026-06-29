import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from tts_service import TTSService  # noqa: E402


def test_tts_voice_map_uses_native_language_voices():
    assert TTSService.voice_for_lang("pt-BR") == "pt-BR-FranciscaNeural"
    assert TTSService.voice_for_lang("de-DE") == "de-DE-KatjaNeural"
    assert TTSService.voice_for_lang("fr-FR") == "fr-FR-DeniseNeural"
    assert TTSService.voice_for_lang("ru-RU") == "ru-RU-SvetlanaNeural"
    assert TTSService.voice_for_lang("ja-JP") == "ja-JP-NanamiNeural"


def test_tts_cache_path_is_stable_and_safe():
    first = TTSService.cache_path("Olá mundo", "pt-BR")
    second = TTSService.cache_path("Olá mundo", "pt-BR")
    other_lang = TTSService.cache_path("Olá mundo", "de-DE")

    assert first == second
    assert first != other_lang
    assert first.name.endswith(".mp3")
    assert first.parent.name == "tts-cache"
