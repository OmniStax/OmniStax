# Claude Translation Skill — Multi-Agent Professional Translation

A [Claude Code](https://claude.com/claude-code) skill that orchestrates a complete professional translation pipeline using Agent Teams.

## What It Does

This skill coordinates multiple specialized AI agents working in parallel:

- **Translator** (Sonnet) — First-pass translation with strict structure preservation
- **Term Researcher** (Sonnet) — Web-verified terminology glossary with confidence scoring
- **Reviewer** (Opus) — Independent quality review catching fabrication, omission, and errors
- **Revision** — Applies all fixes and glossary corrections for the final output

```
User: "翻译这个文档"
         │
   Team Lead orchestrates:
   translator + term-researcher(s) [parallel]
         → reviewer [waits for both]
         → revision → typesetting → .docx + .pdf
```

## Key Features

- **Anti-fabrication pipeline**: Paragraph-by-paragraph verification, no invented content
- **Structure preservation**: Tables stay tables, lists stay lists, cell content stays in cells
- **Smart scaling**: >50 terms → auto-splits into 2 parallel researchers (fast + deep)
- **Web search fallback**: Graceful degradation when search is unavailable
- **Professional typesetting**: Outputs both .docx and .pdf with formal formatting

## Installation

Copy the skill to your Claude Code skills directory:

```bash
# Clone
git clone https://github.com/senshinji/claude-translation-skill.git

# Symlink into Claude Code skills
ln -s "$(pwd)/claude-translation-skill" ~/.claude/skills/translation-quality
```

**Prerequisite**: Enable Agent Teams in Claude Code:
```bash
# Add to ~/.claude/settings.json under "env":
"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
```

## Usage

Just ask Claude Code to translate a document:

```
翻译这个文档
专业翻译 meeting-guide.doc
translate with quality check
```

The skill auto-triggers on translation tasks involving professional documents.

## Project Structure

```
SKILL.md                              # Main skill definition (≤500 lines)
references/
├── glossary-schema.md                # Terminology glossary JSON schema
├── review-feedback-schema.md         # Review feedback format
├── scaling-guidelines.md             # Chunking + parallel scaling rules
├── typesetting-rules.md              # Professional document formatting
├── anti-fabrication-checklist.md      # Fabrication prevention methodology
├── test-translation-structure.sh     # Structure verification test
└── test-skill-integrity.sh           # Skill integrity test (32 checks)
```

## Testing

```bash
# Run skill integrity tests (no external dependencies)
bash references/test-skill-integrity.sh

# Run structure tests (requires source + translation files)
bash references/test-translation-structure.sh source.html translation.md
```

## Scaling

| Document Size | Translators | Term Researchers | Reviewers |
|--------------|-------------|-----------------|-----------|
| ≤5 pages     | 1           | 1               | 1         |
| 6-10 pages   | 1           | 1-2 (if >50 terms) | 1      |
| 11-20 pages  | 2 (parallel)| 2 (fast+deep)   | 1         |
| 21-50 pages  | 3-5         | 2 (fast+deep)   | 1         |

## License

MIT
