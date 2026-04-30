from app.models.workitem import WorkItemState, RCA
from typing import Optional

# Valid transitions
TRANSITIONS = {
    WorkItemState.OPEN: [WorkItemState.INVESTIGATING],
    WorkItemState.INVESTIGATING: [WorkItemState.RESOLVED],
    WorkItemState.RESOLVED: [WorkItemState.CLOSED],
    WorkItemState.CLOSED: [],
}

class WorkItemStateMachine:
    """
    State Pattern: enforces valid transitions.
    CLOSED requires a complete RCA — rejects otherwise.
    """
    def __init__(self, current_state: WorkItemState):
        self.current_state = current_state

    def can_transition(self, new_state: WorkItemState, rca: Optional[RCA] = None) -> tuple[bool, str]:
        if new_state not in TRANSITIONS.get(self.current_state, []):
            return False, f"Cannot go from {self.current_state} to {new_state}"

        if new_state == WorkItemState.CLOSED:
            if not rca:
                return False, "RCA is mandatory before closing an incident"
            if not rca.fix_applied or not rca.prevention_steps:
                return False, "RCA must have fix_applied and prevention_steps filled out"

        return True, "ok"

    def transition(self, new_state: WorkItemState, rca: Optional[RCA] = None) -> WorkItemState:
        ok, reason = self.can_transition(new_state, rca)
        if not ok:
            raise ValueError(reason)
        self.current_state = new_state
        return self.current_state