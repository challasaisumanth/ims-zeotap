from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class WorkItemState(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class RootCauseCategory(str, Enum):
    HARDWARE = "Hardware Failure"
    SOFTWARE_BUG = "Software Bug"
    CONFIG_ERROR = "Configuration Error"
    CAPACITY = "Capacity/Scaling Issue"
    NETWORK = "Network Issue"
    DEPENDENCY = "External Dependency"
    HUMAN_ERROR = "Human Error"
    UNKNOWN = "Unknown"

class RCA(BaseModel):
    incident_start: datetime
    incident_end: datetime
    root_cause_category: RootCauseCategory
    fix_applied: str = Field(min_length=10)
    prevention_steps: str = Field(min_length=10)

class WorkItem(BaseModel):
    id: Optional[str] = None
    component_id: str
    component_type: str
    severity: str
    state: WorkItemState = WorkItemState.OPEN
    signal_ids: List[str] = []
    signal_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    rca: Optional[RCA] = None
    mttr_minutes: Optional[float] = None