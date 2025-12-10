import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_BYTES = 10 * 1024 * 1024; // 10MB guard
const ALLOWED_PREFIX = "image/";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "فایل ارسال نشده است." }, { status: 400 });
  }

  if (!file.type.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ error: "فقط فایل‌های تصویری مجاز است." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "حجم فایل بیش از حد مجاز است." }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const filePath = join(UPLOAD_DIR, uniqueName);

  await writeFile(filePath, Buffer.from(arrayBuffer));

  const url = `/uploads/${uniqueName}`;
  return NextResponse.json({ url }, { status: 201 });
}

