// The graphs students can choose from in the DFS demo. Coordinates are in the
// same units as the TikZ figures in the slides (y points up). See
// ../common/graph.js for the format.

const DFS_GRAPHS = [
    {
        id: "lecture",
        name: "Undirected graph",
        description: "The graph from the “nested function calls” exercise "
            + "and the “Example” slide in Lecture 13.",
        directed: false,
        source: "a",
        nodes: [
            {id: "a", x: 0.2, y: 2.2},
            {id: "b", x: 1.7, y: 3.9},
            {id: "c", x: 1.65, y: 0.35},
            {id: "d", x: 2.6, y: 2.15},
            {id: "e", x: 4, y: 3.45},
            {id: "f", x: 3.95, y: 1},
            {id: "g", x: 5.3, y: 4.75},
            {id: "h", x: 6.2, y: 3.3},
            {id: "i", x: 4.55, y: 2.15},
        ],
        edges: [
            ["a", "b"], ["a", "c"], ["a", "d"], ["b", "d"], ["b", "e"],
            ["d", "e"], ["d", "i"], ["e", "g"], ["e", "h"], ["c", "f"],
        ],
    },
    {
        id: "figure-eight",
        name: "Figure eight",
        description: "The graph from the “True or False” exercise in Lecture 13. "
            + "Start at 4: node 5 is undiscovered when dfs(1) is called, "
            + "but dfs(5) isn't called during dfs(1).",
        directed: false,
        source: "4",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 1.5, y: 1.5},
            {id: "3", x: 1.5, y: -1.5},
            {id: "4", x: 3, y: 0},
            {id: "5", x: 4.5, y: 1.5},
            {id: "6", x: 4.5, y: -1.5},
            {id: "7", x: 6, y: 0},
        ],
        edges: [
            ["1", "2"], ["1", "3"], ["2", "4"], ["3", "4"],
            ["4", "5"], ["4", "6"], ["5", "7"], ["6", "7"],
        ],
    },
    {
        id: "cyclic",
        name: "Directed graph with a cycle",
        description: "The graph from the “Cyclic Graphs” slide in Lecture 13. "
            + "Exploring an edge to a pending node finds a back edge, "
            + "and so a cycle.",
        directed: true,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 1.5, y: 1.5},
            {id: "3", x: 1.5, y: -1.5},
            {id: "4", x: 3, y: 0},
            {id: "5", x: 5, y: 0},
            {id: "6", x: 6.5, y: 1.5},
            {id: "7", x: 6.5, y: -1.5},
        ],
        edges: [
            ["1", "2"], ["2", "4"], ["4", "3"], ["3", "1"],
            ["4", "5"], ["5", "6"], ["6", "7"],
        ],
    },
    {
        id: "dag",
        name: "Directed acyclic graph",
        description: "The DAG from Lecture 13. A full DFS finds no back edges, "
            + "since there are no cycles.",
        directed: true,
        source: "1",
        nodes: [
            {id: "1", x: 0, y: 0},
            {id: "2", x: 1.5, y: 1.5},
            {id: "3", x: 1.5, y: -1.5},
            {id: "4", x: 3, y: 0},
        ],
        edges: [
            ["1", "2"], ["1", "3"], ["2", "4"], ["3", "4"],
        ],
    },
    {
        id: "x",
        name: "Directed X",
        description: "Node 1 in the center, with four chains of nodes pointing away "
            + "from it. DFS follows each chain all the way to its end before "
            + "starting the next: 1, 2, 6, 10, then 3, 7, 11, and so on. "
            + "Compare it to the same graph in the BFS demo.",
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
            + "Try it with and without “full DFS”.",
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
