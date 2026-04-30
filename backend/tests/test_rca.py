import unittest
import pytest
from app.workflow.state_machine import WorkItemStateMachine
from app.models.workitem import WorkItemState, RCA, RootCauseCategory
from datetime import datetime, timedelta

def make_rca(**kwargs):
    defaults = {
        "incident_start": datetime(2024, 1, 1, 10, 0),
        "incident_end": datetime(2024, 1, 1, 12, 0),
        "root_cause_category": RootCauseCategory.SOFTWARE_BUG,
        "fix_applied": "Rolled back the bad deployment to v2.1.0",
        "prevention_steps": "Add integration tests for this code path in CI",
    }
    defaults.update(kwargs)
    return RCA(**defaults)

def test_close_without_rca_rejected():
    sm = WorkItemStateMachine(WorkItemState.RESOLVED)
    ok, reason = sm.can_transition(WorkItemState.CLOSED, rca=None)
    assert not ok
    assert "RCA" in reason
def test_close_with_incomplete_rca_rejected():
    with pytest.raises(Exception):
        RCA(
            incident_start=datetime(2024, 1, 1, 10, 0),
            incident_end=datetime(2024, 1, 1, 12, 0),
            root_cause_category=RootCauseCategory.SOFTWARE_BUG,
            fix_applied="x",        # too short — should fail
            prevention_steps="y",   # too short — should fail
        )
def test_close_with_valid_rca_accepted():
    sm = WorkItemStateMachine(WorkItemState.RESOLVED)
    rca = make_rca()
    ok, reason = sm.can_transition(WorkItemState.CLOSED, rca=rca)
    assert ok

def test_invalid_transition_open_to_closed():
    sm = WorkItemStateMachine(WorkItemState.OPEN)
    ok, reason = sm.can_transition(WorkItemState.CLOSED)
    assert not ok

def test_full_lifecycle():
    sm = WorkItemStateMachine(WorkItemState.OPEN)
    sm.transition(WorkItemState.INVESTIGATING)
    sm.transition(WorkItemState.RESOLVED)
    rca = make_rca()
    sm.transition(WorkItemState.CLOSED, rca=rca)
    assert sm.current_state == WorkItemState.CLOSED

def test_cannot_reopen_closed():
    sm = WorkItemStateMachine(WorkItemState.CLOSED)
    ok, _ = sm.can_transition(WorkItemState.OPEN)
    assert not ok