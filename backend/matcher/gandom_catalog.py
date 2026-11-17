
import time
import httpx

from api.models import Perfume
from api.product_parser import parse_short_description
from api.woocommerce import WooCommerceClient


def load_gandom_perfumes():
    client = WooCommerceClient()
    perfumes = []
    page = 1

    while True:
        for attempt in range(5):
            try:
                products = client.get_products(
                    page=page,
                    per_page=50
                )
                break
            except httpx.TransportError:
                if attempt == 4:
                    raise
                time.sleep(3 * (attempt + 1))

        if not products:
            break

        for product in products:
            if product.get("stock_status") != "instock":
                continue

            html = product.get("short_description") or ""
            if not html.strip():
                continue

            info = parse_short_description(html)

            if not info["all_notes"] and not info["family"]:
                continue

            images = [
                image["src"]
                for image in product.get("images", [])
                if image.get("src")
            ]

            perfume = Perfume(
                id=product["id"],
                name=product.get("name", "")[:200],
                name_fa=product.get("name", "")[:200],
                brand=info["brand"][:200],
                description=info["description"],
                family=info["family"][:120],
                gender=info["gender"],
                notes_middle=info["notes_middle"],
                notes_base=info["notes_base"],
                all_notes=info["all_notes"],
                main_accords=[info["family"]] if info["family"] else [],
                images=images,
            )

            perfume.notes_top = info["notes_top"]
            perfume.wc_product_id = product["id"]
            perfume.wc_price = product.get("price", "")
            perfume.wc_url = product.get("permalink", "")
            perfume.wc_image = images[0] if images else ""
            perfume.temperament = info["temperament"]

            perfumes.append(perfume)

        print(
            f"Page {page}: {len(perfumes)} perfumes",
            flush=True
        )

        if len(products) < 50:
            break

        page += 1
        time.sleep(0.4)

    return perfumes
