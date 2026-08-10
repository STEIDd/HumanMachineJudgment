"""SQLAlchemy ORM models for the SQLite storage backend.

Each table stores denormalized columns for efficient filtering alongside
a ``data`` JSON column that holds the full Pydantic model payload.
"""

from __future__ import annotations

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class EventRow(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True)
    judgment_point_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    actor_id = Column(String, nullable=False)
    actor_type = Column(String, nullable=False)
    data = Column(JSON, nullable=False)


class JudgmentPointRow(Base):
    __tablename__ = "judgment_points"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False)
    category = Column(String, nullable=False)
    materiality_score = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    decision_key = Column(String, nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    resolution_scope = Column(JSON, nullable=True)
    data = Column(JSON, nullable=False)


class PolicyRow(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False, index=True)
    priority = Column(Integer, nullable=False)
    enabled = Column(Integer, nullable=False)  # 0 or 1
    data = Column(JSON, nullable=False)
