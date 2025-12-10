from typing import List, Literal, Optional
from dataclasses import dataclass, field

Gender = Literal["male", "female", "unisex"]
Season = Literal["spring", "summer", "autumn", "winter"]
Occasion = Literal["office", "date", "night_out", "everyday", "formal"]


@dataclass
class Perfume:
    id: str
    name: str
    brand: str
    gender: Optional[Gender] = None
    family: Optional[str] = None
    main_accords: List[str] = field(default_factory=list)
    top_notes: List[str] = field(default_factory=list)
    heart_notes: List[str] = field(default_factory=list)
    base_notes: List[str] = field(default_factory=list)
    seasons: List[Season] = field(default_factory=list)
    occasions: List[Occasion] = field(default_factory=list)
    intensity: Optional[str] = None
