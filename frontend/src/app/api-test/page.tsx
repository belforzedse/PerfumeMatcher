"use client";

import { useEffect, useState } from "react";
import { getPerfumes, type Perfume } from "@/lib/api";

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "string") {
    return err;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
};

export default function ApiTestPage() {
  const [status, setStatus] = useState("Testing...");
  const [error, setError] = useState<string | null>(null);
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);

  useEffect(() => {
    async function test() {
      try {
        setStatus("Loading data from JSON file...");
        console.log("Loading perfumes from public/data/data.json");

        const data = await getPerfumes();

        console.log("Got perfumes:", data.length);
        setPerfumes(data);
        setStatus(`Success! Got ${data.length} perfumes`);
      } catch (err: unknown) {
        console.error("Error:", err);
        setError(getErrorMessage(err));
        setStatus("Failed");
      }
    }

    test();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Data Loader Test</h1>
      <div style={{ marginBottom: "20px" }}>
        <h2>Data Source</h2>
        <p>Data loaded from: <code>public/data/data.json</code></p>
        <p>No backend required - all data is in JSON file</p>
      </div>
      <div>
        <h2>Status: {status}</h2>
        {error && (
          <div style={{ color: "red", marginTop: "10px" }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {perfumes.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Perfumes ({perfumes.length}):</h3>
            <ul>
              {perfumes.slice(0, 5).map((p) => (
                <li key={p.id}>
                  {p.nameFa || p.nameEn} - {p.brand || "No brand"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
