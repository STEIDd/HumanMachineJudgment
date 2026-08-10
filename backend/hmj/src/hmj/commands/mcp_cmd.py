"""hmj mcp command — runs the MCP server."""

from __future__ import annotations

from hmj.project import load_project
from hmj.storage import get_storage


def run_mcp() -> None:
    """Run the MCP server with stdio transport."""
    project = load_project()
    storage = get_storage(project)

    from judgment_mcp.server import create_judgment_mcp_server

    server = create_judgment_mcp_server(
        storage=storage,
        project_id=project.project_id,
    )
    server.run(transport="stdio")
