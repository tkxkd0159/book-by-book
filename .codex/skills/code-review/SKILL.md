---
name: code-review
description: Review the current PR (this branch vs base) on various points such as security issues, code quality, bugs
argument-hint: "[BASE=<base>]"
user-invocable: true
---

I would like to review the following points on the current branch in comparison to $BASE. Spawn one agent per point, wait for all of them, and summarize the result for each point.

1. Security issue
2. Code quality
3. Bugs
4. Race
5. Test flakiness
6. Maintainability of the code
