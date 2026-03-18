## Description
Briefly explain the "why" and "what" of this PR.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] ♻️ Refactoring (no functional changes, no API changes)
- [ ] ⚙️ Infrastructure / Configuration / CI/CD update
- [ ] 📚 Documentation update

## Code Quality & Style
- [ ] My code follows the project's established style guidelines and linters pass.
- [ ] I have performed a self-review of my own code before requesting a review.
- [ ] Code is clear, readable, and properly commented (especially in complex logic or edge cases).
- [ ] Variable/function/class names are descriptive and follow naming conventions.
- [ ] No sensitive data (secrets, API keys, passwords) are hardcoded or accidentally committed.

## Testing
- [ ] I have added new unit tests that prove my fix is effective or my feature works.
- [ ] Existing unit and integration tests pass locally with my changes.
- [ ] I have tested edge cases and failure modes (e.g., nil pointers, network timeouts).

## Architecture, Performance & Safety
- [ ] Changes handle concurrency safely (e.g., no race conditions, safe channel/thread usage).
- [ ] Resource management is handled properly (e.g., closing connections, no goroutine/memory leaks).
- [ ] Database queries are optimized (e.g., proper indexing, avoiding N+1 query problems).
- [ ] Any necessary database schema migrations are included and tested.

## Deployment & Infrastructure
- [ ] Necessary updates to infrastructure manifests (e.g., Kubernetes YAMLs, Helm charts) are included.
- [ ] Environment variables or configuration changes required for deployment have been documented.
- [ ] I have verified that monitoring, logging, or alerting is in place for new critical pathways.
