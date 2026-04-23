"use client";

/**
 * OpenRPC Explorer - lightweight, zero-dependency renderer for an OpenRPC 1.x
 * document. Renders method list, parameters, result, schema tree (with $ref
 * resolution), worked examples, and an interactive Try-It panel.
 *
 * Built as a custom component rather than using @open-rpc/docs-react because
 * that package peer-pins React 18.3.1 + MUI 6, which conflicts with this
 * project's React 19 + Tailwind stack.
 */

import { useMemo, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OpenRpcDoc {
  openrpc: string;
  info: {
    title: string;
    description?: string;
    version: string;
    license?: { name: string };
  };
  servers?: Array<{ name: string; url: string }>;
  methods: OpenRpcMethod[];
  components?: {
    schemas?: Record<string, JsonSchema>;
    errors?: Record<string, { code: number; message: string }>;
  };
}

interface OpenRpcMethod {
  name: string;
  summary?: string;
  description?: string;
  params: OpenRpcParam[];
  result: { name: string; description?: string; schema: JsonSchema };
  errors?: Array<{ $ref?: string }>;
  examples?: OpenRpcExample[];
}

interface OpenRpcParam {
  name: string;
  required?: boolean;
  schema: JsonSchema;
  description?: string;
}

interface OpenRpcExample {
  name: string;
  params: Array<{ name: string; value: unknown }>;
  result?: { name: string; value: unknown };
}

interface JsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  $ref?: string;
}

// ── $ref resolution ─────────────────────────────────────────────────────────

