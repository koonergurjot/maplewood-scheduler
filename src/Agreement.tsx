import { useState } from "react";
import { authFetch } from "./utils/api";

export default function Agreement() {
  const [uploaded, setUploaded] = useState(false);
  const [query, setQuery] = useState("");
  interface Match {
    line: string;
    lineNumber: number;
    context: string;
  }
  const [results, setResults] = useState<Match[]>([]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await authFetch("/api/collective-agreement/upload", {
      method: "POST",
      body: form,
    });
    setUploaded(true);
  };

  const search = async () => {
    const res = await authFetch(
      `/api/collective-agreement/search?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    const matches = (data.matches ?? []) as Match[];
    setResults(matches);
  };

  return (
    <div className="container">
      <div className="nav">
        <div>
          <div className="title">Collective Agreement</div>
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        {!uploaded && (
          <div>
            <input type="file" onChange={onUpload} />
          </div>
        )}
        {uploaded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="Search policy…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn" onClick={search}>
              Search
            </button>
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  <div>{r.line}</div>
                  <small>
                    Line {r.lineNumber}: {r.context}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
