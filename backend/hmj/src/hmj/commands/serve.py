"""hmj serve / open commands."""

from __future__ import annotations

import click

from hmj.project import load_project
from hmj.storage import get_storage


def run_serve(port: int = 8457) -> None:
    """Launch the judgment review console."""
    project = load_project()
    storage = get_storage(project)

    from hmj.console_app import create_console_app

    app = create_console_app(storage=storage, project_id=project.project_id)

    import uvicorn

    click.echo(f"Starting review console at http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


def run_open(port: int = 8457) -> None:
    """Open the review console in a browser and start serving."""
    import threading
    import time
    import webbrowser

    url = f"http://127.0.0.1:{port}"

    def open_browser() -> None:
        time.sleep(1.0)
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()
    run_serve(port=port)
