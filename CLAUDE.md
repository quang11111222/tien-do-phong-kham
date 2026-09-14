# Ngữ cảnh chung giữa Claude và Codex

- Bắt đầu mỗi nhiệm vụ bằng việc đọc `docs/AI-CONTEXT.md` và `docs/HANDOFF.md`, rồi làm theo quy trình trong đó.
- `docs/AI-CONTEXT.md` là quy tắc phối hợp chung; `docs/PROJECT-BRIEF.md` là nghiệp vụ; `docs/DECISIONS.md` là quyết định; `docs/HANDOFF.md` là trạng thái bàn giao, không phải bằng chứng kiểm thử.
- Trước khi kết thúc hoặc chuyển công cụ, cập nhật `docs/HANDOFF.md` với việc đã làm, file thay đổi, kiểm tra thực tế, phần chưa kiểm tra, trạng thái deploy và bước tiếp theo. Không ghi mật khẩu/token/dữ liệu cá nhân vào các file này.
- Giữ nội dung chung ở `docs`, không sao chép thành hai phiên bản riêng trong `AGENTS.md` và `CLAUDE.md`. Giữ nguyên hướng dẫn GitNexus và các hướng dẫn riêng của từng công cụ.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tien-do-phong-kham** (1158 symbols, 2537 relationships, 69 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/tien-do-phong-kham/context` | Codebase overview, check index freshness |
| `gitnexus://repo/tien-do-phong-kham/clusters` | All functional areas |
| `gitnexus://repo/tien-do-phong-kham/processes` | All execution flows |
| `gitnexus://repo/tien-do-phong-kham/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

# Project-Specific Skills

| Task | Read this skill file |
| --- | --- |
| Add new features / follow domain patterns | `.claude/skills/project-patterns/SKILL.md` |
| Work with tracker service APIs | `.claude/skills/tracker-service/SKILL.md` |
| Implement access control / permissions | `.claude/skills/permissions/SKILL.md` |
| Database queries / schema / migrations | `.claude/skills/database-schema/SKILL.md` |
| Build UI components / forms / views | `.claude/skills/ui-components/SKILL.md` |
| Write tests / debug test failures | `.claude/skills/testing/SKILL.md` |
| Work with AI assistant effectively | `.claude/skills/vibe-coding/SKILL.md` |
