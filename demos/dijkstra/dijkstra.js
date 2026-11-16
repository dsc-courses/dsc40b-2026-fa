// The Dijkstra's algorithm demo: choose a graph, then step through the
// priority-queue version of Dijkstra's algorithm from Lecture 15, one
// extract_min or update at a time (or one iteration of the while loop at a
// time), watching the estimated distances, the predecessors, and the
// priority queue change. Uses DemoGraphs from ../common/graph.js,
// WeightedDrawing from ../common/weighted.js, and DIJKSTRA_GRAPHS from
// ./graphs.js.

(function () {

    // "∞", "−3", or "2"
    function format(x) {
        if (x === Infinity) {
            return "∞";
        }
        return x < 0 ? `−${-x}` : String(x);
    }

    // a weight in a sum: "2", or "(−1)"
    const term = (w) => (w < 0 ? `(${format(w)})` : format(w));

    // HTML for a node's name, like u<sub>1</sub>
    function name(id) {
        const m = /^([A-Za-z]+)(\d+)$/.exec(id);
        return m === null ? `<i>${id}</i>` : `<i>${m[1]}</i><sub>${m[2]}</sub>`;
    }

    // HTML for a list of nodes: "u1", "u1 and u2", or "u1, u2, and u3"
    function listNames(ids) {
        const names = ids.map(name);
        if (names.length <= 2) {
            return names.join(" and ");
        }
        return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    }

    // The actual shortest distances from `source` and a predecessor on a
    // shortest path to each node, found with Bellman-Ford (the demo's graphs
    // have no negative cycles).
    function shortestPaths(graph, source) {
        const dist = new Map(graph.nodes.map(n => [n.id, Infinity]));
        const pred = new Map(graph.nodes.map(n => [n.id, null]));
        dist.set(source, 0);
        for (let i = 1; i < graph.nodes.length; i++) {
            for (const [u, v, w] of graph.edges) {
                if (dist.get(u) + w < dist.get(v)) {
                    dist.set(v, dist.get(u) + w);
                    pred.set(v, u);
                }
            }
        }
        return {dist, pred};
    }

    // the nodes in the priority queue, smallest estimate first (ties
    // broken by name, the order extract_min uses here)
    function byPriority(nodes, est) {
        return [...nodes].sort((a, b) => est.get(a) === est.get(b)
            ? DemoGraphs.compareNodes(a, b) : est.get(a) < est.get(b) ? -1 : 1);
    }

    // Run Dijkstra's algorithm on `graph` and record the state after every
    // step (see ../common/weighted.js for what a state holds). A step is
    // either a call to extract_min, which takes a node out of the priority
    // queue, or a call to update along one of that node's edges. Each state
    // also has `queue` (the nodes in the priority queue, smallest priority
    // first, as ../common/weighted.js draws it), `iteration` (of
    // the while loop: 1, 2, ...), `caption` (HTML describing the step),
    // `substeps` (for an update that finds a shorter path, the caption for
    // each part of its animation, for small steps; otherwise null).
    function dijkstraStates(graph, source) {
        const nodes = DemoGraphs.sortedNodes(graph);
        const neighbors = DemoGraphs.neighbors(graph);
        const weight = new Map(graph.edges.map(([u, v, w]) => [`${u}->${v}`, w]));
        const negative = graph.edges.some(([u, v, w]) => w < 0);
        const truth = shortestPaths(graph, source);
        const est = new Map(nodes.map(id => [id, Infinity]));
        const pred = new Map(nodes.map(id => [id, null]));
        est.set(source, 0);
        const queue = new Set(nodes);
        const visited = new Set();
        const states = [];

        function record(fields) {
            states.push({
                index: states.length,
                est: new Map(est),
                pred: new Map(pred),
                queue: byPriority(queue, est),
                visited: new Set(visited),
                current: null,
                edge: null,
                improved: false,
                iteration: 0,
                correct: truth.dist,
                ...fields,
            });
        }

        record({
            caption: `<p>Every estimate starts at ∞, except the source's:
                <code>est[${name(source)}] = 0</code>. No predecessors are known yet.</p>
                <p><code>PriorityQueue(est)</code> puts every node in the priority
                queue, with its estimate as its priority.</p>`,
        });

        let iteration = 0;
        while (queue.size > 0) {
            iteration += 1;
            const u = byPriority(queue, est)[0];
            queue.delete(u);
            visited.add(u);
            const out = neighbors.get(u);

            // extract_min
            const tied = [...queue].filter(x => est.get(x) === est.get(u));
            let popCaption = `<p><code>priority_queue.extract_min()</code> returns
                ${name(u)}: of the nodes in the priority queue, it has the smallest
                estimate, <code>est[${name(u)}] = ${format(est.get(u))}</code>${tied.length > 0
                    ? ` (tied with ${listNames(tied)}; ties are broken alphabetically here)` : ""}.</p>`;
            let verdict;
            if (est.get(u) === Infinity) {
                verdict = `<p>No path to ${name(u)} has been found, and none will be:
                    ${name(u)} isn't reachable from ${name(source)}.</p>`;
            } else if (!negative) {
                verdict = u === source
                    ? `<p>That's correct: the source is at distance 0 from itself.</p>`
                    : `<p>Since every edge weight is positive, this estimate is correct:
                        the shortest path from ${name(source)} to ${name(u)} has length
                        ${format(est.get(u))}.</p>`;
            } else if (truth.dist.get(u) === est.get(u)) {
                verdict = `<p>Dijkstra's algorithm treats this estimate as final. Here it
                    happens to be correct, but since this graph has a negative edge
                    weight, nothing guarantees it.</p>`;
            } else {
                verdict = `<p>Dijkstra's algorithm treats this estimate as final, but it's
                    <b>wrong</b>: the shortest path from ${name(source)} to ${name(u)} has
                    length ${format(truth.dist.get(u))}. The proof that the estimate is
                    correct needs every edge weight to be positive, and this graph has a
                    negative one.</p>`;
            }
            const plan = out.length === 0
                ? `<p>${name(u)} has no outgoing edges, so there's nothing to update.</p>`
                : `<p>Next, update each edge out of ${name(u)}: to ${listNames(out)}.</p>`;
            record({current: u, iteration, kind: "pop",
                    caption: popCaption + verdict + plan});

            // update each edge out of u
            for (const v of out) {
                const w = weight.get(`${u}->${v}`);
                const old = est.get(v);
                const candidate = est.get(u) + w;
                const improved = candidate < old;
                const call = `<code>update(${name(u)}, ${name(v)})</code>`;
                const sum = `est[${name(u)}] + ${term(w)} = ${format(est.get(u))} + ${term(w)}
                    = ${format(candidate)}`;
                let caption;
                if (est.get(u) === Infinity) {
                    caption = `<p>${call}: no path to ${name(u)} has been found
                        (<code>est[${name(u)}] = ∞</code>), so going through
                        ${name(u)} can't give a shorter path to ${name(v)}.
                        Nothing changes.</p>`;
                } else if (improved) {
                    caption = `<p>${call}: the path to ${name(u)} found so far,
                        followed by the edge (${name(u)}, ${name(v)}), has length
                        ${sum}. That's shorter than the best path to ${name(v)}
                        found so far, of length ${format(old)}.</p>
                        <p>So set <code>est[${name(v)}] = ${format(candidate)}</code>
                        and <code>pred[${name(v)}] = ${name(u)}</code>.</p>`;
                    if (visited.has(v)) {
                        caption += `<p>But ${name(v)} has already been taken out of the
                            priority queue, so it has no priority to change, and
                            Dijkstra's algorithm will never update the edges out of
                            ${name(v)} again. Its new estimate can't reach the nodes
                            after it.</p>`;
                    } else {
                        caption += `<p><code>update</code> returns <code>True</code>, so
                            <code>priority_queue.change_priority(${name(v)}, ${format(candidate)})</code>.</p>`;
                    }
                } else {
                    caption = `<p>${call}: going through ${name(u)} gives a path to
                        ${name(v)} of length ${sum}. That's no shorter than the best
                        path to ${name(v)} found so far, of length ${format(old)},
                        so nothing changes.</p>`;
                }
                // the same, one part at a time (see segments in
                // ../common/weighted.js), each with what came before it
                let substeps = null;
                if (improved && est.get(u) !== Infinity) {
                    const orderBefore = byPriority(queue, est);
                    const after = new Map(est).set(v, candidate);
                    const orderAfter = byPriority(queue, after);
                    const passed = orderBefore.filter(x => x !== v
                        && orderBefore.indexOf(x) < orderBefore.indexOf(v)
                        && orderAfter.indexOf(x) > orderAfter.indexOf(v));
                    const parts = [
                        `<p>${call}: the path to ${name(u)} found so far, followed by the
                            edge (${name(u)}, ${name(v)}), has length ${sum}. That's
                            shorter than the best path to ${name(v)} found so far, of
                            length ${format(old)}.</p>`,
                        `<p>So set <code>est[${name(v)}] = ${format(candidate)}</code>.</p>`,
                        `<p>And set <code>pred[${name(v)}] = ${name(u)}</code>.</p>`
                            + (visited.has(v) ? `<p>But ${name(v)} has already been taken
                                out of the priority queue, so it has no priority to change,
                                and Dijkstra's algorithm will never update the edges out of
                                ${name(v)} again.</p>` : ""),
                    ];
                    if (!visited.has(v)) {
                        parts.push(`<p><code>update</code> returns <code>True</code>, so
                            <code>priority_queue.change_priority(${name(v)},
                            ${format(candidate)})</code>.${passed.length > 0
                                ? ` With its new priority, ${name(v)} moves ahead of
                                    ${listNames(passed)} in the priority queue.` : ""}</p>`);
                    }
                    substeps = parts.map((_, k) => parts.slice(0, k + 1).join(""));
                }
                if (improved) {
                    est.set(v, candidate);
                    pred.set(v, u);
                } else {
                }
                record({current: u, iteration, kind: "update", edge: [u, v, w], improved,
                        caption, substeps});
            }

        }

        // describe the result
        const last = states[states.length - 1];
        const wrong = nodes.filter(id => est.get(id) !== truth.dist.get(id));
        let ending = `<p>The priority queue is empty, so Dijkstra's algorithm is done.</p>`;
        if (wrong.length === 0) {
            ending += `<p>The estimates are the shortest distances from ${name(source)},
                and following the purple arrows backward gives the shortest paths.</p>`;
        } else {
            const examples = wrong.map(id => {
                const path = [id];
                while (truth.pred.get(path[0]) !== null) {
                    path.unshift(truth.pred.get(path[0]));
                }
                const weights = path.slice(1).map((v, k) => weight.get(`${path[k]}->${v}`));
                return `<code>est[${name(id)}] = ${format(est.get(id))}</code>, but the
                    shortest path from ${name(source)} to ${name(id)} is
                    ${path.map(name).join(" → ")}, of length
                    ${weights.map(term).join(" + ")} = ${format(truth.dist.get(id))}`;
            });
            ending += `<p>But this graph has a negative edge weight, and ${wrong.length === 1
                ? "one estimate is" : "some estimates are"} <b>wrong</b>:
                ${examples.join("; ")}.</p>
                <p>Once a node is taken out of the priority queue, Dijkstra's algorithm
                never updates the edges out of it again. So when a shorter path to an
                already visited node is found later, the nodes after it never get
                the benefit.</p>`;
        }
        last.caption += ending;
        if (last.substeps) {
            last.substeps[last.substeps.length - 1] += ending;
        }
        last.done = true;
        return {states, iterations: iteration};
    }

    // ---------------------------------------------------------------------

    const root = document.getElementById("dj-demo");
    const $ = (selector) => root.querySelector(selector);

    const graphSelect = $("#dj-graph");
    const smallCheckbox = $("#dj-small");
    const correctCheckbox = $("#dj-correct");
    DemoGraphs.optionsMenu($("#dj-options"));
    const description = $("#dj-description");
    const caption = $("#dj-caption");
    const iterationLabel = $("#dj-iteration");

    for (const graph of DIJKSTRA_GRAPHS) {
        const option = document.createElement("option");
        option.value = graph.id;
        option.textContent = graph.name;
        graphSelect.append(option);
    }

    const drawing = WeightedDrawing.sketch($("#dj-canvas"));

    let graph = null;
    let run = null;
    // What each click of Next shows: one step (an extract_min or an
    // update), or, with small steps (the default), one
    // part of a step (see segments in ../common/weighted.js). Each frame is
    // {state, from, to, caption}: the state's index, and the part of its
    // animation to play, in ms.
    let frames = [];
    let stepper = null;

    function buildFrames() {
        frames = [];
        for (const state of run.states) {
            const before = state.index === 0 ? null : run.states[state.index - 1];
            if (smallCheckbox.checked && state.substeps) {
                drawing.segments(state, before).forEach(([from, to], k) => {
                    frames.push({state: state.index, from, to,
                                 caption: state.substeps[k] ?? state.caption});
                });
            } else {
                frames.push({state: state.index, from: 0, to: Infinity, caption: state.caption});
            }
        }
    }

    function show(k, previous) {
        const frame = frames[k];
        const state = run.states[frame.state];
        // the state the animation starts from: the one just before this one
        // (none, without animating, for a whole step that isn't played)
        const before = state.index === 0 || (previous === null && frame.to === Infinity)
            ? null : run.states[state.index - 1];

        iterationLabel.innerHTML = state.iteration === 0
            ? "Before the while loop"
            : `Iteration ${state.iteration} of ${run.iterations}: ${name(state.current)}`;

        caption.innerHTML = frame.caption;
        return drawing.show(state, before, {
            from: frame.from,
            to: frame.to,
            animate: previous !== null,
        });
    }

    function rebuild(keep = false) {
        const at = keep && stepper ? frames[stepper.position()].state : 0;
        run = dijkstraStates(graph, graph.source);
        drawing.markCorrect(correctCheckbox.checked);
        drawing.setGraph(graph, run.states);
        buildFrames();
        // keep the same place, as nearly as possible
        const start = Math.max(0, frames.findLastIndex(f => f.state <= at));
        if (stepper === null) {
            stepper = DemoGraphs.stepper({
                first: $("#dj-first"),
                back: $("#dj-back"),
                next: $("#dj-next"),
                last: $("#dj-last"),
                play: $("#dj-play"),
                counter: $("#dj-counter"),
            }, frames.length, show, {busy: true});
        } else {
            stepper.reset(frames.length, start);
        }
    }

    function chooseGraph(id) {
        graph = DIJKSTRA_GRAPHS.find(g => g.id === id);
        description.textContent = graph.description;
        rebuild();
    }

    graphSelect.addEventListener("change", () => chooseGraph(graphSelect.value));
    smallCheckbox.addEventListener("change", () => rebuild(true));
    correctCheckbox.addEventListener("change", () => {
        drawing.markCorrect(correctCheckbox.checked);
    });

    // options from the URL, e.g. for a lecture slide:
    // ?graph=<id>&small=0&correct (small steps are on unless small=0)
    const params = new URLSearchParams(location.search);
    smallCheckbox.checked = params.get("small") !== "0";
    correctCheckbox.checked = params.has("correct");
    const requested = params.get("graph");
    const initial = DIJKSTRA_GRAPHS.some(g => g.id === requested)
        ? requested : DIJKSTRA_GRAPHS[0].id;
    graphSelect.value = initial;
    chooseGraph(initial);
})();
