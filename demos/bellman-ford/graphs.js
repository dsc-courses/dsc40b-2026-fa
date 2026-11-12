// The graphs students can choose from in the Bellman-Ford demo. Coordinates
// are in "slide units" (y points up): the layout of the figures in Lecture
// 14, on a grid, and symmetric.
// See ../common/graph.js for the format. Each edge is [u, v, weight], and
// the edges are listed in the order that graph.edges produces them, which
// is the order Bellman-Ford updates them in. Each node's `badge` says where
// its estimated distance is drawn: "above", "below", "left", or "right". An
// edge's weight is drawn above (or to the left of) a straight edge, unless
// the edge has a fourth element, "flip", which puts it on the other side.

const BF_GRAPHS = [
    {
        id: "lecture",
        name: "Lecture example",
        description: "The graph from Lecture 14, with the edges in the order "
            + "from the \u201CExample\u201D slide.",
        source: "v1",
        nodes: [
            {id: "v1", x: 0, y: 0, badge: "below"},
            {id: "v2", x: 1.5, y: 2, badge: "left"},
            {id: "v3", x: 3.5, y: 3.25, badge: "above"},
            {id: "v4", x: 6.5, y: 3.25, badge: "above"},
            {id: "v5", x: 8.5, y: 2, badge: "right"},
            {id: "v6", x: 10, y: 0, badge: "below"},
            {id: "v7", x: 5, y: 0, badge: "below"},
        ],
        edges: [
            ["v3", "v4", 1], ["v1", "v2", 2], ["v2", "v3", -1],
            ["v7", "v6", 0, "flip"], ["v5", "v7", -1], ["v7", "v5", 3],
            ["v4", "v5", 3], ["v5", "v6", 2], ["v1", "v7", 7],
        ],
    },
    {
        id: "lecture-best",
        name: "Lecture example, good edge order",
        description: "The same graph, with the edges in the order of the "
            + "shortest paths from v1. One iteration finds every shortest "
            + "path. Try it with early stopping.",
        source: "v1",
        nodes: null,  // the lecture example's (filled in below)
        edges: [
            ["v1", "v2", 2], ["v2", "v3", -1], ["v3", "v4", 1],
            ["v4", "v5", 3], ["v5", "v7", -1], ["v5", "v6", 2],
            ["v7", "v6", 0, "flip"], ["v1", "v7", 7], ["v7", "v5", 3],
        ],
    },
    {
        id: "lecture-worst",
        name: "Lecture example, bad edge order",
        description: "The same graph, with the edges in the reverse of the "
            + "order of the shortest paths. The shortest path to v6 has "
            + "6 edges, and each iteration only gets one edge further along it, "
            + "so all |V| \u2212 1 = 6 iterations are needed.",
        source: "v1",
        nodes: null,
        edges: [
            ["v7", "v6", 0, "flip"], ["v5", "v6", 2], ["v7", "v5", 3],
            ["v5", "v7", -1], ["v4", "v5", 3], ["v3", "v4", 1],
            ["v2", "v3", -1], ["v1", "v7", 7], ["v1", "v2", 2],
        ],
    },
    {
        id: "negative-cycle",
        name: "Negative cycle",
        description: "The graph from the \u201CNegative Cycles\u201D slide in Lecture 14. "
            + "The cycle u2 \u2192 u3 \u2192 u4 \u2192 u5 \u2192 u2 has total weight \u22122, so the "
            + "estimates never stop decreasing. Check \u201CDetect negative cycles\u201D "
            + "to run a |V|th iteration.",
        source: "u1",
        nodes: [
            {id: "u1", x: 0, y: 0, badge: "below"},
            {id: "u2", x: 2, y: 0, badge: "below"},
            {id: "u3", x: 1, y: 1.25, badge: "left"},
            {id: "u4", x: 2, y: 2.5, badge: "above"},
            {id: "u5", x: 3, y: 1.25, badge: "right"},
            {id: "u6", x: 4, y: 0, badge: "below"},
        ],
        edges: [
            ["u1", "u2", 3], ["u2", "u3", -2], ["u3", "u4", 1],
            ["u4", "u5", -3], ["u5", "u2", 2], ["u2", "u6", 4],
        ],
    },
];

// the variants of the lecture example share its layout
for (const graph of BF_GRAPHS) {
    if (graph.nodes === null) {
        graph.nodes = BF_GRAPHS[0].nodes;
    }
    graph.directed = true;
}
