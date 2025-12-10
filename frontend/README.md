This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx` and the components. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Data Configuration

This application uses a simple JSON file for all data (brands, perfumes, collections). No backend is required!

### Data File Structure

All data is stored in `public/data/data.json` with the following structure:

```json
{
  "brands": [
    { "id": 1, "name": "Brand Name" }
  ],
  "collections": [
    { "id": 1, "name": "Collection Name" }
  ],
  "perfumes": [
    {
      "id": 1,
      "name_en": "English Name",
      "name_fa": "نام فارسی",
      "brand": 1,
      "collection": 1,
      "gender": "unisex",
      "season": "all",
      "family": "floral",
      "character": "fresh",
      "notes": {
        "top": ["note1", "note2"],
        "middle": ["note3"],
        "base": ["note4"]
      },
      "cover": {
        "url": "/images/perfume.jpg"
      }
    }
  ]
}
```

## Environment Variables

For recommendations, you only need:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

Create a `.env` file in the project root with this key for local development.

When building the Docker image manually:

```bash
docker build -t perfume-frontend .

docker run -p 3000:3000 \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  perfume-frontend
```

## Docker Compose

Create a `.env` file in the project root and set `OPENAI_API_KEY`. Then run:

```bash
docker compose up --build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Data Management

### Adding/Editing Data

Simply edit the `public/data/data.json` file directly. The application will automatically reload the data (with 5-minute caching).

### Data File Location

- **Server-side**: Reads from `data/data.json` in the project root
- **Client-side**: Fetches from `/data/data.json` in the public folder

For deployment, ensure `public/data/data.json` exists and contains your data.

### Image Assets

Perfume images should be placed in the `public` folder and referenced in the `cover.url` field:
- Absolute paths (starting with `/`): `/images/perfume.jpg`
- Relative paths will be prefixed with `/`
- External URLs are also supported: `https://example.com/image.jpg`
