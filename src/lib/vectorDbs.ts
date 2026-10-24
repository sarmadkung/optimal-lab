// Vector databases. The choice between pgvector, Pinecone, Qdrant and Weaviate depends
// less on speed charts than on three numbers (how many vectors, how many dimensions,
// how selective your filters are) and on how you want to run it. Index memory and the
// filtered-search arithmetic run here; product traits are summarised from public docs.

export type Db = "pgvector" | "pinecone" | "qdrant" | "weaviate";
export type FilterHow = "post" | "iterative" | "inGraph";
export const DBS: { id: Db; label: string; run: string; filter: FilterHow; filterNote: string; traits: string[] }[] = [
  { id: "pgvector", label: "pgvector (Postgres)", run: "inside the Postgres you already run", filter: "iterative", filterNote: "HNSW with SQL WHERE; iterative index scans (0.8+) keep looking when the filter removes results", traits: ["joins and transactions with your app data", "one database to back up and secure", "one node's memory is the ceiling"] },
  { id: "pinecone", label: "Pinecone", run: "managed service only", filter: "inGraph", filterNote: "metadata filters applied during search; namespaces per tenant", traits: ["nothing to operate", "scales storage separately from compute", "data lives in a vendor's cloud"] },
  { id: "qdrant", label: "Qdrant", run: "self-hosted or managed", filter: "inGraph", filterNote: "payload filters applied while walking the graph", traits: ["scalar and binary quantization", "self-host for free, or managed cloud", "a separate system to keep in sync"] },
  { id: "weaviate", label: "Weaviate", run: "self-hosted or managed", filter: "inGraph", filterNote: "filters applied during search; built-in BM25 for hybrid queries", traits: ["hybrid keyword + vector search built in", "modules call embedding models for you", "a separate system to keep in sync"] },
];

export type Quant = "float32" | "int8" | "binary";
export const BYTES: Record<Quant, number> = { float32: 4, int8: 1, binary: 1 / 8 };
export const HNSW_OVERHEAD = 1.4; // graph links on top of the vectors (M=16 or so)
export const NODE_RAM_GB = 64; // one big database server

export type Design = { vectors: number; dims: number; quant: Quant; selectivity: number; db: Db; k: number; ef: number };
export const FIRST: Design = { vectors: 5_000_000, dims: 1536, quant: "float32", selectivity: 0.01, db: "pgvector", k: 10, ef: 40 };

export function indexGb(d: Design) {
  return (d.vectors * d.dims * BYTES[d.quant] * HNSW_OVERHEAD) / 1024 ** 3;
}

// a filtered query: "top 10 similar documents in this customer's workspace"
export function filtered(d: Design, how: FilterHow) {
  if (how === "post") {
    // the index returns ef candidates, then the filter removes most of them
    const expected = d.ef * d.selectivity;
    return { returned: Math.min(d.k, Math.round(expected * 10) / 10), scanned: d.ef, note: `${d.ef} nearest candidates × ${(d.selectivity * 100).toFixed(0)}% that match ≈ ${expected.toFixed(1)}` };
  }
  if (how === "iterative") {
    // keep pulling candidates until k matches are found (or a scan limit is hit)
    const needed = Math.ceil(d.k / d.selectivity);
    const limit = 20_000;
    return { returned: needed <= limit ? d.k : Math.round((limit * d.selectivity) * 10) / 10, scanned: Math.max(d.ef, Math.min(needed, limit)), note: `scans about ${Math.min(needed, limit).toLocaleString("en-US")} candidates to find ${d.k} matches` };
  }
  return { returned: d.k, scanned: Math.round(d.ef / Math.sqrt(Math.max(d.selectivity, 0.001))), note: "skips non-matching points while walking the graph" };
}

export function evaluate(d: Design) {
  const gb = indexGb(d);
  const db = DBS.find((x) => x.id === d.db)!;
  const f = filtered(d, db.filter);
  const naive = filtered(d, "post");
  return { gb, fitsNode: gb <= NODE_RAM_GB * 0.6, db, f, naive };
}
