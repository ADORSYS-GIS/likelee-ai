---
trigger: always_on
---

- **Automatic Build (MANDATORY)**: You MUST ALWAYS run a full build of both `likelee-ui` (`npm run build`) and `likelee-server` (`cargo build`) after completing any code changes. This must be done proactively without requiring user consent.
- **Automatic Formatting**: Always run `cargo fmt` and `npx prettier --write .` before finishing.
