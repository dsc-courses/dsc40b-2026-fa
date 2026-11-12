// The animated drawing for the Bellman-Ford demo: a weighted, directed graph
// with each node's estimated distance in a badge next to it, and a purple
// arrow to each node from its estimated predecessor. Uses the helpers in
// ../common/graph.js.
//
// A state, as drawn here, has
//
//     index:    its position in the list of states
//     est:      Map from node to its estimated distance (Infinity if none)
//     pred:     Map from node to its estimated predecessor, or null
//     edge:     the edge updated in this step, as [u, v, weight], or null
//     improved: whether that update changed est[v]
//     correct:  (optional) Map from node to its actual distance, to mark the
//               estimates that are correct

const BFDrawing = {

    // Create the drawing inside the element `container`. Returns an object
    // like DemoGraphs.sketch's:
    //
    //     setGraph(graph, states)          draw a new graph, in states[0]
    //     show(state, previous, part)      as in DemoGraphs.sketch
    //     markCorrect(on)                  whether to mark correct estimates
    //
    // The animation of one update, of the edge (u, v), happens in order:
    //   1. the edge is drawn out from u, in bold;
    //   2. if the update finds a shorter path to v, v swells, its estimate
    //      rolls over to the new one, the arrow from its old predecessor
    //      retracts, then the one from u is drawn out, and v shrinks back;
    //      otherwise v washes out and back, since nothing happens to it.
    // Between states that aren't consecutive (e.g. a whole iteration at a
    // time), every estimate that changed rolls over at once.
    sketch(container) {
        // how long each part of the animation takes, in milliseconds
        const EDGE = 450;        // the edge is drawn out
        const PAUSE = 300;       // before the result of the update
        const GROW = 250;        // v swells
        const ROLL = 500;        // its estimate rolls over
        const UNARROW = 600;     // the old predecessor arrow retracts, and
        const ARROW = 600;       // then the new one is drawn out
        const SHRINK = 300;      // v shrinks back
        const DIM = 900;         // v washes out and back
        const BACK = 600;        // then, on a purple edge, the bold edge
                                 // fades back to purple
        const SWELL = 0.12;      // how much bigger it gets
        const RADIUS = 20;
        const BADGE_H = 24;
        const BADGE_GAP = 6;     // between a node and its badge
        const CURVE = 0.22;      // how much an edge with a reverse edge bends
        const CORRECT = "#3f8f2a";

        let graph = null;
        let state = null;
        let previous = null;
        let started = -Infinity;
        let to = 0;
        let playing = true;
        let timeline = plan(null, null);
        let layout = null;
        let ready = false;
        let correct = false;

        // when each part of the animation from `before` to `after` happens
        function plan(after, before) {
            const none = {edge: null, swell: null, roll: null, unarrow: null, arrow: null,
                          shrink: null, dim: null, changed: new Set(), end: 0};
            if (before === null || after === null) {
                return none;
            }
            const changed = new Set([...after.est.keys()].filter(
                n => after.est.get(n) !== before.est.get(n)
                    || after.pred.get(n) !== before.pred.get(n)));
            // if a node's old predecessor arrow has to go, it fades out
            // first, and the new arrow is drawn out after it
            const replaced = [...changed].some(n => before.pred.get(n) !== null
                && before.pred.get(n) !== after.pred.get(n));
            const unarrowFor = replaced ? UNARROW : 0;
            if (after.index === before.index + 1 && after.edge !== null) {
                let t = EDGE + PAUSE;
                if (after.improved) {
                    const swell = t, roll = t + GROW, unarrow = roll + ROLL;
                    const arrow = unarrow + unarrowFor;
                    const shrink = arrow + ARROW;
                    return {...none, edge: 0, swell, roll, unarrow, arrow, shrink, changed,
                            end: shrink + SHRINK};
                }
                // on a purple edge, the bold edge then fades back to purple
                const [u, v] = after.edge;
                const back = after.pred.get(v) === u ? BACK : 0;
                return {...none, edge: 0, dim: t, end: t + DIM + back};
            }
            if (changed.size === 0) {
                return none;
            }
            const arrow = GROW + ROLL + unarrowFor;
            return {...none, swell: 0, roll: GROW, unarrow: GROW + ROLL, arrow,
                    shrink: arrow + ARROW, changed, end: arrow + ARROW + SHRINK};
        }

        // "∞", "−3", or "2"
        function format(x) {
            if (x === Infinity) {
                return "\u221E";
            }
            if (x === -Infinity) {
                return "\u2212\u221E";
            }
            return x < 0 ? `\u2212${-x}` : String(x);
        }

        let instance = null;
        const sketchFunction = (p) => {
            const paint = DemoGraphs.painter(p, {radius: RADIUS});
            const {theme, phase, snap} = paint;

            // The path of each edge, keyed by "u->v", as a polyline from
            // the edge of u's circle to the tip of the arrowhead at v. An
            // edge whose reverse is also in the graph bends to its right,
            // so that the two don't overlap.
            function edgePaths(positions) {
                const keys = new Set(graph.edges.map(([u, v]) => `${u}->${v}`));
                const paths = new Map();
                for (const [u, v, w, flip] of graph.edges) {
                    const P = positions.get(u), Q = positions.get(v);
                    const dx = Q.x - P.x, dy = Q.y - P.y;
                    const len = Math.hypot(dx, dy);
                    const n = {x: -dy / len, y: dx / len};
                    const bend = keys.has(`${v}->${u}`) ? CURVE : 0;
                    const C = {x: (P.x + Q.x) / 2 + n.x * bend * len,
                               y: (P.y + Q.y) / 2 + n.y * bend * len};
                    const at = (s) => ({
                        x: (1 - s) * (1 - s) * P.x + 2 * (1 - s) * s * C.x + s * s * Q.x,
                        y: (1 - s) * (1 - s) * P.y + 2 * (1 - s) * s * C.y + s * s * Q.y,
                    });
                    const points = [];
                    for (let k = 0; k <= 60; k++) {
                        const q = at(k / 60);
                        if (Math.hypot(q.x - P.x, q.y - P.y) >= RADIUS
                                && Math.hypot(q.x - Q.x, q.y - Q.y) >= RADIUS + 2) {
                            points.push(q);
                        }
                    }
                    const lengths = [0];
                    for (let k = 1; k < points.length; k++) {
                        lengths.push(lengths[k - 1] + Math.hypot(
                            points[k].x - points[k - 1].x, points[k].y - points[k - 1].y));
                    }
                    // the weight goes on the outside of a bent edge, and
                    // above (or to the left of) a straight one
                    const mid = at(0.5);
                    const side = (bend > 0 ? 1 : -1) * (flip === "flip" ? -1 : 1);
                    const label = {x: mid.x + side * n.x * 14, y: mid.y + side * n.y * 14};
                    paths.set(`${u}->${v}`, {points, lengths, total: lengths[lengths.length - 1],
                                             label, weight: w});
                }
                return paths;
            }

            // the point `d` pixels along a path, and the direction there
            function along(path, d) {
                const {points, lengths} = path;
                d = Math.max(0, Math.min(path.total, d));
                let k = 1;
                while (k < points.length - 1 && lengths[k] < d) {
                    k++;
                }
                const A = points[k - 1], B = points[k];
                const seg = lengths[k] - lengths[k - 1] || 1;
                const s = (d - lengths[k - 1]) / seg;
                const ux = (B.x - A.x) / seg, uy = (B.y - A.y) / seg;
                return {x: A.x + (B.x - A.x) * s, y: A.y + (B.y - A.y) * s, ux, uy};
            }

            // draw the first `progress` of a path, with an arrowhead of the
            // given size. If `moving`, the arrowhead is at the front of the
            // line as it is drawn out. Otherwise it stays at the end of the
            // path: the line stops at its base, and it fades in as the line
            // reaches it, so that it covers the gray arrowhead under it
            // smoothly, without a flash.
            function drawPath(path, progress, color, weight, {head = 12, moving = false} = {}) {
                if (progress <= 0) {
                    return;
                }
                const tipD = moving ? path.total * progress : path.total;
                const lineEnd = moving ? tipD - head * 0.7
                    : Math.min(path.total * progress, path.total - head * 0.7);
                const headAlpha = moving ? 1
                    : Math.min(1, Math.max(0, (path.total * progress - (path.total - head)) / (head * 0.3)));
                p.noFill();
                p.stroke(color);
                p.strokeWeight(weight);
                p.strokeCap(p.ROUND);
                p.beginShape();
                for (let k = 0; k < path.points.length && path.lengths[k] < lineEnd; k++) {
                    p.vertex(path.points[k].x, path.points[k].y);
                }
                const e = along(path, lineEnd);
                p.vertex(e.x, e.y);
                p.endShape();
                if (headAlpha > 0) {
                    const tip = along(path, tipD);
                    const w = head * 0.55;
                    const bx = tip.x - tip.ux * head, by = tip.y - tip.uy * head;
                    const c = p.color(color);
                    c.setAlpha(p.alpha(c) * headAlpha);
                    p.noStroke();
                    p.fill(c);
                    p.triangle(tip.x, tip.y, bx - tip.uy * w, by + tip.ux * w,
                        bx + tip.uy * w, by - tip.ux * w);
                }
            }

            function computeLayout() {
                const room = DemoGraphs.embedHeight(container);
                const pad = 2 * (RADIUS + BADGE_GAP + BADGE_H + 12);
                const maxHeight = room === null ? 300 : Math.max(80, room - pad - 8);
                const fit = DemoGraphs.fitGraph(graph, {
                    width: p.width,
                    maxHeight,
                    radius: RADIUS + BADGE_GAP + BADGE_H,
                });
                return {positions: fit.positions, height: fit.height,
                        paths: edgePaths(fit.positions)};
            }

            function resize() {
                if (!ready) {
                    return;
                }
                const width = Math.max(container.clientWidth, 280);
                p.resizeCanvas(width, p.height, true);
                if (graph) {
                    layout = computeLayout();
                    p.resizeCanvas(width, layout.height, true);
                }
            }

            // a node, labeled like "v" with a subscript "1"
            function drawNode(pos, id, radius, wash) {
                const colors = theme();
                const dark = document.documentElement.classList.contains("dark");
                const background = p.color(colors.background);
                const washed = (c) => p.lerpColor(p.color(c), background, wash);
                p.fill(washed(dark ? "#4b5563" : "#e5e7eb"));
                p.stroke(washed(colors.stroke));
                p.strokeWeight(3);
                p.circle(pos.x, pos.y, 2 * radius);

                const scale = radius / RADIUS;
                const m = /^([A-Za-z]+)(\d+)$/.exec(id);
                p.noStroke();
                p.fill(washed(colors.ink));
                p.textStyle(p.ITALIC);
                if (m === null) {
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(17 * scale);
                    p.text(id, pos.x, pos.y + 1);
                } else {
                    p.textSize(18 * scale);
                    const a = p.textWidth(m[1]);
                    p.textStyle(p.NORMAL);
                    p.textSize(12 * scale);
                    const b = p.textWidth(m[2]);
                    const left = pos.x - (a + b) / 2;
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(m[2], left + a, pos.y + 5 * scale);
                    p.textStyle(p.ITALIC);
                    p.textSize(18 * scale);
                    p.text(m[1], left, pos.y - 1 * scale);
                }
                p.textStyle(p.NORMAL);
            }

            // where a node's badge goes, given its width
            function badgeCenter(node, width) {
                const pos = layout.positions.get(node.id);
                const off = RADIUS + BADGE_GAP;
                switch (node.badge) {
                case "above": return {x: pos.x, y: pos.y - off - BADGE_H / 2};
                case "left": return {x: pos.x - off - width / 2, y: pos.y};
                case "right": return {x: pos.x + off + width / 2, y: pos.y};
                default: return {x: pos.x, y: pos.y + off + BADGE_H / 2};
                }
            }

            // the estimated distance of `node` in a badge; while `roll` goes
            // from 0 to 1, the old value slides up and out as the new one
            // slides in from below
            function drawBadge(node, oldValue, newValue, roll, isCorrect) {
                p.textStyle(p.BOLD);
                p.textSize(15);
                const width = Math.max(34, p.textWidth(format(oldValue)) + 16,
                    p.textWidth(format(newValue)) + 16);
                const c = badgeCenter(node, width);
                const value = roll < 0.5 ? oldValue : newValue;
                const fill = isCorrect ? CORRECT
                    : value === Infinity ? "#9ca3af" : DemoGraphs.COLORS.accent;
                p.fill(fill);
                p.stroke(theme().background);
                p.strokeWeight(2);
                p.rect(c.x - width / 2, c.y - BADGE_H / 2, width, BADGE_H, 7);

                const ctx = p.drawingContext;
                ctx.save();
                ctx.beginPath();
                ctx.rect(c.x - width / 2, c.y - BADGE_H / 2, width, BADGE_H);
                ctx.clip();
                p.noStroke();
                p.fill("#ffffff");
                p.textAlign(p.CENTER, p.CENTER);
                if (roll > 0 && roll < 1) {
                    p.text(format(oldValue), c.x, c.y + 1 - roll * BADGE_H);
                    p.text(format(newValue), c.x, c.y + 1 + (1 - roll) * BADGE_H);
                } else {
                    p.text(format(roll >= 1 ? newValue : oldValue), c.x, c.y + 1);
                }
                ctx.restore();
                p.textStyle(p.NORMAL);
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
                const colors = theme();
                p.clear();
                if (!graph || !state || !layout) {
                    return;
                }
                const t = playing ? Math.min(to, performance.now() - started) : to;
                const P = timeline;
                const animating = previous !== null && t < P.end;

                // the edges, in gray
                for (const path of layout.paths.values()) {
                    drawPath(path, 1, colors.edge, 2);
                }

                // the predecessor arrows; a changed one fades out, and its
                // replacement is drawn out (over the edge being updated, below)
                const accent = p.color(DemoGraphs.COLORS.accent);
                const updated = state.edge !== null && state.improved ? state.edge : null;
                for (const node of graph.nodes) {
                    const v = node.id;
                    const now = state.pred.get(v);
                    const was = animating ? previous.pred.get(v) : now;
                    // the old arrow retracts back to its old predecessor, the
                    // reverse of being drawn out
                    if (was !== now && was !== null && was !== undefined) {
                        drawPath(layout.paths.get(`${was}->${v}`),
                            1 - phase(t, P.unarrow, UNARROW), accent, 4, {moving: true});
                    }
                    if (now !== null && !(updated && updated[1] === v && was !== now)) {
                        const progress = was !== now ? phase(t, P.arrow, ARROW) : 1;
                        drawPath(layout.paths.get(`${now}->${v}`), progress, accent, 4,
                            {moving: was !== now});
                    }
                }

                // the edge being updated, drawn out in bold, over the
                // predecessor arrows, so that it shows even on a purple edge.
                // If it is a purple edge and the update changes nothing, it
                // fades back to purple once v has washed out and back.
                if (state.edge !== null) {
                    const [u, v] = state.edge;
                    const progress = animating && P.edge !== null ? phase(t, P.edge, EDGE) : 1;
                    const ink = p.color(colors.ink);
                    if (!state.improved && state.pred.get(v) === u) {
                        const fade = animating && P.dim !== null ? phase(t, P.dim + DIM, BACK) : 1;
                        ink.setAlpha(255 * (1 - fade));
                    }
                    drawPath(layout.paths.get(`${u}->${v}`), progress, ink, 4);
                }

                // if the update found a shorter path, the arrow from the new
                // predecessor is drawn out over it (even if it was already
                // the predecessor)
                if (updated !== null) {
                    const [u, v] = updated;
                    drawPath(layout.paths.get(`${u}->${v}`),
                        animating ? phase(t, P.arrow, ARROW) : 1, accent, 4, {moving: true});
                }

                // the weights, with a halo so that they stay readable
                p.textAlign(p.CENTER, p.CENTER);
                p.textStyle(p.BOLD);
                p.textSize(16);
                for (const path of layout.paths.values()) {
                    p.stroke(colors.background);
                    p.strokeWeight(5);
                    p.fill(colors.ink);
                    p.text(format(path.weight), path.label.x, path.label.y);
                }
                p.textStyle(p.NORMAL);

                // the badges, and then the nodes, so that a node that swells
                // is drawn on top of its badge
                const nodeDrawings = [];
                for (const node of graph.nodes) {
                    const id = node.id;
                    let radius = RADIUS, wash = 0, roll = 1;
                    const changed = animating && P.changed.has(id);
                    if (changed && P.swell !== null && t >= P.swell) {
                        const grow = snap(t, P.swell, GROW);
                        const shrink = phase(t, P.shrink, SHRINK);
                        radius = RADIUS * (1 + SWELL * (grow - shrink));
                    }
                    if (changed) {
                        roll = phase(t, P.roll, ROLL);
                    }
                    if (animating && P.dim !== null && state.edge && state.edge[1] === id
                            && t >= P.dim) {
                        wash = 0.5 * Math.sin(Math.PI * Math.min(1, (t - P.dim) / DIM));
                    }
                    const oldValue = changed ? previous.est.get(id) : state.est.get(id);
                    const newValue = state.est.get(id);
                    const shown = roll < 0.5 ? oldValue : newValue;
                    const isCorrect = correct && state.correct
                        && state.correct.get(id) === shown;
                    drawBadge(node, oldValue, newValue, roll, isCorrect);
                    nodeDrawings.push([layout.positions.get(id), id, radius, wash]);
                }
                for (const args of nodeDrawings) {
                    drawNode(...args);
                }
            };

            p.demoResize = resize;
        };

        DemoGraphs.startSketch(sketchFunction, container, (i) => { instance = i; });

        return {
            setGraph(newGraph, states) {
                graph = newGraph;
                state = states[0];
                previous = null;
                timeline = plan(null, null);
                layout = null;
                if (instance !== null) {
                    instance.demoResize();
                }
            },

            show(newState, previousState = null, {animate = true} = {}) {
                previous = previousState;
                state = newState;
                timeline = plan(newState, previousState);
                to = timeline.end;
                playing = animate;
                started = performance.now();
                return previousState === null || !animate ? 0 : to;
            },

            markCorrect(on) {
                correct = on;
            },
        };
    },
};
