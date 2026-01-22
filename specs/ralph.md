# The Ralph Wiggum Loop (Geoffrey Huntley's Version)

Research compiled from Geoffrey Huntley's original writings and implementation guides.

---

## What Is Ralph?

Ralph Wiggum is an AI development methodology that uses iterative loops to autonomously build software. Named after the Simpsons character, it embodies "naive persistence" - the philosophy that if you press an LLM hard enough against its own failures without a safety net, it will eventually find a correct solution.

**Core principle**: "Ralph is a Bash loop."

```bash
while :; do cat PROMPT.md | claude ; done
```

---

## Two Versions of Ralph

| Version            | Author           | Philosophy                                                  | Best For                                   |
| ------------------ | ---------------- | ----------------------------------------------------------- | ------------------------------------------ |
| **Huntley Ralph**  | Geoffrey Huntley | Chaotic, creative exploration through unbridled persistence | Research, creative problem-solving         |
| **Official Ralph** | Anthropic Plugin | Bounded by token limits and safety hooks                    | Enterprise workflows, fixing broken builds |

This document focuses on **Huntley's original version**.

---

## The Three-Phase Workflow

### Phase 1: Requirements Definition

Human and LLM collaborate to:

- Discuss project ideas
- Identify Jobs to Be Done (JTBD)
- Break JTBD into topics of concern
- Generate specification files for each topic

### Phase 2: Planning Mode

- Perform gap analysis comparing specs against existing code
- Generate a prioritized implementation plan
- **No code writing** - planning only

### Phase 3: Building Mode

- Implement from the plan
- Run tests (backpressure validation)
- Commit changes
- Each iteration operates in isolation with fresh context

---

## Required File Structure

```
project-root/
├── loop.sh                    # Orchestration script
├── PROMPT_build.md            # Building mode instructions
├── PROMPT_plan.md             # Planning mode instructions
├── AGENTS.md                  # Operational guide (~60 lines)
├── IMPLEMENTATION_PLAN.md     # Task list (AI-generated)
├── specs/                     # Requirements (one per topic)
│   ├── topic-a.md
│   └── topic-b.md
├── src/                       # Application code
└── src/lib/                   # Shared utilities
```

---

## Loop Script Implementation

### Minimal Loop

```bash
while :; do cat PROMPT.md | claude ; done
```

### Enhanced Loop with Modes

```bash
#!/bin/bash
# ./loop.sh           - Build mode, unlimited iterations
# ./loop.sh 20        - Build mode, max 20 iterations
# ./loop.sh plan      - Planning mode
# ./loop.sh plan 5    - Planning mode, max 5 iterations
```

Key features:

- Mode selection determines which prompt file loads
- Iteration counting enforces limits
- Git operations push after each task completion
- Fresh context window per iteration

### CLI Flags Used

- `-p` - Headless mode (reads from stdin)
- `--dangerously-skip-permissions` - Auto-approves all tool calls
- `--output-format=stream-json` - Structured logging
- `--model opus` - Reasoning quality (or `sonnet` for speed)
- `--verbose` - Detailed execution logs

---

## Prompt Structure

Both planning and building prompts follow a **numbered phase system**:

### Phase 0: Orientation

- Study specifications with parallel subagents
- Review implementation plan if present
- Study shared utilities and components
- Reference existing source code

### Phases 1-4: Core Work

- Main instructions specific to mode (planning vs. building)
- Explicit task selection and prioritization
- Validation and testing procedures
- Commit and update operations

### 9s Sequence: Guardrails

Higher numbers indicate more critical constraints:

| Number         | Purpose               |
| -------------- | --------------------- |
| `99999`        | Important rules       |
| `999999`       | Very important rules  |
| `9999999`      | Critical constraints  |
| ...            | Increasingly critical |
| `999999999999` | Absolute constraints  |

Example rules:

- "Don't assume not implemented"
- "Capture the why"
- "Tests required before commit"

---

## AGENTS.md Structure

Keep to approximately **60 lines** covering:

```markdown
## Build & Run

[Project-specific build rules]

## Validation

- Tests: [command]
- Typecheck: [command]
- Lint: [command]

## Operational Notes

[Learnings about running the project]

### Codebase Patterns

[Key patterns Ralph should follow]
```

This file serves as the **single source of truth** for operational commands that enable immediate self-evaluation within the loop.

---

## Key Principles

### Context Efficiency

- ~176K usable tokens with 40-60% in the "smart zone"
- One task per loop achieves near-optimal context utilization
- Subagents fan out work to avoid polluting main context

### Deterministic Setup

- Every iteration loads identical base files (PROMPT.md, AGENTS.md, specs/\*)
- Consistent starting state ensures reproducibility
- Implementation plan persists on disk between iterations

### Backpressure Mechanisms

