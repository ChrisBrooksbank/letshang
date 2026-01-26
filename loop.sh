#!/bin/bash
#
# Ralph Wiggum Loop - Orchestration Script
#
# Usage:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 10           # Build mode, max 10 iterations
#   ./loop.sh plan         # Planning mode, single iteration
#   ./loop.sh plan 5       # Planning mode, max 5 iterations
#
# Requirements:
#   - claude CLI installed and authenticated
#   - Git Bash (Windows) or bash (Unix)
#
# Emergency stop: Ctrl+C
# Recovery: git reset --hard HEAD~1

set -e

# Parse arguments
MODE="build"
MAX_ITERATIONS=0

if [[ "$1" == "plan" ]]; then
    MODE="plan"
    MAX_ITERATIONS="${2:-1}"
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MAX_ITERATIONS="$1"
fi

# Select prompt file
if [[ "$MODE" == "plan" ]]; then
    PROMPT_FILE="PROMPT_plan.md"
else
    PROMPT_FILE="PROMPT_build.md"
fi

# Verify prompt file exists
if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# Verify AGENTS.md exists
if [[ ! -f "AGENTS.md" ]]; then
    echo "Error: AGENTS.md not found"
    exit 1
fi

echo "============================================"
echo "Ralph Wiggum Loop"
echo "============================================"
echo "Mode: $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Max iterations: ${MAX_ITERATIONS:-unlimited}"
echo "============================================"
echo ""
echo "Starting in 3 seconds... (Ctrl+C to abort)"
sleep 3

# Counters
ITERATION=0
CONSECUTIVE_FAILURES=0
MAX_CONSECUTIVE_FAILURES=5

# Timeout in seconds (30 minutes)
CLAUDE_TIMEOUT=1800

# Function to run claude with timeout (cross-platform)
run_claude_with_timeout() {
    local timeout_seconds="$1"
    local prompt_file="$2"
    
    # Start claude in background
    claude -p \
        --dangerously-skip-permissions \
        --model sonnet \
        --verbose \
        < "$prompt_file" &
    
    local claude_pid=$!
    local elapsed=0
    
    # Poll for completion or timeout
    while kill -0 "$claude_pid" 2>/dev/null; do
        if [[ $elapsed -ge $timeout_seconds ]]; then
            echo ""
            echo "Timeout reached (${timeout_seconds}s). Stopping Claude..."
            kill -TERM "$claude_pid" 2>/dev/null || true
            sleep 5
            kill -KILL "$claude_pid" 2>/dev/null || true
            wait "$claude_pid" 2>/dev/null || true
            return 124  # Standard timeout exit code
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    # Get actual exit code
    wait "$claude_pid"
    return $?
}

# Main loop
while true; do
    ITERATION=$((ITERATION + 1))
    
    echo ""
    echo "============================================"
    echo "Iteration $ITERATION - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================"
    
    # Run Claude with timeout
    EXIT_CODE=0
    run_claude_with_timeout "$CLAUDE_TIMEOUT" "$PROMPT_FILE" || EXIT_CODE=$?
    
    if [[ $EXIT_CODE -eq 124 ]]; then
        echo "Claude timed out after ${CLAUDE_TIMEOUT}s"
    fi
    
    if [[ $EXIT_CODE -ne 0 ]]; then
        CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
        echo ""
        echo "Claude exited with code $EXIT_CODE (failure $CONSECUTIVE_FAILURES of $MAX_CONSECUTIVE_FAILURES)"
        
        if [[ $CONSECUTIVE_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]]; then
            echo "Too many consecutive failures. Exiting."
            exit 1
        fi
        
        echo "Pausing for 30 seconds before retry..."
        sleep 30
        continue
    fi
    
    # Success - reset failure counter
    CONSECUTIVE_FAILURES=0
    
    # Push changes after successful iteration (build mode only)
    if [[ "$MODE" == "build" ]]; then
        echo "Pushing changes..."
        git push 2>&1 || echo "Push failed or nothing to push"
    fi
    
    # Check iteration limit
    if [[ $MAX_ITERATIONS -gt 0 && $ITERATION -ge $MAX_ITERATIONS ]]; then
        echo ""
        echo "============================================"
        echo "Reached max iterations ($MAX_ITERATIONS)"
        echo "============================================"
        break
    fi
    
    # Brief pause between iterations
    echo "Sleeping 5 seconds before next iteration..."
    sleep 5
done

echo ""
echo "Loop complete. Total iterations: $ITERATION"