# qwintly-core

A shared package consisting of:
1. **Shared AI Tools**: Modular schemas and implementations optimized for planning and layout manipulation.
2. **Project Indexer**: Codebase analytics, configuration extraction, and metadata indexing for routes.
3. **Status Logging**: Real-time progress streaming via database and Redis Pub/Sub channels.

These components power the qwintly website generator project.

## 📖 Documentation

For a detailed walkthrough of the internal design, system schemas, and flow mechanics, see the [Architecture & Tool Loop Reference Guide](ARCHITECTURE.md). It covers:
* **The Tool Ecosystem**: Schemas, implementations, and safety guardrails.
* **The `toolLoop` Execution Flow**: Multi-turn iteration timelines and retries.
* **Smart Context Management**: Argument redaction, compaction, and file read capping.
* **Model Output & State Persistence**: Supabase logging, token auditing, and Redis streaming.