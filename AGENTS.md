# Agent Instructions

## Version and commit policy

- Every code, configuration, or documentation change must include a version bump that matches the change scope.
- Use semantic versioning:
  - Patch: bug fixes, documentation-only fixes, and small internal corrections.
  - Minor: user-visible features, project rename, config file format/name changes, or backward-compatible behavior changes.
  - Major: breaking user workflows or incompatible config/data changes without automatic migration.
- Keep all project version declarations in sync: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, README current-version text, and the UI version constant in `src/App.tsx`.
- After every completed change, run the relevant verification commands, create an atomic git commit, and push it to the configured upstream unless the user explicitly asks not to.
- Do not leave completed work as uncommitted local changes.
