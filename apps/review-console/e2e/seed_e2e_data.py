"""Seed the HMJ database with test data for Playwright E2E tests."""

from __future__ import annotations

import asyncio
import sqlite3

from hmj.project import load_project
from hmj.storage import get_storage
from judgment_core.types import (
    Actor,
    ActorType,
    JudgmentAlternative,
)
from judgment_sdk import JudgmentClient
from judgment_sdk.client import CreateCandidateParams


def _clear_tables(db_path: str) -> None:
    """Clear all judgment data from the database using raw SQL."""
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM judgment_points")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # Tables may not exist yet
    finally:
        conn.close()


async def seed() -> None:
    project = load_project()

    # Clear any existing data so tests always start from known state
    _clear_tables(str(project.db_path))
    print("Cleared existing E2E data")

    storage = get_storage(project)
    async with storage:
        client = JudgmentClient(storage)
        actor = Actor(id="user:e2e-test", type=ActorType.user)

        # Point 1: candidate (for promote test)
        p1 = await client.create_candidate(
            CreateCandidateParams(
                project_id=project.project_id,
                category="method",
                question="Which hashing algorithm should we use for passwords?",
                context="The authentication module needs a password hashing strategy.",
                trigger={"source": "agent", "description": "Detected password handling code"},
                materiality={
                    "score": 6,
                    "dimensions": {
                        "methodologicalDiscretion": 1,
                        "downstreamInfluence": 1,
                        "uncertainty": 1,
                        "consequence": 1,
                        "reversibility": 1,
                        "accountabilityRequirement": 1,
                    },
                    "interventionLevel": "disclose",
                },
            ),
            actor,
        )
        await client.add_alternative(
            p1.id,
            JudgmentAlternative(
                id="alt-bcrypt",
                label="bcrypt",
                description="Industry standard, slow by design",
            ),
            actor,
        )
        await client.add_alternative(
            p1.id,
            JudgmentAlternative(
                id="alt-argon2",
                label="Argon2id",
                description="Memory-hard, OWASP recommended",
            ),
            actor,
        )

        # Point 2: pending (for resolve test)
        p2 = await client.create_candidate(
            CreateCandidateParams(
                project_id=project.project_id,
                category="data",
                question="Should we normalize the input data before training?",
                context="ML pipeline preprocessing step.",
                trigger={"source": "agent", "description": "Detected data preprocessing"},
                materiality={
                    "score": 6,
                    "dimensions": {
                        "methodologicalDiscretion": 1,
                        "downstreamInfluence": 1,
                        "uncertainty": 1,
                        "consequence": 1,
                        "reversibility": 1,
                        "accountabilityRequirement": 1,
                    },
                    "interventionLevel": "disclose",
                },
            ),
            actor,
        )
        await client.add_alternative(
            p2.id,
            JudgmentAlternative(
                id="alt-normalize",
                label="Z-score normalization",
                description="Standard approach",
            ),
            actor,
        )
        await client.add_alternative(
            p2.id,
            JudgmentAlternative(
                id="alt-minmax",
                label="Min-max scaling",
                description="Preserves zero entries",
            ),
            actor,
        )
        await client.promote(p2.id, actor)
        await client.start_investigation(p2.id, actor)

        # Point 3: pending (for dismiss test)
        p3 = await client.create_candidate(
            CreateCandidateParams(
                project_id=project.project_id,
                category="assumption",
                question="Is the network latency assumption of less than 10ms valid?",
                context="Performance model assumes local network.",
                trigger={"source": "rule", "description": "Latency assumption check"},
                materiality={
                    "score": 6,
                    "dimensions": {
                        "methodologicalDiscretion": 1,
                        "downstreamInfluence": 1,
                        "uncertainty": 1,
                        "consequence": 1,
                        "reversibility": 1,
                        "accountabilityRequirement": 1,
                    },
                    "interventionLevel": "disclose",
                },
            ),
            actor,
        )
        await client.promote(p3.id, actor)

        print(f"Seeded 3 judgment points for project {project.project_id}")


if __name__ == "__main__":
    asyncio.run(seed())
