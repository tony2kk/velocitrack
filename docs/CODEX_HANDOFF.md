# Continue in Codex

Open `C:\dev\VelociTrack` as the local project. The repository remote is intended to be `https://github.com/tony2kk/velocitrack`. Git metadata is the source of truth for whether it is configured and pushed.

Read `AGENTS.md`, `PLAN.md`, `ARCHITECTURE.md` and `README.md`. These documents carry the relevant context without importing the original ChatGPT transcript or private attachments. Codex reads project guidance through [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Suggested first prompt:

> Read the project guidance and discuss VelociTrack's architecture with me. For now, do not implement features or add libraries. Help us agree on the first user workflow, data contracts, storage/offline needs and whether cloud connectivity is a prerequisite. Treat React/TypeScript/Vite as the provisional scaffold, not a final architecture. Record decisions only after we agree.

## Preserved context

- The project is called **VelociTrack**; repository slug **velocitrack**.
- The earlier work was an introductory study, not source to migrate.
- Its read-only Python exporter reportedly worked against the user's own account. It is not included or required by this project.
- A browser-only Firebase PoC has **not** been performed. The owner has not prepared permitted web configuration or credentials for it.
- CSV/JSON, PWA, ECharts, Dexie and Firebase were previously considered, but the owner explicitly wants the architecture discussion first.
- Provider data units and atmosphere have not been validated.
- The repository contains infrastructure only. The placeholder does not imply application functionality.

## Local commands

```powershell
Set-Location C:\dev\VelociTrack
git status
npm.cmd ci
npm.cmd run verify
npm.cmd run dev
```

This chat does not need to be copied into the repository. Do not create an extra Codex chat automatically; the owner can open the folder in the project they choose.
