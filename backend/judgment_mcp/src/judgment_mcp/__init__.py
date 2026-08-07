"""MCP server exposing Judgment Points as resources and tools."""

__version__ = "0.1.0"

from judgment_mcp.server import create_judgment_mcp_server

__all__ = ["create_judgment_mcp_server"]
