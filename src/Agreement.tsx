import { useState } from "react";

export default function Agreement() {
  const [uploaded, setUploaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await fetch("/api/collective-agreement/upload", {
      method: "POST",
      body: form,
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    });
    setUploaded(true);
  };

  const search = async () => {
    const res = await fetch(
      `/api/collective-agreement/search?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
    );
    const data = await res.json();
    setResults(data.matches || []);
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
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
