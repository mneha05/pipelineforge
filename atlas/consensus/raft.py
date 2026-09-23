"""Small, deterministic Raft core used by PipelineForge Atlas.

This is not a production consensus library. It models the pieces recruiters/interviewers
usually want to discuss: randomized election timeouts, RequestVote, AppendEntries,
term changes, majority voting, log replication and commit-index advancement.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterable


class Role(str, Enum):
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"


@dataclass(frozen=True)
class LogEntry:
    term: int
    command: Any


@dataclass
class Node:
    node_id: str
    peers: tuple[str, ...]
    role: Role = Role.FOLLOWER
    current_term: int = 0
    voted_for: str | None = None
    log: list[LogEntry] = field(default_factory=list)
    commit_index: int = -1

    def last_log_index(self) -> int:
        return len(self.log) - 1

    def last_log_term(self) -> int:
        return self.log[-1].term if self.log else 0

    def majority(self) -> int:
        return (len(self.peers) + 1) // 2 + 1

    def start_election(self) -> dict[str, Any]:
        self.role = Role.CANDIDATE
        self.current_term += 1
        self.voted_for = self.node_id
        return {
            "term": self.current_term,
            "candidate_id": self.node_id,
            "last_log_index": self.last_log_index(),
            "last_log_term": self.last_log_term(),
        }

    def request_vote(
        self,
        *,
        term: int,
        candidate_id: str,
        last_log_index: int,
        last_log_term: int,
    ) -> bool:
        if term < self.current_term:
            return False

        if term > self.current_term:
            self.current_term = term
            self.role = Role.FOLLOWER
            self.voted_for = None

        candidate_is_current = (
            last_log_term > self.last_log_term()
            or (
                last_log_term == self.last_log_term()
                and last_log_index >= self.last_log_index()
            )
        )
        can_vote = self.voted_for in (None, candidate_id)

        if can_vote and candidate_is_current:
            self.voted_for = candidate_id
            return True
        return False

    def become_leader(self) -> None:
        self.role = Role.LEADER

    def append_as_leader(self, command: Any) -> LogEntry:
        if self.role is not Role.LEADER:
            raise RuntimeError("only a leader can append client commands")
        entry = LogEntry(term=self.current_term, command=command)
        self.log.append(entry)
        return entry

    def append_entries(
        self,
        *,
        term: int,
        leader_id: str,
        prev_log_index: int,
        prev_log_term: int,
        entries: Iterable[LogEntry],
        leader_commit: int,
    ) -> bool:
        del leader_id
        if term < self.current_term:
            return False

        if term > self.current_term:
            self.current_term = term
            self.voted_for = None

        self.role = Role.FOLLOWER

        if prev_log_index >= 0:
            if prev_log_index >= len(self.log):
                return False
            if self.log[prev_log_index].term != prev_log_term:
                self.log = self.log[:prev_log_index]
                return False

        insertion = prev_log_index + 1
        incoming = list(entries)

        for offset, entry in enumerate(incoming):
            idx = insertion + offset
            if idx < len(self.log) and self.log[idx].term != entry.term:
                self.log = self.log[:idx]
            if idx >= len(self.log):
                self.log.append(entry)

        if leader_commit > self.commit_index:
            self.commit_index = min(leader_commit, self.last_log_index())
        return True


def elect(candidate: Node, voters: Iterable[Node]) -> bool:
    request = candidate.start_election()
    votes = 1
    for voter in voters:
        if voter.request_vote(**request):
            votes += 1
    if votes >= candidate.majority():
        candidate.become_leader()
        return True
    candidate.role = Role.FOLLOWER
    return False


def replicate(leader: Node, followers: Iterable[Node], command: Any) -> int:
    """Replicate one command and commit it only after a majority acknowledges it."""
    entry = leader.append_as_leader(command)
    index = leader.last_log_index()
    previous_index = index - 1
    previous_term = leader.log[previous_index].term if previous_index >= 0 else 0

    acknowledgements = 1
    follower_list = list(followers)
    for follower in follower_list:
        ok = follower.append_entries(
            term=leader.current_term,
            leader_id=leader.node_id,
            prev_log_index=previous_index,
            prev_log_term=previous_term,
            entries=[entry],
            leader_commit=leader.commit_index,
        )
        acknowledgements += int(ok)

    if acknowledgements >= leader.majority():
        leader.commit_index = index
        for follower in follower_list:
            follower.append_entries(
                term=leader.current_term,
                leader_id=leader.node_id,
                prev_log_index=index,
                prev_log_term=entry.term,
                entries=[],
                leader_commit=index,
            )
    return acknowledgements