function resolveRef(ref: string, doc: OpenRpcDoc): JsonSchema | null {
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/");
  let node: unknown = doc;
  for (const p of parts) {
    if (node && typeof node === "object" && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return node as JsonSchema;
}

function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

// ── Short type rendering (for inline display) ───────────────────────────────

function typeLabel(schema: JsonSchema, doc: OpenRpcDoc): string {
  if (schema.$ref) return refName(schema.$ref);
  if (schema.oneOf) {
    return schema.oneOf.map((s) => typeLabel(s, doc)).join(" | ");
  }
  if (schema.allOf) {
    return schema.allOf.map((s) => typeLabel(s, doc)).join(" & ");
  }
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  const t = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (t === "array") {
    const item = schema.items ? typeLabel(schema.items, doc) : "any";
    return `${item}[]`;
  }
  return t ?? "any";
}

// ── Schema rendering (recursive) ────────────────────────────────────────────

interface SchemaViewProps {
  schema: JsonSchema;
  doc: OpenRpcDoc;
  depth?: number;
  seen?: Set<string>;
}

function SchemaView({ schema, doc, depth = 0, seen }: SchemaViewProps) {
  const seenRefs = useMemo(() => seen ?? new Set<string>(), [seen]);

  // $ref: resolve once; avoid infinite recursion
  if (schema.$ref) {
    const name = refName(schema.$ref);
    if (seenRefs.has(schema.$ref)) {
      return (
        <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
          ↳ {name} (recursive)
        </div>
      );
    }
    const resolved = resolveRef(schema.$ref, doc);
    if (!resolved) {
      return (
        <div className="text-xs font-mono text-red-600 dark:text-red-400">
          unresolved ref: {schema.$ref}
        </div>
      );
    }
    const nextSeen = new Set(seenRefs);
    nextSeen.add(schema.$ref);
    return (
      <div>
        <div className="mb-1 text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">
          {name}
        </div>
        <SchemaView schema={resolved} doc={doc} depth={depth} seen={nextSeen} />
      </div>
    );
  }

  // allOf: merge and render sequentially
  if (schema.allOf) {
    return (
      <div className="space-y-2">
        {schema.allOf.map((s, i) => (
          <SchemaView key={i} schema={s} doc={doc} depth={depth} seen={seenRefs} />
        ))}
      </div>
    );
  }

  // oneOf: render each variant with a separator
  if (schema.oneOf) {
    return (
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
          one of
        </div>
        {schema.oneOf.map((s, i) => (
          <div
            key={i}
            className="rounded border border-gray-200 dark:border-gray-800 p-2"
          >
            <SchemaView schema={s} doc={doc} depth={depth + 1} seen={seenRefs} />
          </div>
        ))}
      </div>
    );
  }

  // object with properties
  if (schema.properties) {
    return (
      <div>
        {schema.description && depth === 0 && (
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {schema.description}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-1 pr-3 font-medium">Field</th>
                <th className="py-1 pr-3 font-medium">Type</th>
                <th className="py-1 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(schema.properties).map(([name, prop]) => {
                const required = schema.required?.includes(name);
                return (
                  <tr
                    key={name}
                    className="border-b border-gray-100 dark:border-gray-900 align-top"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">
                      {name}
                      {required && (
                        <span
                          className="ml-1 text-red-500"
                          title="required"
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-blue-700 dark:text-blue-400">
                      {typeLabel(prop, doc)}
                    </td>
                    <td className="py-2 text-xs text-gray-600 dark:text-gray-400">
                      {prop.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // array
  if (schema.type === "array" && schema.items) {
    return (
      <div>
        <div className="mb-1 text-xs text-gray-600 dark:text-gray-400">
          Array of <span className="font-mono">{typeLabel(schema.items, doc)}</span>
        </div>
        <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-3">
          <SchemaView schema={schema.items} doc={doc} depth={depth + 1} seen={seenRefs} />
        </div>
      </div>
    );
  }

  // primitive
  return (
    <div className="text-sm">
      <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
        {typeLabel(schema, doc)}
      </span>
      {schema.description && (
        <span className="ml-2 text-gray-600 dark:text-gray-400">- {schema.description}</span>
      )}
      {schema.pattern && (
        <div className="mt-1 font-mono text-[10px] text-gray-500 dark:text-gray-500">
          pattern: {schema.pattern}
        </div>
      )}
    </div>
  );
}

// ── Formatted JSON block ────────────────────────────────────────────────────

function JsonBlock({ value }: { value: unknown }) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 text-xs leading-relaxed">
      <code>{pretty}</code>
    </pre>
  );
}

// ── Try-it panel ────────────────────────────────────────────────────────────

const ENDPOINTS = [
  { label: "Testnet", url: "https://light.zcash.me/zns-testnet" },
  { label: "Mainnet (beta)", url: "https://light.zcash.me/zns-mainnet-test" },
  { label: "Local", url: "http://127.0.0.1:3000" },
] as const;

function TryIt({ method }: { method: OpenRpcMethod }) {
  const [endpoint, setEndpoint] = useState<string>(ENDPOINTS[0].url);
  const initialParams = useMemo(() => {
    const obj: Record<string, unknown> = {};
    // Seed from the first example if present, else empty strings
    const ex = method.examples?.[0];
    if (ex) {
      for (const p of ex.params) obj[p.name] = p.value;
    } else {
      for (const p of method.params) obj[p.name] = "";
    }
    return JSON.stringify(obj, null, 2);
  }, [method]);

  const [paramsText, setParamsText] = useState<string>(initialParams);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [response, setResponse] = useState<unknown>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function run() {
    setStatus("loading");
    setErrorText(null);
    setResponse(null);
    let params: unknown = {};
    try {
      params = paramsText.trim() ? JSON.parse(paramsText) : {};
    } catch (e) {
      setStatus("error");
      setErrorText(`Invalid JSON in params: ${(e as Error).message}`);
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: method.name,
          params,
        }),
      });
      const json = await res.json();
      setResponse(json);
      setStatus(json.error ? "error" : "ok");
      if (json.error) {
        setErrorText(`${json.error.code}: ${json.error.message}`);
      }
    } catch (e) {
      setStatus("error");
      setErrorText((e as Error).message);
    }
  }

  return (
    <div className="mt-4 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Try it
        </span>
        <select
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-xs"
        >
          {ENDPOINTS.map((e) => (
            <option key={e.url} value={e.url}>
              {e.label} - {e.url}
            </option>
          ))}
        </select>
      </div>

      <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
        params (JSON)
      </label>
      <textarea
        value={paramsText}
        onChange={(e) => setParamsText(e.target.value)}
        rows={Math.max(3, paramsText.split("\n").length)}
        spellCheck={false}
        className="w-full rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 font-mono text-xs"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={status === "loading"}
          className="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Calling…" : `Call ${method.name}`}
        </button>
        {status === "ok" && (
          <span className="text-xs text-green-600 dark:text-green-400">OK</span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errorText ?? "Error"}
          </span>
        )}
      </div>

      {response !== null && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            response
          </div>
          <JsonBlock value={response} />
        </div>
      )}
    </div>
  );
}

// ── Method renderer ─────────────────────────────────────────────────────────

function MethodView({ method, doc }: { method: OpenRpcMethod; doc: OpenRpcDoc }) {
  const [showExamples, setShowExamples] = useState(false);
  const [showTryIt, setShowTryIt] = useState(false);

  return (
    <section
      id={`method-${method.name}`}
      className="scroll-mt-20 border-t border-gray-200 dark:border-gray-800 pt-8 first:border-t-0 first:pt-0"
    >
      <header className="mb-3">
        <h2 className="!mt-0 text-2xl font-bold font-mono">
          <a href={`#method-${method.name}`} className="no-underline">
            {method.name}
          </a>
        </h2>
        {method.summary && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {method.summary}
          </p>
        )}
      </header>

      {method.description && (
        <div className="mb-4 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          {method.description}
        </div>
      )}

      {/* Parameters */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Parameters
        </h3>
        {method.params.length === 0 ? (
          <p className="text-xs text-gray-500 italic">None</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">Type</th>
                  <th className="py-1 pr-3 font-medium">Required</th>
                  <th className="py-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {method.params.map((p) => (
                  <tr
                    key={p.name}
                    className="border-b border-gray-100 dark:border-gray-900 align-top"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{p.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-blue-700 dark:text-blue-400">
                      {typeLabel(p.schema, doc)}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {p.required ? "yes" : "no"}
                    </td>
                    <td className="py-2 text-xs text-gray-600 dark:text-gray-400">
                      {p.description ?? p.schema.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Result - <span className="font-mono normal-case">{method.result.name}</span>
        </h3>
        {method.result.description && (
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {method.result.description}
          </p>
        )}
        <div className="rounded border border-gray-200 dark:border-gray-800 p-3">
          <SchemaView schema={method.result.schema} doc={doc} />
        </div>
      </div>

      {/* Errors */}
      {method.errors && method.errors.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Errors
          </h3>
          <ul className="space-y-1 text-xs">
            {method.errors.map((e, i) => {
              if (!e.$ref) return null;
              const err = resolveRef(e.$ref, doc) as unknown as
                | { code: number; message: string }
                | null;
              if (!err) return null;
              return (
                <li key={i} className="font-mono">
                  <span className="text-red-600 dark:text-red-400">
                    {err.code}
                  </span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {err.message}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Toggles */}
      <div className="flex flex-wrap gap-2">
        {method.examples && method.examples.length > 0 && (
          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="cursor-pointer rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            {showExamples ? "Hide" : "Show"} examples ({method.examples.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowTryIt((v) => !v)}
          className="cursor-pointer rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          {showTryIt ? "Hide" : "Try it"}
        </button>
      </div>

      {/* Examples */}
      {showExamples && method.examples && (
        <div className="mt-4 space-y-4">
          {method.examples.map((ex, i) => (
            <div
              key={i}
              className="rounded border border-gray-200 dark:border-gray-800 p-3"
            >
              <div className="mb-2 text-xs font-semibold">{ex.name}</div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Request
              </div>
              <JsonBlock
                value={{
                  jsonrpc: "2.0",
                  id: 1,
                  method: method.name,
                  params: Object.fromEntries(
                    ex.params.map((p) => [p.name, p.value]),
                  ),
                }}
              />
              {ex.result && (
                <>
                  <div className="mt-2 mb-1 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Response
                  </div>
                  <JsonBlock
                    value={{
                      jsonrpc: "2.0",
                      id: 1,
                      result: ex.result.value,
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showTryIt && <TryIt method={method} />}
    </section>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export function OpenRpcExplorer({ spec }: { spec: OpenRpcDoc }) {
  return (
    <div className="my-8 space-y-10">
      {/* Header */}
      <header className="rounded border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              OpenRPC {spec.openrpc}
            </div>
            <h1 className="!mt-1 text-xl font-bold">{spec.info.title}</h1>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              v{spec.info.version}
              {spec.info.license && ` · ${spec.info.license.name}`}
            </div>
          </div>
          <a
            href="https://raw.githubusercontent.com/zcashme/ZNS/master/openrpc.json"
            download
            className="shrink-0 rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            openrpc.json
          </a>
        </div>
        {spec.servers && spec.servers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {spec.servers.map((s) => (
              <span
                key={s.url}
                className="rounded bg-gray-100 dark:bg-gray-900 px-2 py-1 font-mono"
              >
                {s.name}: {s.url}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Method list nav */}
      <nav className="rounded border border-gray-200 dark:border-gray-800 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Methods
        </div>
        <div className="flex flex-wrap gap-2">
          {spec.methods.map((m) => (
            <a
              key={m.name}
              href={`#method-${m.name}`}
              className="rounded bg-gray-100 dark:bg-gray-900 px-2 py-1 font-mono text-xs no-underline hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              {m.name}
            </a>
          ))}
        </div>
      </nav>

      {/* Methods */}
      <div className="space-y-10">
        {spec.methods.map((m) => (
          <MethodView key={m.name} method={m} doc={spec} />
        ))}
      </div>

      {/* Schemas */}
      {spec.components?.schemas && (
        <section id="schemas" className="scroll-mt-20 border-t border-gray-200 dark:border-gray-800 pt-8">
          <h2 className="!mt-0 text-2xl font-bold">Schemas</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Reusable types referenced by the methods above.
          </p>
          <div className="mt-6 space-y-8">
            {Object.entries(spec.components.schemas).map(([name, schema]) => (
              <div
                key={name}
                id={`schema-${name}`}
                className="scroll-mt-20 rounded border border-gray-200 dark:border-gray-800 p-4"
              >
                <h3 className="!mt-0 font-mono text-lg font-bold text-blue-700 dark:text-blue-400">
                  {name}
                </h3>
                {schema.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {schema.description}
                  </p>
                )}
                <div className="mt-3">
                  <SchemaView schema={schema} doc={spec} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
