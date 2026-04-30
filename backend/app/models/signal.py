from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class Severity(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"

class ComponentType(str, Enum):
    RDBMS = "RDBMS"
    CACHE = "CACHE"
    API = "API"
    QUEUE = "QUEUE"
    NOSQL = "NOSQL"
    MCP = "MCP"

class Signal(BaseModel):
    component_id: str
    component_type: ComponentType
    error_message: str
    severity: Severity
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = {}