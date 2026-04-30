from abc import ABC, abstractmethod
from app.models.signal import ComponentType, Severity

class AlertStrategy(ABC):
    @abstractmethod
    def get_severity(self, signal: dict) -> Severity:
        pass

    @abstractmethod
    def get_message(self, signal: dict) -> str:
        pass

class RDBMSAlertStrategy(AlertStrategy):
    def get_severity(self, signal: dict) -> Severity:
        return Severity.P0  # DB failure is always P0

    def get_message(self, signal: dict) -> str:
        return f"[P0 CRITICAL] RDBMS failure on {signal['component_id']}: {signal['error_message']}"

class CacheAlertStrategy(AlertStrategy):
    def get_severity(self, signal: dict) -> Severity:
        return Severity.P2

    def get_message(self, signal: dict) -> str:
        return f"[P2] Cache degraded on {signal['component_id']}: {signal['error_message']}"

class APIAlertStrategy(AlertStrategy):
    def get_severity(self, signal: dict) -> Severity:
        return Severity.P1

    def get_message(self, signal: dict) -> str:
        return f"[P1] API failure on {signal['component_id']}: {signal['error_message']}"

class QueueAlertStrategy(AlertStrategy):
    def get_severity(self, signal: dict) -> Severity:
        return Severity.P1

    def get_message(self, signal: dict) -> str:
        return f"[P1] Queue blocked on {signal['component_id']}: {signal['error_message']}"

class DefaultAlertStrategy(AlertStrategy):
    def get_severity(self, signal: dict) -> Severity:
        return Severity.P3

    def get_message(self, signal: dict) -> str:
        return f"[P3] Issue on {signal['component_id']}: {signal['error_message']}"

STRATEGY_MAP = {
    ComponentType.RDBMS: RDBMSAlertStrategy(),
    ComponentType.CACHE: CacheAlertStrategy(),
    ComponentType.API: APIAlertStrategy(),
    ComponentType.QUEUE: QueueAlertStrategy(),
}

def get_alert_strategy(component_type: str) -> AlertStrategy:
    return STRATEGY_MAP.get(component_type, DefaultAlertStrategy())