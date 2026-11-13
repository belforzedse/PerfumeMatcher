"use client";

import { useRef, useState, type FormEvent } from "react";
import { createInitialAnswers, type QuestionnaireAnswers } from "@/lib/questionnaire";
import type { RankedPerfume } from "@/lib/perfume-matcher";
import styles from "./kiosk.module.css";

const notes = [
  ["citrus", "Citrus"],
  ["floral", "Floral"],
  ["fruity", "Fruit"],
  ["woody", "Woods"],
  ["spicy", "Spice"],
  ["sweet", "Sweet"],
  ["gourmand", "Gourmand"],
  ["green", "Green"],
  ["oriental", "Amber"],
  ["resinous", "Resins"],
  ["aquatic", "Marine"],
  ["earthy", "Earthy"],
  ["musky", "Musk"],
  ["animalic", "Animalic"],
  ["powdery", "Powder"],
  ["tobacco", "Tobacco"],
  ["leather", "Leather"],
] as const;

type Outcome =
  | { state: "idle" | "loading" | "error" }
  | { state: "ready"; items: RankedPerfume[]; baseline: boolean };

function NoteOptions({ group, selected, blocked, onChange }: {
  group: string;
  selected: string[];
  blocked: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{group}</legend>
      <div className={styles.chips}>
        {notes.map(([value, label]) => (
          <label key={value} className={styles.chip}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              disabled={blocked.includes(value)}
              onChange={(event) => onChange(event.target.checked ? [...selected, value] : selected.filter((item) => item !== value))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Recommendation({ item, baseline }: { item: RankedPerfume; baseline: boolean }) {
  const layers = [
    ["Top", item.notes.top],
    ["Heart", item.notes.middle],
    ["Base", item.notes.base],
  ] as const;
  return (
    <article className={styles.result}>
      <div className={styles.resultHeading}>
        <div>
          {item.brand && <p className={styles.brandName} dir="auto">{item.brand}</p>}
          <h3 dir="auto">{item.nameEn || item.nameFa || "Unnamed fragrance"}</h3>
        </div>
        <p className={styles.score}>{baseline ? "Catalog result" : `${item.matchPercentage}% match`}</p>
      </div>
      {item.family && <p className={styles.family} dir="auto">{item.family}</p>}
      <dl className={styles.layers}>
        {layers.filter(([, values]) => values.length > 0).map(([label, values]) => (
          <div key={label}><dt>{label}</dt><dd dir="auto">{values.join(", ")}</dd></div>
        ))}
      </dl>
      {item.reasons.length > 0 && (
        <details className={styles.details}>
          <summary>Why it matches</summary>
          <ul>{item.reasons.map((reason, index) => <li key={index} dir="auto">{reason}</li>)}</ul>
        </details>
      )}
    </article>
  );
}

export function FragranceFinder() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(createInitialAnswers);
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });
  const [dirty, setDirty] = useState(false);
  const request = useRef<AbortController | null>(null);

  function change<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
    if (outcome.state === "ready") setDirty(true);
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    setAnswers(createInitialAnswers());
    setOutcome({ state: "idle" });
    setDirty(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setDirty(false);
    setOutcome({ state: "loading" });

    try {
      const response = await fetch("/api/recommendations?lang=en", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Recommendation service returned an error");
      const payload = (await response.json()) as { ranked?: RankedPerfume[]; fallback?: boolean };
      if (!Array.isArray(payload.ranked)) throw new Error("Invalid recommendation response");
      if (!controller.signal.aborted) {
        setOutcome({ state: "ready", items: payload.ranked, baseline: Boolean(payload.fallback) });
      }
    } catch {
      if (!controller.signal.aborted) setOutcome({ state: "error" });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  const loading = outcome.state === "loading";
  return (
    <div className={styles.workbench}>
      <form id="preferences" onSubmit={submit} onReset={reset} className={styles.form}>
        <div className={styles.heading}>
          <h2>Your preferences</h2>
          <button className={styles.reset} type="reset">Reset</button>
        </div>
        <fieldset className={styles.fields} disabled={loading}>
          <legend className={styles.srOnly}>Fragrance preferences</legend>
          <div className={styles.selects}>
            <label>
              Occasion
              <select value={answers.moments[0] || ""} onChange={(event) => change("moments", event.target.value ? [event.target.value] : [])}>
                <option value="">Any occasion</option>
                <option value="daily">Everyday or work</option>
                <option value="evening">Evening or special event</option>
                <option value="outdoor">Outdoors</option>
                <option value="gift">A gift</option>
              </select>
            </label>
            <label>
              Intensity
              <select value={answers.intensity[0] || ""} onChange={(event) => change("intensity", event.target.value ? [event.target.value] : [])}>
                <option value="">Any intensity</option>
                <option value="light">Light</option>
                <option value="medium">Moderate</option>
                <option value="strong">Strong</option>
              </select>
            </label>
          </div>
          <NoteOptions group="Notes you like" selected={answers.noteLikes} blocked={answers.noteDislikes} onChange={(value) => change("noteLikes", value)} />
          <NoteOptions group="Notes you’d rather avoid" selected={answers.noteDislikes} blocked={answers.noteLikes} onChange={(value) => change("noteDislikes", value)} />
          <button className={styles.action} type="submit">{loading ? "Finding fragrances…" : "Find fragrances"}</button>
        </fieldset>
      </form>
      <section className={styles.recommendations} aria-labelledby="results-title" aria-busy={loading}>
        <div className={styles.heading}><h2 id="results-title">Your shortlist</h2></div>
        <div className={styles.feedback} role="status">
          {outcome.state === "idle" && <p>Your fragrance matches will appear here.</p>}
          {loading && <p>Matching your preferences to the catalog…</p>}
          {outcome.state === "error" && <p>The recommendation service is unavailable. Your choices are saved here. Try again in a moment.</p>}
          {outcome.state === "ready" && (
            <p>{dirty ? "Preferences changed. Select Find fragrances to refresh." :
              outcome.items.length ? `${outcome.items.length} ${outcome.items.length === 1 ? "match" : "matches"}${outcome.baseline ? " from catalog ranking" : ""}.` :
              "No matches this time. Try changing your notes or occasion."}</p>
          )}
        </div>
        {outcome.state === "ready" && outcome.items.map((item) => <Recommendation key={item.id} item={item} baseline={outcome.baseline} />)}
      </section>
    </div>
  );
}
