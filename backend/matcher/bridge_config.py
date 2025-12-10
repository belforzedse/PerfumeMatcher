from typing import Dict, List

# Mood → representative Persian note tags (new kiosk moods)
MOOD_TO_NOTE_TAGS: Dict[str, List[str]] = {
    "fresh": ["ترنج", "لیمو", "گریپ فروت", "اقیانوسی", "نعنا"],
    "sweet": ["وانیل", "کارامل", "پرالین", "عسل", "تونکا"],
    "warm": ["دارچین", "فلفل", "کهربا", "ادویه‌ای"],
    "floral": ["رز", "یاس", "شکوفه پرتقال", "گل صدتومانی"],
    "woody": ["چوب صندل", "سدر", "عود", "خس خس"],
}

# Moment → supportive note/occasion tags
MOMENT_TO_NOTE_TAGS: Dict[str, List[str]] = {
    "daily": ["خنک", "ملایم", "ترنج"],
    "evening": ["کهربا", "رز", "عود"],
    "outdoor": ["اقیانوسی", "نعنا", "لیمو"],
    "gift": ["وانیل", "رز", "مشک"],
}

MOMENT_TO_OCCASION_TAGS: Dict[str, List[str]] = {
    "daily": ["everyday", "office"],
    "evening": ["night_out", "date"],
    "outdoor": ["sport", "everyday"],
    "gift": ["formal", "everyday"],
}

# Time → optional occasion emphasis
TIME_TO_OCCASION_TAGS: Dict[str, List[str]] = {
    "day": ["daytime"],
    "night": ["night"],
    "anytime": [],
}

# Style → gender leaning tokens
STYLE_TO_GENDER_TOKENS: Dict[str, List[str]] = {
    "feminine": ["gender_female"],
    "masculine": ["gender_male"],
    "unisex": ["gender_unisex"],
    "any": [],
}

# Note categories (like/dislike) → representative tags
NOTE_CATEGORY_TO_TAGS: Dict[str, List[str]] = {
    "citrus": ["ترنج", "لیمو", "پرتقال", "گریپ فروت"],
    "floral": ["رز", "یاس", "شمعدانی", "یاسمن"],
    "woody": ["سدر", "چوب صندل", "عود", "خس خس"],
    "spicy": ["فلفل", "دارچین", "هل", "میخک"],
    "sweet": ["وانیل", "کارامل", "پرالین", "عسل"],
    "green": ["نعنا", "ریحان", "چای سبز", "گیاهی"],
    "oriental": ["کهربا", "بخور", "لابدانوم"],
    "musky": ["مشک", "کشمیر", "ایریس"],
}

# Sweet/fresh axes for legacy sliders
SWEET_NOTES: List[str] = ["وانیل", "تونکا", "پرالین", "کارامل", "عسل"]
FRESH_NOTES: List[str] = ["ترنج", "لیمو", "نعنا", "اقیانوسی", "سیب سبز"]

# Legacy mappings retained to keep compatibility with earlier clients
CONTEXT_TO_NOTE_TAGS: Dict[str, List[str]] = {
    "office": ["خنک", "ملایم"],
    "casual_day": [],
    "date_night": ["وانیل", "رز", "کهربا"],
    "club": ["عود", "خیلی قوی"],
    "special_event": ["چوب صندل", "مشک", "کهربا"],
}

CONTEXT_TO_OCCASION_TAGS: Dict[str, List[str]] = {
    "office": ["office"],
    "casual_day": ["everyday"],
    "date_night": ["date"],
    "club": ["night_out"],
    "special_event": ["formal"],
}
