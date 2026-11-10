// The animated drawing for the DFS demo: the graph, and next to it (or below
// it, on a narrow screen) the tree of nested calls to dfs. Uses the helpers
// in ../common/graph.js, and animates a step the same way as the BFS demo.
//
// A state, as drawn here, has
//
//     status:   Map from node to "undiscovered" | "pending" | "visited"
//     calls:    the calls to dfs made so far, in the order they were made, as
//               {node, parent, depth, start, finish}: `parent` is the index
//               of the call that made it (-1 for full_dfs or the first call),
//               and `finish` is null until the call returns
//     stack:    indices into `calls` of the calls that haven't returned,
//               outermost first
//     current:  the node whose call is running at the end of the step, or
//               null
//     explorations: the edges explored in this step, in order, as
//               {v, key, discovered}
//     called:   the node dfs was called on in this step, or null
//     returned: the node whose call returned in this step, or null
//     clock:    the clock used for start and finish times, at the end of
//               the step

const DFSDrawing = {

    // Create the drawing inside the element `container`. Returns an object
    // like DemoGraphs.sketch's:
    //
    //     setGraph(graph, states, options)   draw a new graph, which will go
    //                                        through `states`, in the first
    //                                        one. options = {full, times}:
    //                                        whether the calls are made by
    //                                        full_dfs, and whether to show
    //                                        start and finish times
    //     show(state, previous, part)        as in DemoGraphs.sketch
    //     segments(state, previous)          as in DemoGraphs.sketch
    //
    // The animation of one step happens in order:
    //   1. one neighbor at a time, the edge to it is drawn out from the node
    //      being visited; a neighbor already seen washes out and back, and an
    //      undiscovered one swells, flies to a new line at the bottom of the
    //      call tree, the ring moves to it, and it turns pending;
    //   2. if the loop over the neighbors is done, the node turns visited,
    //      and the ring moves back to the call that made this one.
    sketch(container) {
        // how long each part of a step's animation takes, in milliseconds
        // (the same as in the BFS demo)
        const EDGE = 400;        // an edge is drawn out
        const GROW = 250;        // a discovered node swells, and later,
        const FADE = 675;        // at full size, fades from green to yellow
        const SWELL = 0.25;      // how much bigger it gets
        const SHRINK = 300;      // it shrinks back, once it has turned yellow
        const DIM = 900;         // a neighbor already seen washes out halfway
                                 // and back, since nothing happens to it
        const FLY = 500;         // a discovered node moves to the call tree
        const MOVE = 450;        // the ring moves to the next call
        const PAUSE = 500;       // between one neighbor and the next
        const VISIT = FADE;      // the node fades from yellow to red
        // with start and finish times shown, the clock ticks after a node
        // changes color: it grows, its number rolls over to the next one,
        // and it shrinks back. Then the node's time is set.
        const CLOCK_GROW = 300;
        const CLOCK_HOLD = 250;  // at full size, before the number rolls over
        const CLOCK_ROLL = 500;
        const CLOCK_SHOW = 250;  // with the new number, before shrinking back
        const CLOCK_SHRINK = 300;
        const CLOCK_PAUSE = 250; // before the node's time is set
        // when a node's time is set, it appears zoomed in, and shrinks back
        const STAMP_SCALE = 1.6; // how big it starts
        const STAMP_HOLD = 300;  // at that size
        const STAMP_SHRINK = 300;
        const STAMP = STAMP_HOLD + STAMP_SHRINK;
        const TICK = CLOCK_GROW + CLOCK_HOLD + CLOCK_ROLL + CLOCK_SHOW
            + CLOCK_SHRINK + CLOCK_PAUSE;
        const CLOCK_SCALE = 1.5; // how big the clock gets
        const RADIUS = 20;
        const FULL_ROW = 38;     // height of one line of the tree, at full size
        // the sizes of the tree, which shrinks if it has to fit (see scaleTree)
        let TOKEN = 15;          // radius of the nodes drawn in the tree
        let ROW = FULL_ROW;      // height of one line of the tree
        let INDENT = 30;         // how far each level of the tree is indented
        let treeFontSize = 18;
        const HEADER = 30;       // room for the tree's heading
        const CLOCK_ROOM = 48;   // room for the clock, above the graph
        const SIDE = 640;        // the narrowest canvas with the tree beside
                                 // the graph, rather than below it
        const TREE_FAMILY = "Courier New";
        const TREE_FONT = 18;

        let graph = null;
        let state = null;
        let previous = null;
        let options = {full: false, times: false};
        let started = -Infinity;  // when the current animation began
        let from = 0, to = 0;     // the part of it being played, in ms
        let playing = true;       // false: hold still at time `to`
        let timeline = plan(null, null);
        let layout = null;
        let ready = false;
        let rows = 1;             // lines reserved for the tree

        // When each part of the animation from `before` to `after` happens,
        // in ms from its start: when each explored edge starts being drawn
        // (edges, by key), when each discovered node starts swelling (swells)
        // and turning pending (turns), when each neighbor already seen starts
        // dimming (dims),
        // when the newly called node leaves for the tree (flight), when the
        // returning node changes color (visit), when the ring moves (move),
        // when the clock ticks (tick, or null), when the node's time is set
        // (stamp, or null), and the end. Also splits the animation into its
        // parts (segments): exploring each edge, calling dfs on a node, and
        // returning, with the clock's tick followed by the setting of the
        // time as a part of its own.
        function plan(after, before) {
            const edges = new Map(), swells = new Map(), turns = new Map(), dims = new Map();
            const none = {edges, swells, turns, dims, flight: null, visit: null,
                          tick: null, stamp: null, move: 0, end: 0, segments: [[0, 0]]};
            if (before === null) {
                return none;
            }
            const segments = [];
            let t = 0, flight = null, visit = null, move = 0, tick = null, stamp = null;

            // once a node has changed color, the clock (if it is shown) ticks
            // and then the node's time is set. This ends the part of the
            // animation that began at `start`, adds a part for the tick, and
            // starts one for setting the time, whose beginning is returned.
            function tickClock(start) {
                if (!options.times) {
                    return start;
                }
                segments.push([start, t]);
                tick = t;
                t += TICK;
                segments.push([tick, t]);
                stamp = t;
                t += STAMP;
                return stamp;
            }

            for (const e of after.explorations) {
                let start = t;
                edges.set(e.key, t);
                t += EDGE;
                if (e.discovered) {
                    // looking across the edge, the node swells; that is its
                    // own part, before the call
                    swells.set(e.v, t);
                    t += GROW;
                    segments.push([start, t]);
                    start = t;
                    flight = t;
                    t += FLY;
                    move = t;
                    t += MOVE;
                    turns.set(e.v, t);
                    t += FADE + SHRINK;
                    start = tickClock(start);
                } else {
                    dims.set(e.v, t);
                    t += DIM;
                }
                t += PAUSE;
                segments.push([start, t]);
            }

            // a call that isn't made by exploring an edge: the first call,
            // or one made by full_dfs
            if (after.called !== null && flight === null) {
                let start = t;
                swells.set(after.called, t);
                t += GROW;
                flight = t;
                t += FLY;
                move = t;
                t += MOVE;
                turns.set(after.called, t);
                t += FADE + SHRINK;
                start = tickClock(start);
                segments.push([start, t]);
            }

            if (after.returned !== null) {
                let start = t;
                visit = t;
                t += VISIT;
                start = tickClock(start);
                // going back up the call tree is its own part
                segments.push([start, t]);
                start = t;
                move = t;
                t += MOVE;
                segments.push([start, t]);
            }

            if (segments.length === 0) {
                segments.push([0, t]);
            }
            return {edges, swells, turns, dims, flight, visit, tick, stamp, move, end: t, segments};
        }

        // the line of the tree that call `i` is drawn on, and its depth: with
        // full_dfs, its call is the first line, and the others move down
        const line = (i) => options.full ? i + 1 : i;
        const depth = (call) => options.full ? call.depth + 1 : call.depth;

        let instance = null;
        const sketchFunction = (p) => {
            const paint = DemoGraphs.painter(p, {radius: RADIUS});
            const {theme, phase, snap, lerpPoint, drawNode, drawRing} = paint;

            function treeFont() {
                p.textFont(TREE_FAMILY);
                p.textStyle(p.BOLD);
                p.textSize(treeFontSize);
            }

            function scaleTree(scale) {
                TOKEN = 15 * scale;
                ROW = FULL_ROW * scale;
                INDENT = 30 * scale;
                treeFontSize = TREE_FONT * scale;
            }

            function computeLayout() {
                const side = p.width >= SIDE;
                const graphWidth = side ? Math.floor(p.width * 0.55) : p.width;
                // leave room above the graph for the clock, and above the
                // top nodes for their times
                const top = options.times ? CLOCK_ROOM + 22 : 0;
                // on a slide, the graph and the tree get only the height the
                // window has left (see DemoGraphs.embedHeight)
                const room = DemoGraphs.embedHeight(container);
                const maxHeight = room === null
                    ? 340 : Math.max(80, room - top - 2 * (RADIUS + 12));
                const fit = DemoGraphs.fitGraph(graph, {width: graphWidth, top, maxHeight, radius: RADIUS});
                fit.height += top;
                scaleTree(room === null || !side
                    ? 1 : Math.min(1, (room - HEADER - 12) / (rows * FULL_ROW)));
                const treeHeight = HEADER + rows * ROW + 8;
                const tree = side
                    ? {left: graphWidth + 16, top: 4}
                    : {left: 8, top: fit.height + 8};
                const height = side
                    ? Math.max(fit.height, treeHeight + 4)
                    : fit.height + 8 + treeHeight;
                const clock = {x: graphWidth / 2, y: CLOCK_ROOM / 2 + 4};
                return {positions: fit.positions, tree, clock, height};
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

            // where the parts of line `k` of the tree, at depth `d`, go
            function rowLayout(k, d) {
                treeFont();
                const x = layout.tree.left + d * INDENT;
                const y = layout.tree.top + HEADER + k * ROW + ROW / 2;
                const open = p.textWidth("dfs(");
                // room on either side of the node for the ring
                const token = {x: x + open + 9 + TOKEN, y};
                const close = token.x + TOKEN + 10;
                p.textFont("Arial");
                p.textStyle(p.NORMAL);
                return {x, y, token, close};
            }

            // draw edge (u, v); `progress` in [0, 1] is how much of it is
            // highlighted, starting from `from`
            function drawEdge(u, v, progress, from) {
                paint.drawEdge(layout.positions.get(u), layout.positions.get(v),
                    graph.directed, progress, from === u);
            }

            // draw the tree's heading, and full_dfs's line
            function drawTreeTop(colors, clock) {
                p.noStroke();
                p.fill(colors.muted);
                p.textFont("Arial");
                p.textStyle(p.BOLD);
                p.textSize(12);
                p.textAlign(p.LEFT, p.CENTER);
                p.text("FUNCTION CALLS", layout.tree.left, layout.tree.top + HEADER / 2 - 2);
                if (options.times) {
                    drawClock(colors, clock);
                }
                if (options.full) {
                    const r = rowLayout(0, 0);
                    treeFont();
                    p.fill(colors.ink);
                    p.text("full_dfs(graph)", r.x, r.y);
                }
            }

            // The clock, centered above the graph. `clock` =
            // {before, after, grow, roll}: while it ticks, it grows (and turns
            // purple) as `grow` goes from 0 to 1, and its number rolls over
            // from `before` to `after` as `roll` does: the old number slides
            // up and out, and the new one slides up into its place.
            function drawClock(colors, {before, after, grow, roll}) {
                const ctx = p.drawingContext;
                const y = layout.clock.y;
                const size = TREE_FONT * (1 + (CLOCK_SCALE - 1) * grow);
                const color = p.lerpColor(p.color(colors.ink),
                    p.color(DemoGraphs.COLORS.accent), grow);
                treeFont();
                p.textSize(size);
                p.noStroke();
                const digits = p.textWidth(String(Math.max(before, after)));
                const label = p.textWidth("clock = ");
                const right = layout.clock.x + (label + digits) / 2;

                // "clock = ", to the left of the number
                p.fill(color);
                p.textAlign(p.RIGHT, p.CENTER);
                p.text("clock = ", right - digits, y);

                // the number, clipped to its line while it rolls
                const height = size * 1.2;
                ctx.save();
                ctx.beginPath();
                ctx.rect(right - digits - 2, y - height / 2, digits + 4, height);
                ctx.clip();
                if (roll <= 0 || roll >= 1) {
                    p.text(String(roll >= 1 ? after : before), right, y);
                } else {
                    const old = p.color(color), now = p.color(color);
                    old.setAlpha(255 * (1 - roll));
                    now.setAlpha(255 * roll);
                    p.fill(old);
                    p.text(String(before), right, y - height * roll);
                    p.fill(now);
                    p.text(String(after), right, y + height * (1 - roll));
                }
                ctx.restore();
                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(TREE_FONT);
            }

            // the connector from a call's parent's line down to its own
            function drawConnector(parentLine, parentDepth, k, d, alpha, colors) {
                const parent = rowLayout(parentLine, parentDepth);
                const child = rowLayout(k, d);
                const c = p.color(colors.edge);
                c.setAlpha(255 * alpha);
                p.stroke(c);
                p.strokeWeight(2);
                p.noFill();
                const x = parent.x + 8;
                const top = parent.y + ROW / 2 - 6;
                p.line(x, top, x, child.y);
                p.line(x, child.y, child.x - 4, child.y);
            }

            // draw line `i` of the tree, the call `call`; `fill` is the
            // fill of its node, `alpha` in [0, 1] fades in its text,
            // `showToken` is false while its node is still flying there, and
            // `done` in [0, 1] grays out its text once the call has returned
            // (0 while it is running or waiting, 1 once it has returned),
            // `zoom` is how much its times are zoomed in, and `running` in
            // [0, 1] turns its text the purple of the ring while it is running
            function drawCall(call, i, fill, light, alpha, showToken, finishShown, colors, done = 0, zoom = 1, running = 0) {
                const r = rowLayout(line(i), depth(call));
                const gray = p.color(colors.edge);
                const ink = p.lerpColor(p.lerpColor(p.color(colors.ink), gray, done),
                    p.color(DemoGraphs.COLORS.accent), running);
                ink.setAlpha(255 * alpha);
                treeFont();
                p.noStroke();
                p.fill(ink);
                p.textAlign(p.LEFT, p.CENTER);
                treeFont();
                p.text("dfs(", r.x, r.y);
                p.text(")", r.close, r.y);
                if (options.times) {
                    const muted = p.lerpColor(p.color(colors.muted), gray, done);
                    muted.setAlpha(255 * alpha);
                    p.fill(muted);
                    p.textStyle(p.NORMAL);
                    const finish = finishShown ? call.finish : "?";
                    const x = r.close + p.textWidth(")") + 12;
                    p.textSize(treeFontSize * zoom);
                    p.text(`[${call.start}, ${finish}]`, x, r.y);
                    p.textSize(treeFontSize);
                }
                p.textFont("Arial");
                p.textStyle(p.NORMAL);
                if (showToken) {
                    drawNode(r.token, fill, call.node, {radius: TOKEN, light});
                }
            }

            p.setup = () => {
                p.createCanvas(Math.max(container.clientWidth, 280), 400);
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
                const actor = animating ? previous.current : state.current;
                const called = state.called;
                const returned = state.returned;

                // how far along the newly called node's flight to the tree
                // is, and the ring's move
                const flyT = animating && plan.flight !== null ? phase(t, plan.flight, FLY) : 1;
                const moveT = animating ? phase(t, plan.move, MOVE) : 1;
                const visitT = animating && plan.visit !== null ? phase(t, plan.visit, VISIT) : 1;

                // edges: each explored edge is drawn out in its turn
                for (const [u, v] of graph.edges) {
                    const key = DemoGraphs.edgeKey(graph, u, v);
                    const start = plan.edges.get(key);
                    if (start === undefined || previous === null) {
                        drawEdge(u, v, 0, u);
                    } else {
                        drawEdge(u, v, animating ? phase(t, start, EDGE) : 1,
                            previous.current);
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
                    if (id === returned) {
                        return visitT >= 1 ? after : before;
                    }
                    const turn = plan.turns.get(id);
                    return turn !== undefined && t >= turn + FADE ? after : before;
                }

                // nodes
                for (const node of graph.nodes) {
                    const status = shownStatus(node.id);
                    let fill = DemoGraphs.COLORS[status];

                    // the discovered node swells, stays big and green while
                    // it is called, fades to yellow, and then shrinks back
                    let radius = RADIUS;
                    const swell = plan.swells.get(node.id);
                    if (animating && swell !== undefined && t >= swell) {
                        const turn = plan.turns.get(node.id);
                        const grow = snap(t, swell, GROW);
                        const fade = phase(t, turn, FADE);
                        const shrink = phase(t, turn + FADE, SHRINK);
                        radius = RADIUS * (1 + SWELL * (grow - shrink));
                        if (status === "undiscovered") {
                            fill = p.lerpColor(p.color(DemoGraphs.COLORS.undiscovered),
                                p.color(DemoGraphs.COLORS.pending), fade);
                        }
                    }

                    // the returning node fades from yellow to red
                    let light = status === "visited";
                    if (animating && node.id === returned && status !== "visited"
                            && t >= plan.visit) {
                        fill = p.lerpColor(p.color(DemoGraphs.COLORS.pending),
                            p.color(DemoGraphs.COLORS.visited), visitT);
                        light = visitT >= 0.5;
                    }

                    // a neighbor already seen washes out halfway and back
                    let wash = 0;
                    const dim = plan.dims.get(node.id);
                    if (animating && dim !== undefined && t >= dim) {
                        const s = Math.min(1, (t - dim) / DIM);
                        wash = 0.5 * Math.sin(Math.PI * s);
                    }

                    drawNode(layout.positions.get(node.id), fill, node.id,
                        {radius, wash, light});
                }

                // whether call i's start and finish times are shown yet: a
                // time appears once it is set, after the clock has ticked.
                // (Strictly after: a small step that ends with the tick stops
                // at exactly that time, with the time not yet set.)
                const isNew = (i) => animating && i >= previous.calls.length;
                const set = () => plan.stamp !== null && t > plan.stamp;

                // how much call i's times are zoomed in: only while the
                // time that is being set shrinks back to its usual size
                const stampZoom = (i) => {
                    if (!animating || !set()
                            || !(isNew(i) || state.calls[i].node === returned)) {
                        return 1;
                    }
                    return 1 + (STAMP_SCALE - 1)
                        * (1 - phase(t, plan.stamp + STAMP_HOLD, STAMP_SHRINK));
                };
                const startShown = (i) => !isNew(i)
                    || (plan.stamp === null ? t >= plan.flight : set());
                const finishShown = (i) => {
                    const call = state.calls[i];
                    if (call.finish === null) {
                        return false;
                    }
                    if (animating && call.node === returned && previous.calls[i].finish === null) {
                        return plan.stamp === null ? visitT >= 0.5 : set();
                    }
                    return true;
                };

                // the start and finish times, above each node in the graph
                if (options.times) {
                    state.calls.forEach((call, i) => {
                        if (!startShown(i)) {
                            return;
                        }
                        const pos = layout.positions.get(call.node);
                        const finish = finishShown(i) ? call.finish : "?";
                        p.textFont("Arial");
                        p.textStyle(p.BOLD);
                        p.textSize(14 * stampZoom(i));
                        p.textAlign(p.CENTER, p.BOTTOM);
                        // a halo in the background color keeps the label
                        // readable over the edges
                        p.stroke(colors.background);
                        p.strokeWeight(4);
                        p.fill(colors.muted);
                        p.text(`[${call.start}, ${finish}]`, pos.x, pos.y - RADIUS - 11);
                        p.noStroke();
                        p.textStyle(p.NORMAL);
                    });
                }

                // the ring moves from the node whose call was running to the
                // one whose call is running now
                const ringFrom = actor === null ? null : layout.positions.get(actor);
                const ringTo = state.current === null ? null : layout.positions.get(state.current);
                if (!animating || ringFrom === null) {
                    if (ringTo !== null) {
                        drawRing(ringTo, animating ? moveT : 1);
                    }
                } else if (ringTo === null) {
                    drawRing(ringFrom, 1 - moveT);
                } else {
                    drawRing(lerpPoint(ringFrom, ringTo, moveT), 1);
                }

                // the call tree
                let clock = {before: state.clock, after: state.clock, grow: 0, roll: 1};
                if (animating && plan.tick !== null) {
                    const tick = plan.tick;
                    clock = {
                        before: previous.clock,
                        after: state.clock,
                        grow: phase(t, tick, CLOCK_GROW)
                            - phase(t, tick + CLOCK_GROW + CLOCK_HOLD + CLOCK_ROLL + CLOCK_SHOW,
                            CLOCK_SHRINK),
                        roll: phase(t, tick + CLOCK_GROW + CLOCK_HOLD, CLOCK_ROLL),
                    };
                }
                drawTreeTop(colors, clock);
                const calls = state.calls;

                // how much call i is the one running, in [0, 1]: this passes
                // from one call to the next as the ring moves
                const top = (s) => s.stack.length === 0 ? -1 : s.stack[s.stack.length - 1];
                const running = (i) => {
                    const after = top(state) === i ? 1 : 0;
                    if (!animating) {
                        return after;
                    }
                    const before = top(previous) === i ? 1 : 0;
                    return before + (after - before) * moveT;
                };

                // connectors first, so that they are under the nodes
                calls.forEach((call, i) => {
                    const alpha = isNew(i) ? flyT : 1;
                    if (alpha <= 0) {
                        return;
                    }
                    if (call.parent >= 0) {
                        const parent = calls[call.parent];
                        drawConnector(line(call.parent), depth(parent),
                            line(i), depth(call), alpha, colors);
                    } else if (options.full) {
                        drawConnector(0, 0, line(i), depth(call), alpha, colors);
                    }
                });

                calls.forEach((call, i) => {
                    const r = rowLayout(line(i), depth(call));
                    if (isNew(i)) {
                        // the call comes first: the node flies in from the
                        // graph, shrinking, and then turns pending there and
                        // in the graph together. Its start time is unknown
                        // until it is set.
                        if (flyT <= 0) {
                            return;
                        }
                        drawCall({...call, start: startShown(i) ? call.start : "?"},
                            i, null, false, flyT, false, false, colors, 0, stampZoom(i), running(i));
                        const pos = lerpPoint(layout.positions.get(call.node), r.token, flyT);
                        const turn = plan.turns.get(call.node);
                        const fill = p.lerpColor(p.color(DemoGraphs.COLORS.undiscovered),
                            p.color(DemoGraphs.COLORS.pending), phase(t, turn, FADE));
                        const big = RADIUS * (1 + SWELL);
                        drawNode(pos, fill, call.node,
                            {radius: big + (TOKEN - big) * flyT});
                        return;
                    }
                    let fill = DemoGraphs.COLORS[call.finish === null ? "pending" : "visited"];
                    let light = call.finish !== null;
                    // a call that has returned is grayed out, as its node
                    // turns red
                    let done = call.finish !== null ? 1 : 0;
                    if (animating && call.node === returned && previous.calls[i].finish === null) {
                        fill = p.lerpColor(p.color(DemoGraphs.COLORS.pending),
                            p.color(DemoGraphs.COLORS.visited), visitT);
                        light = visitT >= 0.5;
                        done = visitT;
                    }
                    drawCall(call, i, fill, light, 1, true, finishShown(i), colors, done, stampZoom(i), running(i));
                });

                // the ring in the tree moves along with the one in the graph
                const treeFrom = animating ? ringInTree(previous) : null;
                const treeTo = ringInTree(state);
                if (!animating || treeFrom === null) {
                    if (treeTo !== null) {
                        drawRing(treeTo, animating ? moveT : 1, TOKEN);
                    }
                } else if (treeTo === null) {
                    drawRing(treeFrom, 1 - moveT, TOKEN);
                } else {
                    drawRing(lerpPoint(treeFrom, treeTo, moveT), 1, TOKEN);
                }
            };

            // the position of the ring in the tree for a state: on the node
            // of the call at the top of the stack, or null if no call to dfs
            // is running
            function ringInTree(s) {
                if (s.stack.length === 0) {
                    return null;
                }
                const i = s.stack[s.stack.length - 1];
                return rowLayout(line(i), depth(s.calls[i])).token;
            }

            p.demoResize = resize;
        };

        DemoGraphs.startSketch(sketchFunction, container, (i) => { instance = i; });

        return {
            setGraph(newGraph, states, newOptions) {
                graph = newGraph;
                options = {...options, ...newOptions};
                state = states[0];
                const last = states[states.length - 1];
                rows = Math.max(1, last.calls.length + (options.full ? 1 : 0));
                previous = null;
                layout = null;
                if (instance !== null) {
                    instance.demoResize();
                }
            },

            // change the options without starting over
            setOptions(newOptions) {
                options = {...options, ...newOptions};
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
};
