
import re
from html.parser import HTMLParser


class ProductHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_table = False
        self.in_row = False
        self.cell = None
        self.cell_parts = []
        self.row = {}
        self.details = {}
        self.paragraphs = []
        self.paragraph_parts = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.in_table = True
        elif tag == "tr" and self.in_table:
            self.in_row = True
            self.row = {}
        elif tag in ("th", "td") and self.in_row:
            self.cell = tag
            self.cell_parts = []
        elif tag == "p" and not self.in_table:
            self.paragraph_parts = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell_parts.append(data)
        elif self.paragraph_parts is not None:
            self.paragraph_parts.append(data)

    def handle_endtag(self, tag):
        if tag in ("th", "td") and self.cell == tag:
            self.row[tag] = " ".join(
                "".join(self.cell_parts).split()
            )
            self.cell = None

        elif tag == "tr" and self.in_row:
            if self.row.get("th") and self.row.get("td"):
                self.details[self.row["th"]] = self.row["td"]
            self.in_row = False

        elif tag == "table":
            self.in_table = False

        elif tag == "p" and self.paragraph_parts is not None:
            text = " ".join(
                "".join(self.paragraph_parts).split()
            )
            if text:
                self.paragraphs.append(text)
            self.paragraph_parts = None


def split_notes(value):
    return [
        part.strip()
        for part in re.split(r"[,،]", value or "")
        if part.strip()
    ]


def parse_short_description(html):
    parser = ProductHTMLParser()
    parser.feed(html or "")

    data = parser.details

    top = split_notes(data.get("اسانس اولیه"))
    middle = split_notes(data.get("اسانس میانی"))
    base = split_notes(data.get("اسانس پایه"))

    suitable = data.get("مناسب برای", "")

    if "خانم" in suitable or "زن" in suitable:
        gender = "female"
    elif "آقا" in suitable or "مرد" in suitable:
        gender = "male"
    elif "یونیسکس" in suitable or "مشترک" in suitable:
        gender = "unisex"
    else:
        gender = None

    return {
        "brand": data.get("برند", ""),
        "temperament": data.get("طبع", ""),
        "family": data.get("گروه بویایی", ""),
        "gender": gender,
        "notes_top": top,
        "notes_middle": middle,
        "notes_base": base,
        "all_notes": list(dict.fromkeys(top + middle + base)),
        "description": "\n".join(parser.paragraphs),
    }
