export interface Choice {
  value: string;
  label: string;
  icon?: string;
}

export interface NoteChoice extends Choice {
  keywords: string[];
}

export const MOOD_CHOICES: Choice[] = [
  { value: "fresh", label: "خنک و تازه", icon: "🥒" },
  { value: "sweet", label: "شیرین و خوراکی", icon: "🍯" },
  { value: "warm", label: "گرم و تند", icon: "🔥" },
  { value: "floral", label: "گلی و لطیف", icon: "🌸" },
  { value: "woody", label: "چوبی و خاکی", icon: "🌲" },
];

export const MOMENT_CHOICES: Choice[] = [
  { value: "daily", label: "روزمره و محل کار", icon: "🗓️" },
  { value: "evening", label: "شب و مهمانی", icon: "🌙" },
  { value: "outdoor", label: "فضای باز و ورزش", icon: "🏞️" },
  { value: "gift", label: "هدیه", icon: "🎁" },
];

export const TIME_CHOICES: Choice[] = [
  { value: "day", label: "روز", icon: "🌞" },
  { value: "night", label: "شب", icon: "🌜" },
  { value: "anytime", label: "هر زمان", icon: "🕒" },
];

export const GENDER_CHOICES: Choice[] = [
  { value: "male", label: "مرد", icon: "👨" },
  { value: "female", label: "زن", icon: "👩" },
  { value: "unisex", label: "یونیسکس", icon: "⚧️" },
];

export const INTENSITY_CHOICES: Choice[] = [
  { value: "light", label: "ملایم", icon: "🫧" },
  { value: "medium", label: "متوسط", icon: "✨" },
  { value: "strong", label: "قوی", icon: "💥" },
];

export const STYLE_CHOICES: Choice[] = [
  { value: "feminine", label: "زنانه", icon: "👩" },
  { value: "masculine", label: "مردانه", icon: "👨" },
  { value: "unisex", label: "یونیسکس", icon: "⚧️" },
  { value: "any", label: "فرقی ندارد", icon: "⭕" },
];

// Base keywords for note categories
const BASE_KEYWORDS: Record<string, string[]> = {
  citrus: ["bergamot", "lemon", "orange", "grapefruit", "lime", "citrus", "mandarin"],
  floral: ["rose", "jasmine", "tuberose", "violet", "peony", "lily", "orchid"],
  fruity: ["apple", "pear", "peach", "berry", "grape", "mango", "fruity"],
  woody: ["cedar", "sandalwood", "vetiver", "oak", "oud", "wood"],
  spicy: ["pepper", "cinnamon", "cardamom", "clove", "nutmeg", "spice", "saffron"],
  sweet: ["vanilla", "caramel", "tonka", "honey", "praline"],
  gourmand: ["coffee", "chocolate", "cocoa", "almond", "hazelnut", "gourmand"],
  green: ["mint", "herb", "tea", "basil", "sage", "green", "lavender"],
  oriental: ["amber", "incense", "labdanum", "benzoin", "oriental"],
  resinous: ["resin", "balsam", "frankincense", "myrrh", "elemi"],
  aquatic: ["water", "marine", "oceanic", "aquatic", "sea"],
  earthy: ["earth", "moss", "patchouli", "truffle", "earthy"],
  musky: ["musk", "cashmere", "iris"],
  animalic: ["castoreum", "ambergris", "animalic"],
  powdery: ["powder", "talc", "powdery", "iris"],
  tobacco: ["tobacco", "tobacco flower"],
  leather: ["leather"],
  herbal: ["herb", "medicinal", "chamomile", "absinthe", "ginseng"],
  beverage: ["wine", "champagne", "brandy", "alcohol", "drink"],
  synthetic: ["synthetic", "aldehyde", "indole", "chemical"],
  mineral: ["metal", "stone", "mineral", "asphalt"],
};

// Get keywords for a category
function getKeywords(category: string): string[] {
  return BASE_KEYWORDS[category] || [];
}

export const NOTE_CHOICES: NoteChoice[] = [
  {
    value: "citrus",
    label: "لیمو و مرکبات",
    icon: "🍋",
    keywords: getKeywords("citrus"),
  },
  {
    value: "floral",
    label: "گل رز و گل‌ها",
    icon: "🌹",
    keywords: getKeywords("floral"),
  },
  {
    value: "fruity",
    label: "میوه‌های شیرین",
    icon: "🍎",
    keywords: getKeywords("fruity"),
  },
  {
    value: "woody",
    label: "چوب و جنگل",
    icon: "🌲",
    keywords: getKeywords("woody"),
  },
  {
    value: "spicy",
    label: "ادویه و دارچین",
    icon: "🌶️",
    keywords: getKeywords("spicy"),
  },
  {
    value: "sweet",
    label: "عسل و شیرینی",
    icon: "🍯",
    keywords: getKeywords("sweet"),
  },
  {
    value: "gourmand",
    label: "شکلات و کارامل",
    icon: "🍫",
    keywords: getKeywords("gourmand"),
  },
  {
    value: "green",
    label: "سبزه و گیاهان",
    icon: "🌿",
    keywords: getKeywords("green"),
  },
  {
    value: "oriental",
    label: "کهربا و گرما",
    icon: "🧡",
    keywords: getKeywords("oriental"),
  },
  {
    value: "resinous",
    label: "بخور و صمغ",
    icon: "🕯️",
    keywords: getKeywords("resinous"),
  },
  {
    value: "aquatic",
    label: "دریا و هوای خنک",
    icon: "🌊",
    keywords: getKeywords("aquatic"),
  },
  {
    value: "earthy",
    label: "خاک و خزه",
    icon: "🍂",
    keywords: getKeywords("earthy"),
  },
  {
    value: "musky",
    label: "مشک لطیف",
    icon: "🫧",
    keywords: getKeywords("musky"),
  },
  {
    value: "powdery",
    label: "پودری و لطیف",
    icon: "☁️",
    keywords: getKeywords("powdery"),
  },
  {
    value: "tobacco",
    label: "تنباکو",
    icon: "☘️",
    keywords: getKeywords("tobacco"),
  },
  {
    value: "leather",
    label: "چرم و جیر",
    icon: "👜",
    keywords: getKeywords("leather"),
  },
  {
    value: "vanilla",
    label: "وانیل",
    icon: "🍦",
    keywords: ["vanilla"],
  },
  {
    value: "white-floral",
    label: "یاس و گل‌های سفید",
    icon: "💮",
    keywords: ["jasmine", "tuberose", "gardenia"],
  },
  {
    value: "soapy",
    label: "صابون و تمیزی",
    icon: "🧼",
    keywords: ["soap", "soapy", "clean", "aldehydic"],
  },
];

export const LABEL_LOOKUP = Object.fromEntries(
  [
    ...MOOD_CHOICES,
    ...MOMENT_CHOICES,
    ...TIME_CHOICES,
    ...GENDER_CHOICES,
    ...INTENSITY_CHOICES,
    ...STYLE_CHOICES,
    ...NOTE_CHOICES,
  ].map((choice) => [choice.value, choice.label])
);
