/**
 * Minimal in-memory stand-in for the Supabase query builder, covering the calls src/server uses:
 * from().select/insert/update/upsert/delete, eq/is/order filters, single/maybeSingle, and await.
 * Rows are stored as plain objects per table. Not a full PostgREST emulation.
 */
type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  /** Called before each update lands; tests use it to simulate a concurrent write. */
  beforeUpdate: ((table: string) => void) | null = null;

  from(table: string) {
    this.tables[table] ??= [];
    return new Query(this, table);
  }
}

class Query implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private op: { kind: "select" } | { kind: "insert"; rows: Row[]; upsert?: boolean } | { kind: "update"; patch: Row } | { kind: "delete" } = { kind: "select" };
  private returning = false;
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(private db: FakeSupabase, private table: string) {}

  select() {
    if (this.op.kind !== "select") this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = { kind: "insert", rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.op = { kind: "insert", rows: Array.isArray(rows) ? rows : [rows], upsert: true };
    return this;
  }
  update(patch: Row) {
    this.op = { kind: "update", patch };
    return this;
  }
  delete() {
    this.op = { kind: "delete" };
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  is(col: string, val: null) {
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }
  order() {
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private run(): Result {
    const rows = this.db.tables[this.table];
    const match = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[] = [];
    switch (this.op.kind) {
      case "select":
        out = rows.filter(match);
        break;
      case "insert":
        for (const r of this.op.rows) {
          const row = { created_at: new Date().toISOString(), ...r };
          rows.push(row);
          out.push(row);
        }
        break;
      case "update":
        this.db.beforeUpdate?.(this.table);
        for (const r of rows.filter(match)) {
          Object.assign(r, structuredClone(this.op.patch));
          out.push(r);
        }
        break;
      case "delete":
        out = rows.filter(match);
        this.db.tables[this.table] = rows.filter((r) => !match(r));
        break;
    }
    const data = structuredClone(out);
    if (this.op.kind !== "select" && !this.returning) return { data: null, error: null };
    if (this.mode === "single") return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { message: "expected one row" } };
    if (this.mode === "maybeSingle") return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(ok, fail);
  }
}
