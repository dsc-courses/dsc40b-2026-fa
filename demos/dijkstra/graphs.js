// The graphs students can choose from in the Dijkstra's algorithm demo.
// Coordinates are in "slide units" (y points up): the layout of the figures
// in Lecture 15.
// See ../common/graph.js for the format, and ../common/weighted.js for how
// the weights and estimates are drawn. Each edge is [u, v, weight]. Each
// node's `badge` says where its estimated distance is drawn: "above",
// "below", "left", or "right". An edge's weight is drawn above (or to the
// left of) a straight edge, unless the edge has a fourth element, "flip",
// which puts it on the other side.

const DIJKSTRA_GRAPHS = [
    {
        id: "lecture",
        name: "Lecture example",
        description: "The graph from the “Example” slide in Lecture 15. "
            + "Watch the estimates of u2 and u4: each is lowered more than "
            + "once before it is taken out of the priority queue.",
        source: "s",
        nodes: [
            {id: "s", x: 0, y: 0, badge: "left"},
            {id: "u1", x: 2, y: 2, badge: "above"},
            {id: "u2", x: 2, y: 0, badge: "below"},
            {id: "u3", x: 2, y: -2, badge: "below"},
            {id: "u4", x: 4, y: 0, badge: "right"},
        ],
        edges: [
            ["s", "u1", 2], ["s", "u2", 5], ["s", "u3", 3, "flip"],
            ["u1", "u2", 2], ["u1", "u4", 9], ["u2", "u4", 1],
            ["u3", "u4", 4, "flip"],
        ],
    },
    {
        id: "negative",
        name: "Negative edge weight",
        description: "The graph from the second “Example” slide in Lecture 15, "
            + "with an edge of weight −100. Dijkstra's algorithm assumes the "
            + "edge weights are positive, and here it gets the distance to b wrong.",
        source: "a",
        nodes: [
            {id: "a", x: 0, y: 0, badge: "left"},
            {id: "b", x: 3, y: 2, badge: "above"},
            {id: "c", x: 3, y: 0, badge: "right"},
            {id: "d", x: 3, y: -2, badge: "below"},
        ],
        edges: [
            ["a", "b", 2], ["a", "c", 3, "flip"], ["a", "d", 10, "flip"],
            ["c", "b", 5, "flip"], ["d", "c", -100, "flip"],
        ],
    },
];

for (const graph of DIJKSTRA_GRAPHS) {
    graph.directed = true;
}
