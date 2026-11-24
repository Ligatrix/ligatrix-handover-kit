export interface RequiredFile {
  readonly path: string;
  readonly label: string;
}

export declare const REQUIRED_FILES: readonly RequiredFile[];
export declare const DECISION_SECTIONS: readonly string[];

export type ProblemCode =
  | "not-a-directory"
  | "missing-file"
  | "empty-file"
  | "missing-title"
  | "empty-section"
  | "placeholder"
  | "unticked"
  | "no-dependency-table"
  | "empty-table"
  | "missing-licence"
  | "decision-name"
  | "decision-section";

export interface Problem {
  /** Path relative to the bundle, with `/` separators. */
  file: string;
  /** 1-based line, or 0 when the problem concerns the whole file. */
  line: number;
  code: ProblemCode;
  message: string;
}

export interface Section {
  level: number;
  title: string;
  line: number;
  endLine: number;
  empty: boolean;
}

export interface Analysis {
  sections: Section[];
  tasks: { done: boolean; text: string; line: number }[];
  tables: { line: number; headers: string[]; rows: { line: number; cells: string[] }[] }[];
  placeholders: { line: number; name: string; text: string }[];
}

export interface CheckResult {
  dir: string;
  ok: boolean;
  problems: Problem[];
  documents: Map<string, Analysis>;
}

export declare function checkBundle(dir: string): Promise<CheckResult>;
export declare function analyse(text: string): Analysis;

export interface ReadinessPart {
  label: string;
  files: string[];
  done: number;
  total: number;
  percent: number;
  missing: boolean;
}

export interface Readiness {
  dir: string;
  ready: boolean;
  problems: number;
  parts: ReadinessPart[];
  overall: number;
}

export declare function readiness(dir: string): Promise<Readiness>;

export interface DependencyRow {
  name: string;
  kind: "runtime" | "optional" | "peer" | "development";
  version: string;
  source: "lockfile" | "installed" | "package.json";
  /** The declared licence, or "check" when it could not be read. */
  licence: string;
}

export declare function listDependencies(
  path: string,
  options?: { production?: boolean },
): Promise<{ manifest: string; name: string | undefined; rows: DependencyRow[] }>;
export declare function toMarkdown(rows: DependencyRow[]): string;
export declare function normaliseLicence(pkg: unknown): string | undefined;

export declare function skeleton(options: { name: string; date: string }): Record<string, string>;

export declare const EXIT: Readonly<{ OK: 0; FAILED: 1; USAGE: 2 }>;

export interface RunIO {
  stdout?: { write(text: string): unknown; isTTY?: boolean };
  stderr?: { write(text: string): unknown };
  cwd?: string;
  env?: Record<string, string | undefined>;
  now?: () => Date;
}

export declare function run(argv: string[], io?: RunIO): Promise<number>;
