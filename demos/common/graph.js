// Shared code for the interactive graph demos: graph helpers, an animated
// p5.js drawing of a graph and its queue, and a stepper that moves through a
// list of precomputed states.
//
// A graph is an object like
//
//     {
//         name: "Lecture 11 example",
//         directed: false,
//         nodes: [{id: "1", x: 0, y: 0}, ...],   // x, y in "slide units", y up
//         edges: [["1", "2"], ...],
//     }
//
// Node positions use the same coordinates as the TikZ figures in the slides,
// so a graph from a lecture can be copied over directly.
//
// A state, as drawn by DemoGraphs.sketch, has
//
//     status:   Map from node to "undiscovered" | "pending" | "visited"
//     queue:    the pending nodes, oldest (front) first
//     current:  the node being visited this step, or null
//     explored: Set of edge keys (see edgeKey) explored this step

const DemoGraphs = {

    // the status colors from the lecture slides (dscslides.cls)
    COLORS: {
        visited: "#d20000",       // pastelred
        pending: "#FBC05E",       // pastelyellow
        undiscovered: "#8fc34f",  // pastelgreen
        accent: "#6E66BA",        // pastelpurple
    },

    // compare node labels so that "2" < "10" and "a" < "b"
    compareNodes(a, b) {
        return String(a).localeCompare(String(b), undefined, {numeric: true});
    },

    // the nodes of the graph, in sorted order
    sortedNodes(graph) {
        return graph.nodes.map(n => n.id).sort(DemoGraphs.compareNodes);
    },

    // a map from each node to its neighbors (successors, if directed), in
    // sorted order -- the convention used in lecture
    neighbors(graph) {
        const adj = new Map(graph.nodes.map(n => [n.id, new Set()]));
        for (const [u, v] of graph.edges) {
            adj.get(u).add(v);
            if (!graph.directed) {
                adj.get(v).add(u);
            }
        }
        const sorted = new Map();
        for (const [u, vs] of adj) {
            sorted.set(u, [...vs].sort(DemoGraphs.compareNodes));
        }
        return sorted;
    },

    // a key identifying an edge, so that explored edges can be highlighted
    edgeKey(graph, u, v) {
        if (graph.directed) {
            return `${u}->${v}`;
        }
        const [a, b] = [u, v].sort(DemoGraphs.compareNodes);
        return `${a}--${b}`;
    },

    // Create an animated drawing of a graph and its queue inside the element
    // `container`, using p5.js in instance mode. Returns an object with
    //
    //     setGraph(graph, states)       draw a new graph, which will go
    //                                   through `states`, in the first one
    //     show(state, previous, part)   move to `state`; if `previous` is
    //                                   given, animate the change from it.
    //                                   Returns how long that takes, in ms.
    //                                   `part` = {from, to, animate} plays
    //                                   only that part of the animation (in
    //                                   ms), or holds still at `to` if
    //                                   `animate` is false
    //     segments(state, previous)     the parts of that animation, as
    //                                   [start, end] pairs, in ms
    //
    // The animation of one BFS step happens in order:
    //   1. the node at the front of the queue moves to its place in the graph;
    //   2. one neighbor at a time, in the order of state.explorations, the
    //      edge to it is drawn out from the node, and if that discovers the
    //      neighbor, it turns pending and moves to the back of the queue;
    //   3. the node turns visited.
    //
    // The queue is drawn below the graph like a list of nodes, front first,
    // e.g. "pending = [4, 3, 5]".
    sketch(container, {queueLabel = "pending"} = {}) {
        // how long each part of a step's animation takes, in milliseconds
        const POP = 450;         // the popped node moves to the graph
        const EDGE = 400;        // an edge is drawn out
        const GROW = 250;        // a discovered node swells, and then,
        const FADE = 675;        // at full size, fades from green to yellow
        const TURN = GROW + FADE;
        const SWELL = 0.25;      // how much bigger it gets
        const SHRINK = 300;      // it shrinks back, once it reaches the queue
        const DIM = 900;         // a neighbor already seen washes out halfway
                                 // and back, since nothing happens to it
        const FLY = 500;         // a discovered node moves to the queue
        const PAUSE = 500;       // between one neighbor and the next
        const POP_PAUSE = 500;   // after the popped node reaches the graph
        const VISIT = FADE;      // the node fades from yellow to red
        const RADIUS = 20;
        const TOKEN = 15;        // radius of the nodes drawn in the lists
        const LIST_LINE = 2 * TOKEN + 12;  // height of one line of a list
        const LIST_FAMILY = "Courier New";
        const LIST_FONT = 18;

        let graph = null;
        let state = null;
        let previous = null;
        let started = -Infinity;  // when the current animation began
        let from = 0, to = 0;     // the part of it being played, in ms
        let playing = true;       // false: hold still at time `to`
        let timeline = plan(null, null);  // when each part of it happens
        let layout = null;        // node positions in pixels
        let ready = false;        // whether p5 has created the canvas
        let queueLines = 1;       // lines reserved for the queue
        let longest = 0;          // the longest the queue will get

        // When each part of the animation from `before` to `after` happens,
        // in ms from its start: when the popped node has reached the graph
        // (pop), when each explored edge starts being drawn (edges, by key),
        // when each discovered node starts turning pending (turns, by node),
        // when each neighbor already seen starts dimming (dims, by node),
        // when each node entering the queue leaves for it (flights, by node),
        // when the visited node changes color (visit), and the end (end).
        // It also splits the animation into its parts (segments, as
        // [start, end] pairs): popping the node, exploring each edge, the
        // nodes entering the queue without an edge, and marking the node
        // visited, in that order.
        function plan(after, before) {
            const edges = new Map(), turns = new Map(), flights = new Map();
            const dims = new Map();
            if (before === null) {
                return {pop: 0, edges, turns, flights, dims, visit: 0, end: 0,
                        segments: [[0, 0]]};
            }
            const segments = [];
            const current = after.current;
            const pop = current !== null && before.queue[0] === current ? POP : 0;
            let t = pop > 0 ? pop + POP_PAUSE : 0;
            if (pop > 0) {
                segments.push([0, t]);
            }
            for (const e of after.explorations || []) {
                const start = t;
                edges.set(e.key, {start: t});
                t += EDGE;
                if (e.discovered) {
                    turns.set(e.v, t);
                    t += TURN;
                    flights.set(e.v, t);
                    t += FLY;
                    // (it shrinks back during the pause that follows)
                } else {
                    dims.set(e.v, t);
                    t += DIM;
                }
                t += PAUSE;
                segments.push([start, t]);
            }
            // nodes that enter the queue without an edge (bfs's source)
            const entering = t;
            for (const id of after.queue) {
                if (!before.queue.includes(id) && !flights.has(id)) {
                    turns.set(id, t);
                    t += TURN;
                    flights.set(id, t);
                    t += FLY + SHRINK;
                }
            }
            if (t > entering) {
                segments.push([entering, t]);
            }
            const visit = t;
            if (current !== null) {
                t += VISIT;
                segments.push([visit, t]);
            }
            if (segments.length === 0) {
                segments.push([0, t]);
            }
            return {pop, edges, turns, flights, dims, visit, end: t, segments};
        }

        // p5.js may still be loading (the page loads it in the background,
        // as a script with id "p5-script"), so start drawing once it is
        // there; until then, setGraph and show just record what to draw
        let instance = null;
        const sketchFunction = (p) => {

            // colors that depend on the site's light/dark mode
            function theme() {
                const dark = document.documentElement.classList.contains("dark");
                return dark ? {
                    ink: "#f3f4f6", muted: "#9ca3af", edge: "#6b7280",
                    stroke: "#f3f4f6", slot: "#374151",
                    background: "#1f2937",  // the page's (bg-gray-800)
                } : {
                    ink: "#111827", muted: "#6b7280", edge: "#9ca3af",
                    stroke: "#000000", slot: "#e5e7eb",
                    background: "#ffffff",
                };
            }

            function computeLayout() {
                const xs = graph.nodes.map(n => n.x);
                const ys = graph.nodes.map(n => n.y);
                const minX = Math.min(...xs), maxX = Math.max(...xs);
                const minY = Math.min(...ys), maxY = Math.max(...ys);
                const pad = RADIUS + 12;

                // fit the graph to the canvas width, but not too tall
                const spanX = Math.max(maxX - minX, 1e-9);
                const spanY = Math.max(maxY - minY, 1e-9);
                let scale = Math.min((p.width - 2 * pad) / spanX, 340 / spanY, 90);
                const graphWidth = (maxX - minX) * scale;
                const graphHeight = (maxY - minY) * scale;
                const offsetX = (p.width - graphWidth) / 2;

                const positions = new Map(graph.nodes.map(n => [n.id, {
                    x: offsetX + (n.x - minX) * scale,
                    y: pad + (maxY - n.y) * scale,
                }]));

                // reserve room for the queue at its longest
                const ids = graph.nodes.map(n => n.id);
                queueLines = listLayout(ids.slice(0, longest), 0).lines;
                const graphBottom = graphHeight + 2 * pad;
                const height = graphBottom + 8
                    + queueLines * LIST_LINE + 12;
                return {positions, graphBottom, height};
            }

            function resize() {
                if (!ready) {
                    return;
                }
                // resize without redrawing (the third argument): resizeCanvas
                // otherwise redraws at once, before the layout is recomputed
                const width = Math.max(container.clientWidth, 280);
                p.resizeCanvas(width, p.height, true);
                if (graph) {
                    layout = computeLayout();
                    p.resizeCanvas(width, layout.height, true);
                }
            }

            // set the font of the queue's label, brackets and commas
            function listFont() {
                p.textFont(LIST_FAMILY);
                p.textStyle(p.BOLD);
                p.textSize(LIST_FONT);
            }

            // Where the parts of the queue go when it is drawn like a list,
            // e.g. "pending = [4, 3, 5]", with each item drawn as a small
            // node. Positions are relative to the first line, at y = 0; the
            // list wraps onto more lines if it is too wide for the canvas.
            function listLayout(items, x0) {
                listFont();
                const comma = p.textWidth(",") + 6;
                const start = x0 + p.textWidth(`${queueLabel} = [`) + 4;
                const right = p.width - 8 - p.textWidth("]");
                const positions = [], commas = [];
                let x = start, y = 0, lines = 1;
                items.forEach((id, i) => {
                    if (x + 2 * TOKEN > right && x > start) {
                        x = start;
                        y += LIST_LINE;
                        lines += 1;
                    }
                    positions.push({x: x + TOKEN, y});
                    x += 2 * TOKEN;
                    if (i < items.length - 1) {
                        commas.push({x: x + 1, y});
                        x += comma;
                    }
                });
                // an empty list is drawn "[]", without a gap
                const close = items.length > 0 ? {x: x + 4, y} : {x: start - 4, y};
                return {items: positions, commas, close, lines};
            }

            // Draw a list whose first line is at height `y`, animating from
            // `before` to `after`. Items in both slide to their new places as
            // `shiftT` goes from 0 to 1; each new item flies in from its node
            // as `enterT(item)` does; removed items fly out to their nodes as
            // `exitT` does. Items are drawn with the given status.
            function drawList(label, y, before, after, status,
                              {shiftT = 1, enterT = () => 1, exitT = 1} = {}) {
                const colors = theme();
                const x0 = 8;
                const at = (q) => ({x: q.x, y: y + q.y});
                const old = listLayout(before, x0);
                const now = listLayout(after, x0);

                // the brackets and commas fit the items that are in the list
                // at this point: removed items leave halfway through exitT, and
                // each new one arrives halfway through its enterT
                const kept = before.filter(id => after.includes(id));
                const arrived = after.filter(id => !before.includes(id) && enterT(id) >= 0.5);
                const frameItems = (exitT >= 0.5 ? kept : before).concat(arrived);
                const frame = listLayout(frameItems, x0);
                p.noStroke();
                p.fill(colors.ink);
                listFont();
                p.textAlign(p.LEFT, p.CENTER);
                p.text(`${label} = [`, x0, y);
                for (const c of frame.commas) {
                    p.text(",", c.x, y + c.y + 6);
                }
                p.text("]", frame.close.x, y + frame.close.y);
                p.textStyle(p.NORMAL);
                p.textFont("Arial");

                const fill = DemoGraphs.COLORS[status];
                const style = {radius: TOKEN};

                // removed items fly back to their nodes
                before.forEach((id, j) => {
                    if (after.includes(id) || exitT >= 1) {
                        return;
                    }
                    const pos = lerpPoint(at(old.items[j]), layout.positions.get(id), exitT);
                    drawNode(pos, fill, id, {...style,
                        radius: TOKEN + (RADIUS - TOKEN) * exitT, alpha: 255 * (1 - exitT * 0.6)});
                });

                after.forEach((id, i) => {
                    const j = before.indexOf(id);
                    if (j >= 0) {
                        drawNode(lerpPoint(at(old.items[j]), at(now.items[i]), shiftT), fill, id, style);
                    } else if (enterT(id) > 0) {
                        // new items fly in from their nodes, shrinking
                        const s = enterT(id);
                        const pos = lerpPoint(layout.positions.get(id), at(now.items[i]), s);
                        drawNode(pos, fill, id, {...style, radius: RADIUS + (TOKEN - RADIUS) * s});
                    }
                });
            }

            // 0 before time `a`, 1 after `a + length`, eased in between
            function phase(t, a, length) {
                if (length <= 0) {
                    return t >= a ? 1 : 0;
                }
                const s = Math.min(1, Math.max(0, (t - a) / length));
                return s * s * (3 - 2 * s);
            }

            // 0 before time `a`, 1 after `a + length`; in between, it rises
            // fast, overshoots 1 a little, and settles back (ease-out-back),
            // for a snappy motion
            function snap(t, a, length) {
                const x = Math.min(1, Math.max(0, (t - a) / length));
                const c1 = 1.70158, c3 = c1 + 1;
                return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
            }

            function lerpPoint(P, Q, s) {
                return {x: P.x + (Q.x - P.x) * s, y: P.y + (Q.y - P.y) * s};
            }

            // draw a node; `light` gives it a white label, for dark fills
            // `wash` in [0, 1] mixes the node's colors toward the background,
            // so it looks faded but stays opaque
            function drawNode(pos, fill, label,
                              {ring = 0, alpha = 255, radius = RADIUS, wash = 0,
                               light = fill === DemoGraphs.COLORS.visited} = {}) {
                const colors = theme();

                if (ring > 0) {
                    p.noFill();
                    const c = p.color(DemoGraphs.COLORS.accent);
                    c.setAlpha(255 * ring);
                    p.stroke(c);
                    p.strokeWeight(4);
                    p.circle(pos.x, pos.y, 2 * RADIUS + 12 + 4 * Math.sin(p.millis() / 200));
                }

                const background = p.color(colors.background);
                const washed = (c) => {
                    const mixed = p.lerpColor(p.color(c), background, wash);
                    mixed.setAlpha(alpha);
                    return mixed;
                };

                const f = washed(fill);
                const s = washed(colors.stroke);
                p.fill(f);
                p.stroke(s);
                p.strokeWeight(radius < RADIUS ? 2.5 : 3);
                p.circle(pos.x, pos.y, 2 * radius);

                p.noStroke();
                p.fill(washed(light ? "#ffffff" : "#000000"));
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(17 * radius / RADIUS);
                p.text(label, pos.x, pos.y + 1);
            }

            function drawArrowhead(tip, ux, uy, color) {
                const size = 12, w = size * 0.55;
                const baseX = tip.x - ux * size, baseY = tip.y - uy * size;
                p.noStroke();
                p.fill(color);
                p.triangle(tip.x, tip.y,
                    baseX - uy * w, baseY + ux * w,
                    baseX + uy * w, baseY - ux * w);
            }

            // draw edge (u, v); `progress` in [0, 1] is how much of it is
            // highlighted, starting from `from`
            function drawEdge(u, v, progress, from) {
                const colors = theme();
                const P = layout.positions.get(u), Q = layout.positions.get(v);
                const dx = Q.x - P.x, dy = Q.y - P.y;
                const len = Math.hypot(dx, dy);
                const ux = dx / len, uy = dy / len;
                const start = {x: P.x + ux * RADIUS, y: P.y + uy * RADIUS};
                const tip = {x: Q.x - ux * (RADIUS + 2), y: Q.y - uy * (RADIUS + 2)};
                const end = graph.directed
                    ? {x: tip.x - ux * 10, y: tip.y - uy * 10}
                    : {x: Q.x - ux * RADIUS, y: Q.y - uy * RADIUS};

                p.stroke(colors.edge);
                p.strokeWeight(2);
                p.line(start.x, start.y, end.x, end.y);
                if (graph.directed) {
                    drawArrowhead(tip, ux, uy, colors.edge);
                }

                if (progress > 0) {
                    // highlight from `from` toward the other end
                    const [a, b] = from === u ? [start, end] : [end, start];
                    const m = lerpPoint(a, b, progress);
                    p.stroke(colors.ink);
                    p.strokeWeight(4);
                    p.line(a.x, a.y, m.x, m.y);
                    if (graph.directed && progress >= 1) {
                        drawArrowhead(tip, ux, uy, colors.ink);
                    }
                }
            }

            p.setup = () => {
                p.createCanvas(Math.max(container.clientWidth, 280), 400);
                // p5 quotes the font name, so this must be a single family, not a CSS list
                p.textFont("Arial");
                if (typeof ResizeObserver !== "undefined") {
                    new ResizeObserver(resize).observe(container);
                }
                ready = true;
                resize();
            };

            p.windowResized = resize;

            p.draw = () => {
                const colors = theme();
                p.clear();
                if (!graph || !state || !layout) {
                    return;
                }

                const t = playing ? Math.min(to, from + performance.now() - started) : to;
                const plan = timeline;
                const animating = previous !== null && t < plan.end;
                const current = state.current;

                // how far along the popped node's move to the graph is
                const popT = animating ? phase(t, 0, plan.pop) : 1;

                // edges: each explored edge is drawn out in its turn
                for (const [u, v] of graph.edges) {
                    const key = DemoGraphs.edgeKey(graph, u, v);
                    const e = plan.edges.get(key);
                    if (e === undefined) {
                        drawEdge(u, v, 0, u);
                    } else {
                        drawEdge(u, v, animating ? phase(t, e.start, EDGE) : 1, current);
                    }
                }

                // the status a node is drawn with at this point in the step
                function shownStatus(id) {
                    const after = state.status.get(id);
                    if (!animating) {
                        return after;
                    }
                    const before = previous.status.get(id);
                    if (before === after) {
                        return after;
                    }
                    if (id === current && after === "visited") {
                        return t >= plan.visit + VISIT ? "visited" : before;
                    }
                    // a discovered node is pending once it has turned yellow
                    const fly = plan.flights.get(id);
                    return fly !== undefined && t >= fly ? after : before;
                }

                // nodes
                for (const node of graph.nodes) {
                    const status = shownStatus(node.id);
                    let fill = DemoGraphs.COLORS[status];

                    // a discovered node swells, fades from green to yellow at
                    // full size, stays big while it moves to the queue, and
                    // then shrinks back
                    let radius = RADIUS;
                    const turn = plan.turns.get(node.id);
                    if (animating && turn !== undefined && t >= turn) {
                        const grow = snap(t, turn, GROW);
                        const fade = phase(t, turn + GROW, FADE);
                        const shrink = phase(t, turn + TURN + FLY, SHRINK);
                        radius = RADIUS * (1 + SWELL * (grow - shrink));
                        if (status === "undiscovered") {
                            fill = p.lerpColor(p.color(DemoGraphs.COLORS.undiscovered),
                                p.color(DemoGraphs.COLORS.pending), fade);
                        }
                    }

                    // the visited node fades from yellow to red; its label
                    // turns white halfway, and its border turns solid
                    let light = status === "visited";
                    if (animating && node.id === current && status !== "visited"
                            && state.status.get(node.id) === "visited" && t >= plan.visit) {
                        const s = phase(t, plan.visit, VISIT);
                        fill = p.lerpColor(p.color(DemoGraphs.COLORS[status]),
                            p.color(DemoGraphs.COLORS.visited), s);
                        light = s >= 0.5;
                    }

                    // a neighbor already seen washes out halfway and back
                    let wash = 0;
                    const dim = plan.dims.get(node.id);
                    if (animating && dim !== undefined && t >= dim) {
                        const s = Math.min(1, (t - dim) / DIM);
                        wash = 0.5 * Math.sin(Math.PI * s);
                    }

                    drawNode(layout.positions.get(node.id), fill, node.id, {
                        radius,
                        wash,
                        light,
                        ring: node.id === current ? popT : 0,
                    });
                }

                // the queue, front first
                const queueY = layout.graphBottom + 8 + LIST_LINE / 2;
                drawList(queueLabel, queueY,
                    animating ? previous.queue : state.queue, state.queue, "pending", {
                        shiftT: popT,
                        exitT: popT,
                        enterT: (id) => {
                            const fly = plan.flights.get(id);
                            return !animating || fly === undefined ? 1 : phase(t, fly, FLY);
                        },
                    });
            };

            // expose a way to recompute the layout from outside
            p.demoResize = resize;
        };

        function start() {
            if (instance === null) {
                instance = new p5(sketchFunction, container);
            }
        }

        if (typeof p5 !== "undefined") {
            start();
        } else {
            document.getElementById("p5-script")?.addEventListener("load", start);
        }

        return {
            setGraph(newGraph, states) {
                graph = newGraph;
                state = states[0];
                longest = Math.max(1, ...states.map(s => s.queue.length));
                previous = null;
                layout = null;
                if (instance !== null) {
                    instance.demoResize();
                }
            },

            show(newState, previousState = null,
                 {from: start = 0, to: end = Infinity, animate = true} = {}) {
                previous = previousState;
                state = newState;
                timeline = plan(newState, previousState);
                from = start;
                to = Math.min(end, timeline.end);
                playing = animate;
                started = performance.now();
                return previousState === null || !animate ? 0 : to - from;
            },

            segments(newState, previousState) {
                return plan(newState, previousState).segments;
            },
        };
    },

    // Wire up Start / Back / Next / End / Play buttons and the arrow keys to
    // move through `count` steps. `show(i, previous)` is called with the step
    // to display, and the step it came from when moving forward by one (so
    // that the change can be animated), or null otherwise; it returns how
    // long its animation takes, in ms, so that Play can wait for it. Returns
    // an object whose `reset(count, start)` starts over with a new number of
    // steps, at step `start` (0 by default).
    stepper({first, back, next, last, play, counter}, count, show) {
        let i = 0;
        let timer = null;

        function render(previous) {
            const duration = show(i, previous) || 0;
            first.disabled = back.disabled = i === 0;
            next.disabled = last.disabled = i === count - 1;
            counter.textContent = `Step ${i} of ${count - 1}`;
            if (i === count - 1) {
                stop();
            }
            return duration;
        }

        function go(j) {
            const before = i;
            i = Math.max(0, Math.min(count - 1, j));
            return render(i === before + 1 ? before : null);
        }

        function stop() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            play.textContent = "Play";
        }

        first.addEventListener("click", () => { stop(); go(0); });
        back.addEventListener("click", () => { stop(); go(i - 1); });
        next.addEventListener("click", () => { stop(); go(i + 1); });
        last.addEventListener("click", () => { stop(); go(count - 1); });
        play.addEventListener("click", () => {
            if (timer !== null) {
                stop();
                return;
            }
            if (i === count - 1) {
                go(0);
            }
            play.textContent = "Pause";
            // take the next step once the last one's animation has finished
            function tick() {
                const duration = go(i + 1);
                if (timer !== null) {
                    timer = setTimeout(tick, duration + 600);
                }
            }
            timer = setTimeout(tick, 0);
        });

        document.addEventListener("keydown", (event) => {
            const tag = event.target.tagName;
            if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
                return;
            }
            if (event.key === "ArrowRight") {
                stop();
                go(i + 1);
                event.preventDefault();
            } else if (event.key === "ArrowLeft") {
                stop();
                go(i - 1);
                event.preventDefault();
            }
        });

        i = 0;
        render(null);

        return {
            position() {
                return i;
            },

            reset(newCount, start = 0) {
                stop();
                count = newCount;
                i = Math.max(0, Math.min(count - 1, start));
                render(null);
            },
        };
    },
};
