// The single-linkage clustering demo: choose a point cloud and a number of
// clusters, k, then step through single-linkage clustering one merge at a
// time. Each step adds the edge between the two closest points that are in
// different clusters, merging their clusters, until k clusters are left.
// This is Kruskal's algorithm on the complete distance graph, stopped early;
// the edges it would skip (both ends already in the same cluster) aren't
// steps here. Uses DemoGraphs from ../common/graph.js and
// SINGLE_LINKAGE_DATA and randomPoints from ./points.js.

(function () {

    // the clusters' colors: the slides' blue, red, green, and yellow
    // (pastelblue, pastelred, pastelgreen, pastelyellow in dscslides.cls),
    // then other bold colors for when more clusters need one. The slides'
    // purple (pastelpurple) is kept for the edge being added. A point on
    // its own (a cluster of one) is gray.
    const PALETTE = [
        "#007aff",  // pastelblue
        "#d20000",  // pastelred
        "#8fc34f",  // pastelgreen
        "#FBC05E",  // pastelyellow
        "#f97316",  // orange
        "#14b8a6",  // teal
        "#ec4899",  // pink
        "#8b5a2b",  // brown
    ];

    // a distance, e.g. "30.6"
    const format = (d) => d.toFixed(1);

    function distance(P, Q) {
        return Math.hypot(P.x - Q.x, P.y - Q.y);
    }

    // Run single linkage (Kruskal's algorithm on the complete distance graph)
    // to the end, and record the state after each merge. A state has
    //
    //     index:   the number of merges so far
    //     count:   the number of clusters
    //     color:   for each point, the palette index of its cluster's color,
    //              or -1 if it is a cluster of one
    //     size:    for each point, the size of its cluster
    //     edges:   the edges added so far, as [i, j, distance]
    //     merge:   (after a merge) {edge: [i, j, d], a, b, color}, where a and
    //              b describe the two clusters that merged, as {size, color},
    //              and color is the merged cluster's
    function singleLinkage(points) {
        const n = points.length;
        const pairs = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                pairs.push([i, j, distance(points[i], points[j])]);
            }
        }
        pairs.sort((a, b) => a[2] - b[2]);

        // a disjoint set forest, with union by size
        const parent = points.map((_, i) => i);
        const members = points.map((_, i) => [i]);
        function find(x) {
            while (parent[x] !== x) {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        }

        const color = points.map(() => -1);
        const edges = [];
        const states = [];
        function record(fields) {
            states.push({
                index: states.length,
                count: n - edges.length,
                color: [...color],
                size: points.map((_, i) => members[find(i)].length),
                edges: [...edges],
                merge: null,
                ...fields,
            });
        }
        record({});

        for (const [i, j, d] of pairs) {
            const ri = find(i), rj = find(j);
            if (ri === rj) {
                continue;
            }
            const a = {size: members[ri].length, color: color[i]};
            const b = {size: members[rj].length, color: color[j]};
            // the merged cluster keeps the larger cluster's color (or, if
            // they're the same size, the color that comes first); two points
            // on their own get the first color no cluster is using
            let merged;
            if (a.color === -1 && b.color === -1) {
                const used = new Set(color);
                merged = PALETTE.findIndex((_, c) => !used.has(c));
                if (merged === -1) {
                    merged = (states.length - 1) % PALETTE.length;
                }
            } else if (a.color === -1 || b.color === -1) {
                merged = Math.max(a.color, b.color);
            } else if (a.size !== b.size) {
                merged = a.size > b.size ? a.color : b.color;
            } else {
                merged = Math.min(a.color, b.color);
            }
            const [big, small] = members[ri].length >= members[rj].length ? [ri, rj] : [rj, ri];
            parent[small] = big;
            members[big].push(...members[small]);
            members[small] = [];
            for (const x of members[big]) {
                color[x] = merged;
            }
            edges.push([i, j, d]);
            record({merge: {edge: [i, j, d], a, b, color: merged}});
            if (edges.length === n - 1) {
                break;
            }
        }
        return states;
    }

    // ---------------------------------------------------------------------
    // the drawing

    function sketch(container) {
        const RADIUS = 10;
        // how long each part of a merge's animation takes, in ms
        const EDGE = 550;     // the new edge is drawn out
        const PAUSE = 150;
        const RECOLOR = 500;  // the merged cluster's points take its color

        let instance = null;
        let points = null;
        let state = null;
        let previous = null;
        let layout = null;
        let started = 0;
        let animating = false;

        const sketchFunction = (p) => {
            const paint = DemoGraphs.painter(p, {radius: RADIUS});
            let ready = false;

            function computeLayout() {
                const room = DemoGraphs.embedHeight(container);
                // fitGraph's padding around the points (see its radius below)
                const pad = 2 * (RADIUS + 8 + 12);
                const maxHeight = room === null
                    ? Math.min(380, .7 * p.width)
                    : Math.max(80, room - pad - 4);
                const graph = {nodes: points.map((pt, i) => ({id: i, ...pt}))};
                const fit = DemoGraphs.fitGraph(graph, {
                    width: p.width, maxHeight, radius: RADIUS + 8,
                });
                return {positions: points.map((_, i) => fit.positions.get(i)),
                        height: fit.height};
            }

            function resize() {
                if (!ready) {
                    return;
                }
                const width = Math.max(container.clientWidth, 280);
                p.resizeCanvas(width, p.height, true);
                if (points) {
                    layout = computeLayout();
                    p.resizeCanvas(width, layout.height, true);
                }
            }

            // the edge from point i to point j, drawn out from i as far as
            // `progress` in [0, 1]
            function drawEdge(i, j, progress, color, weight) {
                const P = layout.positions[i], Q = layout.positions[j];
                p.stroke(color);
                p.strokeWeight(weight);
                const M = paint.lerpPoint(P, Q, progress);
                p.line(P.x, P.y, M.x, M.y);
            }

            // the edge's length, as "d = 30.6" (with an italic d, as in
            // math), in a small box beside its middle
            function drawLength(i, j, d, color, alpha) {
                if (alpha <= 0) {
                    return;
                }
                const P = layout.positions[i], Q = layout.positions[j];
                const len = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
                // offset to the side of the edge that points up (or left)
                let nx = -(Q.y - P.y) / len, ny = (Q.x - P.x) / len;
                if (ny > 0 || (ny === 0 && nx > 0)) {
                    nx = -nx;
                    ny = -ny;
                }
                p.textSize(14);
                p.textStyle(p.BOLDITALIC);
                const variable = "d";
                const wVariable = p.textWidth(variable);
                p.textStyle(p.BOLD);
                const rest = ` = ${format(d)}`;
                const wRest = p.textWidth(rest);
                const w = wVariable + wRest + 10, h = 18;
                // far enough out that the box clears the edge, whichever way
                // the edge points
                const off = 5 + Math.abs(nx) * w / 2 + Math.abs(ny) * h / 2;
                const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
                let x = mx + off * nx, y = my + off * ny;
                // on the other side, if it would stick out of the drawing
                const outside = (x, y) => x - w / 2 < 0 || x + w / 2 > p.width
                    || y - h / 2 < 0 || y + h / 2 > p.height;
                if (outside(x, y) && !outside(mx - off * nx, my - off * ny)) {
                    x = mx - off * nx;
                    y = my - off * ny;
                }
                x = Math.max(w / 2, Math.min(p.width - w / 2, x));
                y = Math.max(h / 2, Math.min(p.height - h / 2, y));
                const bg = p.color(paint.theme().background);
                bg.setAlpha(220 * alpha);
                p.noStroke();
                p.fill(bg);
                p.rect(x - w / 2, y - h / 2, w, h, 4);
                const c = p.color(color);
                c.setAlpha(255 * alpha);
                p.fill(c);
                p.textAlign(p.LEFT, p.CENTER);
                const left = x - (wVariable + wRest) / 2;
                p.textStyle(p.BOLDITALIC);
                p.text(variable, left, y + 1);
                p.textStyle(p.BOLD);
                p.text(rest, left + wVariable, y + 1);
                p.textStyle(p.NORMAL);
            }

            function pointColor(c, dark) {
                return c === -1 ? (dark ? "#6b7280" : "#d1d5db") : PALETTE[c];
            }

            p.setup = () => {
                p.createCanvas(Math.max(container.clientWidth, 280), 300);
                p.textFont("Arial");
                if (typeof ResizeObserver !== "undefined") {
                    new ResizeObserver(resize).observe(container);
                }
                ready = true;
                resize();
            };

            p.windowResized = resize;

            p.draw = () => {
                p.clear();
                if (!points || !state || !layout) {
                    return;
                }
                const colors = paint.theme();
                const dark = document.documentElement.classList.contains("dark");
                const t = animating ? performance.now() - started : Infinity;
                const edgeT = paint.phase(t, 0, EDGE);
                const recolorT = paint.phase(t, EDGE + PAUSE, RECOLOR);
                const merge = state.merge;
                const accent = DemoGraphs.COLORS.accent;

                // the edges added so far; the newest one in purple, drawn
                // out
                for (const [i, j] of state.edges) {
                    if (merge && i === merge.edge[0] && j === merge.edge[1]) {
                        continue;
                    }
                    drawEdge(i, j, 1, colors.ink, 3);
                }
                if (merge) {
                    const [i, j] = merge.edge;
                    drawEdge(i, j, edgeT, accent, 5);
                }

                // the points, colored by cluster; the points whose color
                // changes in this merge swell and take their new color
                points.forEach((_, i) => {
                    const pos = layout.positions[i];
                    const now = p.color(pointColor(state.color[i], dark));
                    let fill = now, radius = RADIUS;
                    if (animating && previous && previous.color[i] !== state.color[i]) {
                        const was = p.color(pointColor(previous.color[i], dark));
                        fill = p.lerpColor(was, now, recolorT);
                        radius = RADIUS * (1 + .35 * Math.sin(Math.PI * recolorT));
                    }
                    p.fill(fill);
                    p.stroke(colors.stroke);
                    p.strokeWeight(2);
                    p.circle(pos.x, pos.y, 2 * radius);
                });

                // the lengths, over everything else
                if (merge) {
                    drawLength(merge.edge[0], merge.edge[1], merge.edge[2], accent,
                        animating ? edgeT : 1);
                }

                if (animating && t > EDGE + PAUSE + RECOLOR) {
                    animating = false;
                }
            };

            p.demoResize = resize;
        };

        DemoGraphs.startSketch(sketchFunction, container, (i) => { instance = i; });

        return {
            DURATION: EDGE + PAUSE + RECOLOR,

            setPoints(newPoints, firstState) {
                points = newPoints;
                state = firstState;
                previous = null;
                layout = null;
                animating = false;
                if (instance !== null) {
                    instance.demoResize();
                }
            },

            // show `newState`, animating the merge from `previousState` if
            // it's given. Returns how long the
            // animation takes, in ms.
            show(newState, previousState) {
                state = newState;
                previous = previousState;
                animating = previousState !== null && newState.merge !== null;
                started = performance.now();
                return animating ? this.DURATION : 0;
            },
        };
    }

    // ---------------------------------------------------------------------
    // the page

    const root = document.getElementById("sl-demo");
    const $ = (selector) => root.querySelector(selector);

    const dataSelect = $("#sl-data");
    const kSelect = $("#sl-k");
    const newButton = $("#sl-new");
    const description = $("#sl-description");
    const caption = $("#sl-caption");
    const countLabel = $("#sl-count");

    for (const data of SINGLE_LINKAGE_DATA) {
        const option = document.createElement("option");
        option.value = data.id;
        option.textContent = data.name;
        dataSelect.append(option);
    }

    const drawing = sketch($("#sl-canvas"));

    let data = null;
    let points = null;
    let states = null;
    let k = 2;
    let stepper = null;

    // HTML for a cluster: a dot in its color, and its size
    function cluster({size, color}) {
        if (color === -1) {
            return `<span class="sl-dot sl-alone"></span> a point on its own`;
        }
        return `<span class="sl-dot" style="background:${PALETTE[color]}"></span>
            a cluster of ${size} points`;
    }

    const clusters = (count) => (count === 1 ? "1 cluster" : `${count} clusters`);

    function describe(state) {
        const n = points.length;
        let html;
        if (state.merge === null) {
            html = `<p>Every point starts in its own cluster, so there are ${n}
                clusters. Points on their own are gray.</p>
                <p>Each step finds the two closest points that are in
                <b>different</b> clusters, draws the edge between them, and
                merges their clusters. We'll stop when ${clusters(k)}
                ${k === 1 ? "is" : "are"} left.</p>`;
        } else {
            const {edge: [, , d], a, b, color} = state.merge;
            const sizes = [a, b].sort((x, y) => y.size - x.size);
            html = `<p>The closest two points in different clusters are at
                distance <b>${format(d)}</b>. Add the edge between them.</p>
                <p>That merges ${cluster(sizes[0])} with ${cluster(sizes[1])}
                into <span class="sl-dot" style="background:${PALETTE[color]}"></span>
                a cluster of ${a.size + b.size} points.
                Now there ${state.count === 1 ? "is" : "are"} ${clusters(state.count)}.</p>`;
        }
        if (state.count === k) {
            if (k === 1) {
                html += `<p>Everything is in one cluster, so we're done. The edges
                    drawn form a <b>minimum spanning tree</b> of the distance
                    graph.</p>`;
            } else {
                html += `<p>That's ${clusters(k)}, so stop: these are the
                    <b>single-linkage clusters</b>.</p>`;
            }
        }
        return html;
    }

    function show(i, previous) {
        const state = states[i];
        const done = state.count === k;
        countLabel.textContent = `${clusters(state.count)}${done
            ? ` — stopped at k = ${k}` : ` (stopping at k = ${k})`}`;
        caption.innerHTML = describe(state);
        return drawing.show(state, previous === null ? null : states[previous]);
    }

    function restart(keep = false) {
        const at = keep && stepper ? stepper.position() : 0;
        const count = points.length - k + 1;
        if (stepper === null) {
            stepper = DemoGraphs.stepper({
                first: $("#sl-first"),
                back: $("#sl-back"),
                next: $("#sl-next"),
                last: $("#sl-last"),
                play: $("#sl-play"),
                counter: $("#sl-counter"),
            }, count, show, {busy: true});
        } else {
            stepper.reset(count, Math.min(at, count - 1));
        }
    }

    function fillK(preferred) {
        kSelect.innerHTML = "";
        for (let j = 1; j <= points.length; j++) {
            const option = document.createElement("option");
            option.value = String(j);
            option.textContent = j === 1 ? "1 (the whole MST)" : String(j);
            kSelect.append(option);
        }
        k = Math.max(1, Math.min(points.length, preferred));
        kSelect.value = String(k);
    }

    function choose(id, {seed = null, preferredK = null} = {}) {
        data = SINGLE_LINKAGE_DATA.find(x => x.id === id);
        description.textContent = data.description;
        newButton.hidden = !data.random;
        if (data.random) {
            seed = seed ?? Math.floor(Math.random() * 2 ** 31);
            points = randomPoints(seed);
        } else {
            points = data.points;
        }
        fillK(preferredK ?? data.k);
        states = singleLinkage(points);
        drawing.setPoints(points, states[0]);
        restart();
    }

    dataSelect.addEventListener("change", () => choose(dataSelect.value));
    newButton.addEventListener("click", () => choose(data.id, {preferredK: k}));
    kSelect.addEventListener("change", () => {
        k = Number(kSelect.value);
        restart(true);
    });

    // options from the URL, e.g. for a lecture slide:
    // ?data=<id>&k=<clusters>&seed=<number> (seed, for the random points)
    const params = new URLSearchParams(location.search);
    const requested = params.get("data");
    const initial = SINGLE_LINKAGE_DATA.some(x => x.id === requested)
        ? requested : SINGLE_LINKAGE_DATA[0].id;
    dataSelect.value = initial;
    const seed = params.has("seed") ? Number(params.get("seed")) : null;
    const preferredK = params.has("k") ? Number(params.get("k")) : null;
    choose(initial, {seed, preferredK: Number.isFinite(preferredK) ? preferredK : null});
})();
