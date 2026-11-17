import os

import httpx
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


class WooCommerceClient:
    def __init__(self):
        base_url = os.getenv("GANDOM_WC_URL", "").rstrip("/")
        key = os.getenv("GANDOM_WC_KEY", "")
        secret = os.getenv("GANDOM_WC_SECRET", "")

        if not all([base_url, key, secret]):
            raise ValueError(
                "WooCommerce environment variables are missing."
            )

        self.base_url = f"{base_url}/wp-json/wc/v3"
        self.auth = (key, secret)

    def get(self, endpoint, params=None):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        with httpx.Client(
            auth=self.auth,
            timeout=30,
            follow_redirects=False,
        ) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def get_products(self, page=1, per_page=50):
        return self.get(
            "products",
            {
                "page": page,
                "per_page": per_page,
                "status": "publish",
            },
        )

    def get_variations(self, product_id, page=1):
        return self.get(
            f"products/{product_id}/variations",
            {
                "page": page,
                "per_page": 100,
            },
        )

    def get_all_products(self):
        products = []
        page = 1

        while True:
            batch = self.get_products(page=page)

            if not batch:
                break

            products.extend(batch)
            page += 1

        return products

    def get_all_variations(self, product_id):
        variations = []
        page = 1

        while True:
            batch = self.get_variations(
                product_id,
                page=page,
            )

            if not batch:
                break

            variations.extend(batch)
            page += 1

        return variations