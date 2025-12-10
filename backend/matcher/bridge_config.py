from typing import Dict, List

# Mood → representative Persian note tags (tune as needed)
MOOD_TO_NOTE_TAGS: Dict[str, List[str]] = {
    "cozy": ["وانیل", "تونکا", "کهربا", "دارچین"],
    "fresh": ["ترنج", "لیمو", "گریپ فروت", "اقیانوسی", "نعنا"],
    "sexy": ["عود", "کهربا", "مشک", "رز"],
    "elegant": ["یاس", "چوب صندل", "خس خس"],
    "playful": ["میوه ای", "توت فرنگی", "تمشک"],
    "mysterious": ["عود", "بخور", "دودی"],
    "sporty": ["خنک", "آبی", "اقیانوسی"],
    "formal": ["خس خس", "چوب صندل", "رز"],
}

# Context → supportive note tags
CONTEXT_TO_NOTE_TAGS: Dict[str, List[str]] = {
    "office": ["خنک", "ملایم"],
    "casual_day": [],
    "date_night": ["وانیل", "رز", "کهربا"],
    "club": ["عود", "خیلی قوی"],
    "special_event": ["چوب صندل", "مشک", "کهربا"],
}

# Context → occasion tags used in perfume vectors
CONTEXT_TO_OCCASION_TAGS: Dict[str, List[str]] = {
    "office": ["office"],
    "casual_day": ["everyday"],
    "date_night": ["date"],
    "club": ["night_out"],
    "special_event": ["formal"],
}

# Sweet/fresh axes for slider amplification
SWEET_NOTES: List[str] = ["وانیل", "تونکا", "پرالین", "کارامل", "عسل"]
FRESH_NOTES: List[str] = ["ترنج", "لیمو", "نعنا", "اقیانوسی", "سیب سبز"]


