// The point clouds students can choose from in the single-linkage clustering
// demo. Coordinates are in points (1/72 inch), with y up.
//
// The lecture example is the hand-drawn point cloud from Lecture 17
// (lectures/17-kruskal/src/fig/data.pdf, on the "Clustering" and "Clustering
// with MSTs" slides): the centers of its 13 crosses, read off the figure.
// The MST in fig/data-mst.pdf is hand-drawn too, and isn't quite the
// Euclidean MST of those points, so three points are moved slightly (by at
// most 12pt, marked "moved") so that the demo's MST is the one on the slide.

const SINGLE_LINKAGE_DATA = [
    {
        id: "lecture",
        name: "Lecture example",
        description: "The points from the “Clustering with MSTs” slide in "
            + "Lecture 17. Stopping at k = 2 clusters finds its two groups.",
        k: 2,
        points: [
            {x: 246.0, y: 190.5},
            {x: 215.5, y: 187.5},
            {x: 189.0, y: 163.0},
            {x: 249.5, y: 155.5},
            {x: 220.5, y: 130.0},
            {x: 181.5, y: 130.5},
            {x: 268.0, y: 108.0},   // moved, from (263.5, 103.5)
            {x: 28.0, y: 78.0},     // moved, from (26.5, 82.5)
            {x: 78.5, y: 79.5},
            {x: 65.5, y: 47.5},
            {x: 5.5, y: 41.0},
            {x: 52.5, y: 14.5},
            {x: 100.0, y: 18.0},    // moved, from (104.0, 7.0)
        ],
    },
    {
        // Three groups of eight points, two of them (left) closer to each
        // other than to the third (bottom right). Within each group, every
        // merge is at distance at most 25.1; the two nearby groups merge at
        // 47.0, and the third joins them at 96.6.
        id: "nested",
        name: "Groups within groups",
        description: "Three groups, two of which are much closer to each other "
            + "than to the third. Stopping at k = 3 finds the three groups. "
            + "Then try k = 2: the two nearby groups merge into one cluster, "
            + "long before the far group would join them.",
        k: 3,
        points: [
            // the left group
            {x: 45, y: 150}, {x: 67, y: 162}, {x: 63, y: 138}, {x: 87, y: 150},
            {x: 50, y: 125}, {x: 77, y: 118}, {x: 95, y: 132}, {x: 73, y: 180},
            // the middle group, near the left one
            {x: 138, y: 160}, {x: 158, y: 174}, {x: 152, y: 145}, {x: 176, y: 156},
            {x: 142, y: 130}, {x: 170, y: 128}, {x: 192, y: 140}, {x: 196, y: 166},
            // the far group, at the bottom right
            {x: 214, y: 40}, {x: 236, y: 54}, {x: 230, y: 28}, {x: 254, y: 40},
            {x: 216, y: 14}, {x: 246, y: 12}, {x: 264, y: 24}, {x: 196, y: 26},
        ],
    },
    {
        id: "random",
        name: "Random points",
        description: "Random points around three centers. Click New points "
            + "for another set.",
        k: 3,
        random: true,
    },
];

// Random points around three centers, from the seed `seed` (so that a link
// with ?data=random&seed=... shows the same points).
function randomPoints(seed) {
    // mulberry32, a small seeded random number generator
    let a = seed >>> 0;
    function random() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // a standard normal, by the Box-Muller transform
    function normal() {
        return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
    }

    const centers = [{x: 50, y: 140}, {x: 210, y: 160}, {x: 140, y: 40}];
    // each center moves a little, so that the groups differ from set to set
    for (const c of centers) {
        c.x += 30 * (random() - .5);
        c.y += 30 * (random() - .5);
    }
    // each group's points are spread around its center (cut off at two
    // standard deviations, so that no point strays far from its group), and
    // no two points are closer than 12pt, so that they don't overlap
    const points = [];
    const clipped = () => Math.max(-2, Math.min(2, normal()));
    for (const c of centers) {
        const count = 6 + Math.floor(random() * 4);
        let placed = 0;
        for (let tries = 0; placed < count && tries < 1000; tries++) {
            const q = {x: c.x + 18 * clipped(), y: c.y + 18 * clipped()};
            if (points.every(r => Math.hypot(r.x - q.x, r.y - q.y) >= 12)) {
                points.push(q);
                placed += 1;
            }
        }
    }
    return points;
}
