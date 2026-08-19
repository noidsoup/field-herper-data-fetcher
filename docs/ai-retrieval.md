# AI retrieval for this repo

This project is **not Python-capable** at the top level, so the standard
`scripts/*_project_knowledge_lancedb.py` scaffold (LanceDB + sentence-transformers,
Python-native) is not installed directly. Three options for semantic doc search:

## Option A — Python sidecar (recommended, matches other repos)

Add a tiny `scripts/` with a venv that hosts the same three scaffold scripts.
The scripts only read markdown from this repo; they don't need to run in the app's
runtime. Copy them from a Python repo that already has them
(`apfs-database`, `marketing`, `field-herper`) and:

```bash
python3 -m venv .venv-lancedb
.venv-lancedb/bin/pip install -r requirements-lancedb.txt
.venv-lancedb/bin/python -u scripts/index_project_knowledge_lancedb.py --apply
.venv-lancedb/bin/python -u scripts/search_project_knowledge_lancedb.py "<question>"
```

Add `.venv-lancedb/` and `uncommitted/` to `.gitignore`.

## Option B — rely on cross-repo vault recall

If this machine has ghembed / vault recall, this repo's committed markdown is
already indexed centrally. Query the vault instead of a per-repo index.

## Option C — platform-native retrieval

If the agent platform already provides retrieval (e.g. Hermes has Honcho +
session-search + memory), a per-repo vector index may be redundant. Prefer the
platform layer over adding a third retrieval system.

Pick one and document the choice in `AGENTS.md`.
