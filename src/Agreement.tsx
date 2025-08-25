import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./utils/api";

export default function Agreement() {
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState(false);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [limit, setLimit] = useState(5);
  const [context, setContext] = useState(1);
  interface Match {
    line: string;
    lineNumber: number;
    context: string[];
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
      `/api/collective-agreement/search?q=${encodeURIComponent(
        query,
      )}&caseSensitive=${caseSensitive}&limit=${limit}&context=${context}`,
    );
    const data = await res.json();
    const matches = (data.matches ?? []) as Match[];
    setResults(matches);
  };

  return (
    <div className="container">
      <div className="nav">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/")}>Back</button>
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                Case sensitive
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Max results
                <input
                  type="number"
                  min={1}
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10) || 1)}
                  style={{ width: 60 }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                Context lines
                <input
                  type="number"
                  min={0}
                  value={context}
                  onChange={(e) =>
                    setContext(parseInt(e.target.value, 10) || 0)
                  }
                  style={{ width: 60 }}
                />
              </label>
            </div>
            <button className="btn" onClick={search}>
              Search
            </button>
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  <div>{r.line}</div>
                  <small>
                    Line {r.lineNumber}: {r.context.join(" — ")}
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
