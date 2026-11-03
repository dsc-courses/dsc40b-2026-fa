// The graphs students can choose from in the BFS demo. Coordinates are in the
// same units as the TikZ figures in the slides (y points up). See
// ../common/graph.js for the format.

const BFS_GRAPHS = [
    {
        id: "lecture",
        name: "Undirected graph",
        description: "The undirected graph from the “Example” slide in Lecture 11.",
        directed: false,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 0, y: 2},
            {id: "3", x: 0, y: 4},
            {id: "4", x: 2, y: 0},
            {id: "5", x: 2, y: 2},
            {id: "6", x: 2, y: 4},
            {id: "7", x: 4, y: 0},
            {id: "8", x: 4, y: 2},
            {id: "9", x: 4, y: 4},
        ],
        edges: [
            ["1", "2"], ["2", "3"], ["2", "5"], ["3", "6"], ["1", "4"],
            ["4", "5"], ["3", "5"], ["5", "9"], ["7", "8"], ["4", "7"],
            ["2", "6"], ["8", "9"],
        ],
    },
    {
        id: "directed",
        name: "Directed graph",
        description: "The same nodes as the undirected graph, with directed edges "
            + "(the graph from the “explored” exercise on directed graphs).",
        directed: true,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 0, y: 2},
            {id: "3", x: 0, y: 4},
            {id: "4", x: 2, y: 0},
            {id: "5", x: 2, y: 2},
            {id: "6", x: 2, y: 4},
            {id: "7", x: 4, y: 0},
            {id: "8", x: 4, y: 2},
            {id: "9", x: 4, y: 4},
        ],
        edges: [
            ["1", "2"], ["1", "4"], ["2", "3"], ["2", "5"], ["2", "6"],
            ["6", "3"], ["5", "3"], ["4", "5"], ["4", "7"], ["5", "9"],
            ["7", "8"], ["9", "8"],
        ],
    },
    {
        id: "tree",
        name: "Directed tree",
        description: "A directed tree, with edges pointing away from its root, 1. "
            + "From the root, BFS visits the tree level by level.",
        directed: true,
        source: "1",
        nodes: [
            {id: "1", x: 3, y: 4.5},
            {id: "2", x: 1.25, y: 3},
            {id: "3", x: 4.75, y: 3},
            {id: "4", x: 0.25, y: 1.5},
            {id: "5", x: 2.25, y: 1.5},
            {id: "6", x: 4, y: 1.5},
            {id: "7", x: 5.5, y: 1.5},
            {id: "8", x: 2.25, y: 0},
            {id: "9", x: 4, y: 0},
        ],
        edges: [
            ["1", "2"], ["1", "3"], ["2", "4"], ["2", "5"],
            ["3", "6"], ["3", "7"], ["5", "8"], ["6", "9"],
        ],
    },
    {
        id: "star",
        name: "Directed star",
        description: "Node 1 in the center, with four chains of nodes pointing away "
            + "from it. BFS spreads out from 1 like a ripple, one ring at a time, "
            + "visiting 1, 2, 3, …, 13 in order. Compare it to the same graph "
            + "in the DFS demo.",
        directed: true,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 1.3, y: 0.75},
            {id: "3", x: 1.3, y: -0.75},
            {id: "4", x: -1.3, y: -0.75},
            {id: "5", x: -1.3, y: 0.75},
            {id: "6", x: 2.6, y: 1.5},
            {id: "7", x: 2.6, y: -1.5},
            {id: "8", x: -2.6, y: -1.5},
            {id: "9", x: -2.6, y: 1.5},
            {id: "10", x: 3.9, y: 2.25},
            {id: "11", x: 3.9, y: -2.25},
            {id: "12", x: -3.9, y: -2.25},
            {id: "13", x: -3.9, y: 2.25},
        ],
        edges: [
            ["1", "2"], ["1", "3"], ["1", "4"], ["1", "5"],
            ["2", "6"], ["3", "7"], ["4", "8"], ["5", "9"],
            ["6", "10"], ["7", "11"], ["8", "12"], ["9", "13"],
        ],
    },
    {
        id: "disconnected",
        name: "Disconnected graph",
        description: "An undirected graph with three connected components. "
            + "Try it with and without “full BFS”.",
        directed: false,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 2.5},
            {id: "2", x: 0, y: 4.5},
            {id: "3", x: 1.5, y: 3.5},
            {id: "4", x: 3, y: 3.5},
            {id: "5", x: 0, y: 0},
            {id: "6", x: 0, y: 1.5},
            {id: "7", x: 1.5, y: 0},
            {id: "8", x: 3, y: 0},
            {id: "9", x: 2.25, y: 1.5},
        ],
        edges: [
            ["1", "2"], ["1", "3"], ["2", "3"], ["3", "4"],
            ["5", "6"],
            ["7", "8"], ["7", "9"], ["8", "9"],
        ],
    },
];
