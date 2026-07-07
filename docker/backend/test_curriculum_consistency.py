"""Regression tests for curriculum phrase consistency.

These tests guard against the prompt/answer mismatch where a Portuguese phrase
uses a generic noun (e.g. "a cidade") but the target-language phrase names a
specific city (e.g. "Berlin"). Such mismatches produce exercises that mark the
learner correct for a semantically different answer.
"""

from curriculum import A1_UNITS


def test_voyage_phrase_portuguese_matches_specific_city_in_target_languages():
    """The first travel phrase must not say 'a cidade' when the target says a city name."""
    unit = next(u for u in A1_UNITS if u["title"] == "Converse sobre viagem")
    for code, phrases in unit["phrases"].items():
        pt, foreign = phrases[0]
        if "Berlin" in foreign or "Paris" in foreign or "Moscou" in foreign or "東京" in foreign or "London" in foreign:
            assert "cidade" not in pt, (
                f"{code}: Portuguese prompt '{pt}' is generic but target '{foreign}' names a specific city"
            )


def test_voyage_phrase_german_matches_berlim():
    unit = next(u for u in A1_UNITS if u["title"] == "Converse sobre viagem")
    pt, foreign = unit["phrases"]["de"][0]
    assert foreign == "Ich reise nach Berlin."
    assert pt == "Eu viajo para Berlim.", f"Expected 'Eu viajo para Berlim.', got '{pt}'"
