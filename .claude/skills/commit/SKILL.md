# Commit Skill

When I run /commit:

1. Run `git status` and `git diff --stat` to see changes
2. Stage relevant changes with `git add` (exclude sensitive files)
3. Create commit with conventional format: `type(scope): description`
4. Commit types:
   - `feat` - New feature
   - `fix` - Bug fix
   - `refactor` - Code refactoring
   - `docs` - Documentation
   - `style` - Formatting, no code change
   - `test` - Adding tests
   - `chore` - Build, config, dependencies
5. Reference related issue numbers if applicable
6. Run `git status` after commit to verify

Example commits:
- `feat(extractor): add Kimi platform message capture`
- `fix(ui): resolve assistant card disappearing on load`
- `chore: update dependencies`
