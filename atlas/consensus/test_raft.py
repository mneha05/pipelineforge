from raft import Node, Role, elect, replicate


def cluster():
    return [
        Node("node-a", ("node-b", "node-c")),
        Node("node-b", ("node-a", "node-c")),
        Node("node-c", ("node-a", "node-b")),
    ]


def test_three_node_election():
    a, b, c = cluster()
    assert elect(a, [b, c])
    assert a.role is Role.LEADER
    assert a.current_term == 1
    assert b.voted_for == "node-a"
    assert c.voted_for == "node-a"


def test_majority_commit():
    a, b, c = cluster()
    assert elect(a, [b, c])
    acks = replicate(a, [b, c], {"op": "SET", "key": "pipeline:17", "value": "RUNNING"})
    assert acks == 3
    assert a.commit_index == 0
    assert b.commit_index == 0
    assert c.commit_index == 0
    assert a.log == b.log == c.log
