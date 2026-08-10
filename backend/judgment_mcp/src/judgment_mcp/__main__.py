"""Entry point for running the Judgment MCP server via ``python -m judgment_mcp``.

When launched by Claude Code (via ``hmj mcp``), the server discovers the
project from the current working directory and uses SqliteStorage.

When run directly, it falls back to MemoryStorage for development.
"""

from judgment_mcp.server import create_judgment_mcp_server


def main() -> None:
    try:
        from hmj.project import load_project
        from hmj.storage import get_storage

        project = load_project()
        storage = get_storage(project)
        mcp = create_judgment_mcp_server(storage, project_id=project.project_id)
    except Exception:
        # Fallback to memory storage when no project is found.
        from judgment_storage_memory import MemoryStorage

        storage = MemoryStorage()
        mcp = create_judgment_mcp_server(storage)

    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