| Type             | Examples                                              |
| ---------------- | ----------------------------------------------------- |
| **Programmatic** | Build failures, test failures, type checking          |
| **Operational**  | Commands specified in AGENTS.md                       |
| **Subjective**   | LLM-as-judge testing for tone, aesthetics, UX quality |

### Plan Disposability

- Plans regenerate cheaply when wrong
- Regeneration costs one planning loop
- Better than going in circles in building mode

---

## Subagent Allocation

| Mode     | Investigation | Code Search/Read | Tests          |
| -------- | ------------- | ---------------- | -------------- |
| Planning | -             | Up to 500        | -              |
| Building | Up to 500     | -                | 1 (bottleneck) |

- Use **Opus** for complex reasoning
- Use **Sonnet** for parallel work

---

## Security Considerations

Running with `--dangerously-skip-permissions` requires sandboxing:

- Docker containers (local development)
- Fly Sprites/E2B (remote/production)
- Minimum viable access to credentials
- Network restrictions where possible

**Escape hatches:**

- `Ctrl+C` stops the loop
- `git reset --hard` reverts changes

---

## Enhancement Options

### Acceptance-Driven Backpressure

Derive test requirements from acceptance criteria during planning. Tests document what success means before implementation begins.

### Scoped Work Branches

```bash
./loop.sh plan-work "user authentication"
```

Generate branch-specific plans to avoid runtime filtering.

### Non-Deterministic Backpressure

Create `llm-review.ts` fixture for binary pass/fail judgments on subjective criteria (tone, brand consistency, visual hierarchy). Loop until acceptance.

### SLC Release Planning

Reference audience JTBD during planning to recommend Simple/Lovable/Complete releases.

---

## Comparison: Current Specs vs Ralph Requirements

### What We Have

| File                                     | Status               | Notes                                                |
| ---------------------------------------- | -------------------- | ---------------------------------------------------- |
| `specs/readme.md`                        | Well-structured spec | Comprehensive feature specifications with task lists |
| `specs/interview.md`                     | Context/research     | Founder insights for product decisions               |
| `specs/community-platforms-landscape.md` | Research             | Competitive landscape                                |

### What Ralph Needs (Not Yet Created)

| File                     | Purpose                                    | Priority                    |
| ------------------------ | ------------------------------------------ | --------------------------- |
| `AGENTS.md`              | Operational commands, validation, patterns | **High**                    |
| `PROMPT_plan.md`         | Planning mode instructions                 | **High**                    |
| `PROMPT_build.md`        | Building mode instructions                 | **High**                    |
| `loop.sh`                | Orchestration script                       | **High**                    |
| `IMPLEMENTATION_PLAN.md` | Task list (auto-generated)                 | Medium (generated by Ralph) |

### Gap Analysis

**Strengths of current specs:**

- `readme.md` already follows good spec structure with clear sections
- Task lists provide natural implementation targets
- Interview and landscape docs provide context Ralph can reference

**Gaps to fill:**

1. No operational guide (AGENTS.md) - need to define build/test/lint commands
2. No prompt files yet - need to create PROMPT_plan.md and PROMPT_build.md
3. No loop script - need to create loop.sh with mode handling
4. Specs could benefit from explicit acceptance criteria per feature

---

## Recommended Next Steps

1. **Create `AGENTS.md`** with:
   - Build commands (once tech stack is decided)
   - Test commands
   - Lint/typecheck commands
   - Key codebase patterns

2. **Create `PROMPT_plan.md`** with:
   - Phase 0: Study specs, current codebase
   - Phases 1-4: Gap analysis, prioritization, plan writing
   - 9s guardrails specific to this project

3. **Create `PROMPT_build.md`** with:
   - Phase 0: Study specs, plan, codebase
   - Phases 1-4: Implementation, testing, committing
   - 9s guardrails for code quality

4. **Create `loop.sh`** with:
   - Mode selection (plan vs build)
   - Iteration limits
   - Git integration

5. **Optionally restructure specs** to include explicit acceptance criteria that can drive test generation

---

## Sources

- [Everything is a Ralph Loop](https://ghuntley.com/loop/) - Geoffrey Huntley
- [Ralph Wiggum as a "Software Engineer"](https://ghuntley.com/ralph/) - Geoffrey Huntley
- [How to Ralph Wiggum](https://github.com/ghuntley/how-to-ralph-wiggum) - GitHub Repository
- [Inventing the Ralph Wiggum Loop](https://devinterrupted.substack.com/p/inventing-the-ralph-wiggum-loop-creator) - DevInterrupted Interview
- [VentureBeat: How Ralph Wiggum went from The Simpsons to AI](https://venturebeat.com/technology/how-ralph-wiggum-went-from-the-simpsons-to-the-biggest-name-in-ai-right-now/)
