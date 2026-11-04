// The BFS demo: choose a graph and a source, then step through BFS one
// iteration of the while loop at a time, as on the "Example" slide in
// Lecture 11. Uses DemoGraphs from ../common/graph.js and BFS_GRAPHS from
// ./graphs.js.

(function () {

    // HTML for a status word, colored as in the slides
    function statusWord(status) {
        return `<span class="demo-status ${status}">${status}</span>`;
    }

    // "a", "a and b", or "a, b, and c"
    function listNodes(nodes) {
        const bold = nodes.map(n => `<b>${n}</b>`);
        if (bold.length <= 2) {
            return bold.join(" and ");
        }
        return `${bold.slice(0, -1).join(", ")}, and ${bold[bold.length - 1]}`;
    }

    function ordinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Run BFS (or full BFS) on `graph` and record the state after every
    // iteration. Each state has
    //
    //     status:   Map from node to its status
    //     queue:    the pending nodes, oldest first
    //     order:    the nodes visited so far, in order
    //     current:  the node visited in this step, or null
    //     explored: Set of edge keys explored in this step
    //     explorations: the edges explored in this step, in order, as
    //               {v, key, discovered}: the neighbor, the edge's key, and
    //               whether exploring the edge discovered the neighbor
    //     dist:     Map from each discovered node to its distance from the
    //               source of its call to bfs, as recorded by BFS
    //     pred:     Map from each discovered node to its BFS predecessor
    //               (null for the source)
    //     caption:  HTML describing the step
    //     substeps: HTML describing each part of the step, for "small
    //               steps": popping the node, exploring each edge, and
    //               marking the node visited (one part for other steps)
    //
    // With `paths`, the captions also say what distance and predecessor are
    // recorded for each node that is discovered.
    function bfsStates(graph, source, full, paths) {
        const neighbors = DemoGraphs.neighbors(graph);
        const nodes = DemoGraphs.sortedNodes(graph);
        const status = new Map(nodes.map(n => [n, "undiscovered"]));
        const queue = [];
        const order = [];
        const dist = new Map();
        const pred = new Map();
        const states = [];
        let iteration = 0;
        let calls = 0;

        function record(caption, current = null, explorations = [], substeps = [caption]) {
            states.push({
                status: new Map(status),
                queue: [...queue],
                order: [...order],
                current,
                explored: new Set(explorations.map(e => e.key)),
                explorations,
                dist: new Map(dist),
                pred: new Map(pred),
                caption,
                substeps,
            });
        }

        const call = full ? "full_bfs(graph)" : `bfs(graph, ${source})`;
        record(`<p>Every node starts out ${statusWord("undiscovered")}.
            Click <b>Next</b> to call <code>${call}</code>.</p>`);

        // full BFS calls bfs on each undiscovered node, in the order of
        // graph.nodes; plain BFS calls it once, on the source
        const starts = full ? nodes : [source];

        for (const start of starts) {
            if (status.get(start) !== "undiscovered") {
                continue;
            }
            calls += 1;

            status.set(start, "pending");
            queue.push(start);
            dist.set(start, 0);
            pred.set(start, null);
            // with paths, recording the source's distance is a substep of
            // its own
            const recordStart = (caption) => {
                const note = `<p>Record <b>${start}</b>'s distance as 0. It has
                    no predecessor.</p>`;
                record(paths ? caption + note : caption, null, [],
                    paths ? [caption, note] : [caption]);
            };
            if (full && calls > 1) {
                recordStart(`<p>The queue is empty, so this call to <code>bfs</code> is done.
                    <code>full_bfs</code> continues looping over the nodes, and the next
                    ${statusWord("undiscovered")} one is <b>${start}</b>, so it calls
                    <code>bfs(graph, ${start}, status)</code>.</p>
                    <p>Before iterating: <b>${start}</b> is marked
                    ${statusWord("pending")} and added to the queue.</p>`);
            } else if (full) {
                recordStart(`<p><code>full_bfs</code> loops over the nodes. The first one,
                    <b>${start}</b>, is ${statusWord("undiscovered")}, so it calls
                    <code>bfs(graph, ${start}, status)</code>.</p>
                    <p>Before iterating: <b>${start}</b> is marked
                    ${statusWord("pending")} and added to the queue.</p>`);
            } else {
                recordStart(`<p>Before iterating: the source, <b>${start}</b>, is marked
                    ${statusWord("pending")} and added to the queue.</p>`);
            }

            while (queue.length > 0) {
                iteration += 1;
                const u = queue.shift();
                const explorations = [];
                const discovered = [];
                const alreadyPending = [];
                const alreadyVisited = [];

                for (const v of neighbors.get(u)) {
                    explorations.push({
                        v,
                        key: DemoGraphs.edgeKey(graph, u, v),
                        discovered: status.get(v) === "undiscovered",
                        was: status.get(v),
                    });
                    if (status.get(v) === "undiscovered") {
                        status.set(v, "pending");
                        queue.push(v);
                        dist.set(v, dist.get(u) + 1);
                        pred.set(v, u);
                        discovered.push(v);
                    } else if (status.get(v) === "pending") {
                        alreadyPending.push(v);
                    } else {
                        alreadyVisited.push(v);
                    }
                }
                status.set(u, "visited");
                order.push(u);

                const kind = graph.directed ? "successors" : "neighbors";
                const lines = [`<p><b>${ordinal(iteration)} iteration.</b>
                    Pop <b>${u}</b> from the front of the queue and visit it.</p>`];

                const all = neighbors.get(u);
                if (all.length === 0) {
                    lines.push(`<p><b>${u}</b> has no ${kind}, so no edges are explored.</p>`);
                } else {
                    const parts = [];
                    if (discovered.length > 0) {
                        parts.push(`${listNodes(discovered)}
                            ${discovered.length === 1 ? "was" : "were"}
                            ${statusWord("undiscovered")}, so
                            ${discovered.length === 1 ? "it is" : "they are"}
                            now ${statusWord("pending")} and added to the back
                            of the queue${paths ? `, with distance ${dist.get(u) + 1}
                            and predecessor <b>${u}</b>` : ""}`);
                    }
                    if (alreadyPending.length > 0) {
                        parts.push(`${listNodes(alreadyPending)}
                            ${alreadyPending.length === 1 ? "is" : "are"} already
                            ${statusWord("pending")}`);
                    }
                    if (alreadyVisited.length > 0) {
                        parts.push(`${listNodes(alreadyVisited)}
                            ${alreadyVisited.length === 1 ? "is" : "are"} already
                            ${statusWord("visited")}`);
                    }
                    lines.push(`<p>Explore the edges to its ${kind}
                        (${listNodes(all)}, in sorted order): ${parts.join("; ")}.</p>`);
                }
                lines.push(`<p>Mark <b>${u}</b> as ${statusWord("visited")}.</p>`);

                // the same, one part at a time
                const kindOne = graph.directed ? "successor" : "neighbor";
                const substeps = [`<p><b>${ordinal(iteration)} iteration.</b>
                    Pop <b>${u}</b> from the front of the queue to visit it.
                    Next, explore the edges to its ${kind}
                    ${all.length > 0 ? `(${listNodes(all)}), in sorted order` : ""}.</p>`];
                for (const e of explorations) {
                    if (e.discovered) {
                        substeps.push(`<p>Explore the edge from <b>${u}</b> to its
                            ${kindOne} <b>${e.v}</b>. It was ${statusWord("undiscovered")},
                            so mark it ${statusWord("pending")} and add it to the back
                            of the queue.</p>`);
                        // with paths, recording its distance and predecessor
                        // is a substep of its own
                        if (paths) {
                            substeps.push(`<p>Record <b>${e.v}</b>'s distance as
                                ${dist.get(u)} + 1 = ${dist.get(e.v)}, and its
                                predecessor as <b>${u}</b>.</p>`);
                        }
                    } else {
                        substeps.push(`<p>Explore the edge from <b>${u}</b> to its
                            ${kindOne} <b>${e.v}</b>. It is already
                            ${statusWord(e.was)}, so there's nothing to do.</p>`);
                    }
                }
                substeps.push(all.length === 0
                    ? `<p><b>${u}</b> has no ${kind}, so no edges are explored.
                        Mark <b>${u}</b> as ${statusWord("visited")}.</p>`
                    : `<p>That was <b>${u}</b>'s last ${kindOne}. Mark <b>${u}</b>
                        as ${statusWord("visited")}.</p>`);

                record(lines.join(""), u, explorations, substeps);
            }
        }

        // the end of the search is a step of its own, in which no node is
        // being visited and no edges are explored
        const never = nodes.filter(n => status.get(n) === "undiscovered");
        let ending;
        if (full) {
            ending = `<p>The queue is empty, and every node has been visited,
                so <code>full_bfs</code> is done. It called <code>bfs</code>
                ${calls} time${calls === 1 ? "" : "s"}.</p>`;
        } else if (never.length > 0) {
            ending = `<p>The queue is empty, so <code>bfs</code> is done.
                ${listNodes(never)} ${never.length === 1 ? "was" : "were"} never
                discovered: ${never.length === 1 ? "it isn't" : "they aren't"}
                reachable from <b>${source}</b>. (Check “full BFS” to
                visit every node.)</p>`;
        } else {
            ending = `<p>The queue is empty, so <code>bfs</code> is done.</p>`;
        }
        record(ending);

        return states;
    }

    // ---------------------------------------------------------------------

    const root = document.getElementById("bfs-demo");
    const $ = (selector) => root.querySelector(selector);

    const graphSelect = $("#bfs-graph");
    const sourceSelect = $("#bfs-source");
    const fullCheckbox = $("#bfs-full");
    const smallCheckbox = $("#bfs-small");
    const pathsCheckbox = $("#bfs-paths");
    DemoGraphs.optionsMenu($("#bfs-options"));
    const description = $("#bfs-description");
    const caption = $("#bfs-caption");

    // fill in the menu first, so that the controls work even if the drawing
    // fails
    for (const graph of BFS_GRAPHS) {
        const option = document.createElement("option");
        option.value = graph.id;
        option.textContent = graph.name;
        graphSelect.append(option);
    }

    const drawing = DemoGraphs.sketch($("#bfs-canvas"));

    let graph = null;
    let states = [];
    let stepper = null;

    // What each click of Next shows: a whole BFS step, or with "small steps"
    // one part of one (popping a node, exploring an edge, or marking a node
    // visited). Each frame is {state, from, to, caption}: the state's
    // animation is played from time `from` to `to`, in ms.
    let frames = [];

    function buildFrames() {
        frames = [];
        states.forEach((state, i) => {
            const previous = i === 0 ? null : states[i - 1];
            if (!smallCheckbox.checked) {
                frames.push({state: i, from: 0, to: Infinity, caption: state.caption});
                return;
            }
            const segments = drawing.segments(state, previous);
            segments.forEach(([from, to], k) => {
                frames.push({state: i, from, to, caption: state.substeps[k] ?? state.caption});
            });
        });
    }

    // show frame k; `previous` is the frame before it, when moving forward
    // one frame, so that the change is animated
    function show(k, previous) {
        const frame = frames[k];
        const state = states[frame.state];
        const before = frame.state === 0 ? null : states[frame.state - 1];
        caption.innerHTML = frame.caption;
        return drawing.show(state, before, {
            from: frame.from,
            to: frame.to,
            animate: previous !== null,
        });
    }

    function rebuild() {
        const full = fullCheckbox.checked;
        sourceSelect.disabled = full;
        states = bfsStates(graph, sourceSelect.value, full, pathsCheckbox.checked);
        drawing.setGraph(graph, states);
        drawing.showPaths(pathsCheckbox.checked);
        $("#bfs-paths-legend").hidden = !pathsCheckbox.checked;
        buildFrames();
        if (stepper === null) {
            stepper = DemoGraphs.stepper({
                first: $("#bfs-first"),
                back: $("#bfs-back"),
                next: $("#bfs-next"),
                last: $("#bfs-last"),
                play: $("#bfs-play"),
                counter: $("#bfs-counter"),
            }, frames.length, show);
        } else {
            stepper.reset(frames.length);
        }
    }

    // switching between whole and small steps, or showing or hiding the
    // shortest paths, keeps the same BFS step
    function toggleSmallSteps() {
        const now = frames[stepper.position()];
        buildFrames();
        const k = frames.findLastIndex(f => f.state === now.state);
        stepper.reset(frames.length, k);
    }

    function chooseGraph(id) {
        graph = BFS_GRAPHS.find(g => g.id === id);
        description.textContent = graph.description;

        sourceSelect.replaceChildren();
        for (const node of DemoGraphs.sortedNodes(graph)) {
            const option = document.createElement("option");
            option.value = node;
            option.textContent = node;
            sourceSelect.append(option);
        }
        sourceSelect.value = graph.source;
        rebuild();
    }

    graphSelect.addEventListener("change", () => chooseGraph(graphSelect.value));
    sourceSelect.addEventListener("change", rebuild);
    fullCheckbox.addEventListener("change", rebuild);
    smallCheckbox.addEventListener("change", toggleSmallSteps);
    pathsCheckbox.addEventListener("change", () => {
        // the steps stay the same, only their captions change
        states = bfsStates(graph, sourceSelect.value, fullCheckbox.checked,
            pathsCheckbox.checked);
        drawing.showPaths(pathsCheckbox.checked);
        $("#bfs-paths-legend").hidden = !pathsCheckbox.checked;
        toggleSmallSteps();
    });

    // on a lecture slide (see "embedding" in demos.css), start with small steps
    if (document.documentElement.classList.contains("demo-embed")) {
        smallCheckbox.checked = true;
    }

    chooseGraph(BFS_GRAPHS[0].id);
})();
