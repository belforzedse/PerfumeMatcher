import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import type { DataFile } from "./data-loader";
import { clearCache } from "./data-loader";

const dataPath = join(process.cwd(), "data", "data.json");

async function readDataFile(): Promise<DataFile> {
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as DataFile;
}

async function writeDataFile(nextData: DataFile): Promise<void> {
  const serialized = JSON.stringify(nextData, null, 2);
  await writeFile(dataPath, serialized, "utf-8");
  clearCache();
}

export async function loadData(): Promise<DataFile> {
  return readDataFile();
}

export async function persistData(mutator: (data: DataFile) => DataFile | void): Promise<DataFile> {
  const data = await readDataFile();
  const updated = mutator(data) || data;
  await writeDataFile(updated);
  return updated;
}

