NOTE_NORMALIZATION = {
    "وانیل ماداگاسکار": "وانیل",
    "ونیل": "وانیل",
    "صندل": "چوب صندل",
    "صندل سفید": "چوب صندل",
}


def normalize_note_label(raw: str) -> str:
    raw = raw.strip()
    return NOTE_NORMALIZATION.get(raw, raw)


