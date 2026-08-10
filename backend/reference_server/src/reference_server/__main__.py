"""Entry point for running the reference server via ``python -m reference_server``.

NOTE: This is a **reference/testing** server using in-memory storage.
For production use, install the ``hmj`` package and use ``hmj serve``.
"""

import uvicorn

from reference_server.app import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
