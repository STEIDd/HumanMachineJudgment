"""Entry point for running the Judgment MCP server via ``python -m judgment_mcp``."""

from judgment_mcp.server import create_judgment_mcp_server
from judgment_storage_memory import MemoryStorage


def main() -> None:
    storage = MemoryStorage()
    mcp = create_judgment_mcp_server(storage)
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
