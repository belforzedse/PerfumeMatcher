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
    "anytime": ["daytime", "night"],  # Match perfumes suitable for both
}

# Style → gender leaning tokens
STYLE_TO_GENDER_TOKENS: Dict[str, List[str]] = {
    "feminine": ["gender_female"],
    "masculine": ["gender_male"],
    "unisex": ["gender_unisex"],
    "any": [],  # Intentionally empty: no gender bias when user selects "any"
}

# Note categories (like/dislike) → representative tags
NOTE_CATEGORY_TO_TAGS: Dict[str, List[str]] = {
    "citrus": ["ترنج", "لیمو", "پرتقال", "گریپ فروت", "ماندارین"],
    "floral": ["رز", "یاس", "شمعدانی", "یاسمن", "گل صدتومانی"],
    "woody": ["سدر", "چوب صندل", "عود", "خس خس", "وتیور"],
    "spicy": ["فلفل", "دارچین", "هل", "میخک", "زعفران"],
    "sweet": ["وانیل", "کارامل", "پرالین", "عسل", "تونکا"],
    "gourmand": ["قهوه", "شکلات", "کاکائو", "بادام", "فندق"],
    "fruity": ["سیب", "انگور", "توت فرنگی", "انار", "انجیر"],
    "green": ["نعنا", "ریحان", "چای سبز", "گیاهی", "اسطوخودوس"],
    "oriental": ["کهربا", "بخور", "لابدانوم", "بنزوئین"],
    "resinous": ["رزین", "صمغ", "بالم", "الوبانوم"],
    "aquatic": ["آب", "دریا", "اقیانوسی", "خزه"],
    "earthy": ["خاک", "پچولی", "خزه", "ترافل"],
    "musky": ["مشک", "کشمیر", "ایریس"],
    "animalic": ["کاستوریوم", "عنبر"],
    "powdery": ["پودری", "ایریس", "پودر تالک"],
    "tobacco": ["تنباکو", "شکوفه تنباکو"],
    "leather": ["چرم"],
    "herbal": ["بابونه", "افسنطین", "جینسینگ", "رازک", "بادرنجبویه"],
    "beverage": ["شراب", "شامپاین", "براندی", "تکیلا", "ویسکی"],
    "synthetic": ["آلدئیدها", "ایندول", "سیترون", "لورنوکس"],
    "mineral": ["فلز", "سنگ", "آسفالت", "باروت"],
        # Specific disliked perfume notes
    "وانیل": ["وانیل"],
    "عود": ["عود"],
    "چرم": ["چرم"],

    "نعناع هندی": [
        "نعناع هندی",
        "پاتچولی",
        "پچولی",
    ],

    "پاتچولی": [
        "نعناع هندی",
        "پاتچولی",
        "پچولی",
    ],

    "یاس": ["یاس", "گل یاس"],
    "یاسمن": ["یاسمن"],
    "مریم": ["مریم", "گل مریم"],
    "گاردنیا": ["گاردنیا"],
    "بهار نارنج": ["بهار نارنج", "بهارنارنج"],

    "ترنج": ["ترنج"],
    "گریپ فروت": ["گریپ فروت"],
    "لیمو": ["لیمو"],

    "مشک": ["مشک"],
}
SCENT_TRAIT_TO_NOTES: Dict[str, List[str]] = {
    "sweetness": [
        "وانیل", "کارامل", "عسل",
        "تونکا", "پرالین", "شکلات",
    ],
    "freshness": [
        "ترنج", "لیمو", "گریپ فروت",
        "نعنا", "نعناع", "ماندارین",
    ],
    "warmth": [
        "کهربا", "دارچین", "بنزوئین",
        "عود", "لابدانوم",
    ],
    "bitterness": [
        "قهوه", "چرم", "وتیور", "خس خس",
    ],
    "powdery": [
        "پودری", "ایریس",
        "زنبق", "پودر تالک",
    ],
    "woody": [
        "سدر", "چوب صندل",
        "عود", "وتیور", "چوب گایاک",
    ],
}
# Customer-friendly note category mappings
NOTE_CATEGORY_TO_TAGS.update({
    "gourmand": [
        "شکلات",
        "کاکائو",
        "کارامل",
        "پرالین",
    ],
    "sweet": [
        "عسل",
        "شکر",
        "آبنبات",
        "تونکا",
        "پرالین",
    ],
    "woody": [
        "سدر",
        "چوب صندل",
        "چوب گایاک",
        "وتیور",
        "خس خس",
    ],
    "resinous": [
        "بخور",
        "کندر",
        "مر",
        "رزین",
        "صمغ",
        "الوبانوم",
    ],
    "musky": [
        "مشک",
        "مشک سفید",
    ],
    "aquatic": [
        "دریایی",
        "اقیانوسی",
        "آکواتیک",
        "نت‌های آبی",
        "کالون",
    ],
    "vanilla": [
        "وانیل",
        "وانیل ماداگاسکار",
        "وانیل بوربون",
    ],
    "white-floral": [
        "یاس",
        "گل یاس",
        "یاسمن",
        "مریم",
        "گل مریم",
        "گاردنیا",
        "بهار نارنج",
        "بهارنارنج",
    ],
    "soapy": [
        "صابونی",
        "صابون",
        "آلدئید",
        "آلدئیدها",
        "تمیز",
    ],
})
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
