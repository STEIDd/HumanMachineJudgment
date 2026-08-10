"""hmj hook command — processes Claude Code hook events."""

from __future__ import annotations

import json
import sys


async def run_hook(event_type: str) -> None:
    """Process a Claude Code hook event.

    Reads JSON from stdin, dispatches to the appropriate handler,
    and writes JSON to stdout.
    """
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        hook_input = {}

    from hmj.hooks import process_hook_event

    result = await process_hook_event(event_type, hook_input)

    json.dump(result, sys.stdout)
    sys.stdout.flush()
