// The Bellman-Ford demo: choose a graph, then step through Bellman-Ford from
// Lecture 14 one update at a time (or one iteration at a time), watching
// the estimated distances and predecessors change. Uses DemoGraphs from
// ../common/graph.js, BFDrawing from ./drawing.js, and BF_GRAPHS from
// ./graphs.js.

(function () {

    // "∞", "−3", or "2"
    function format(x) {
        if (x === Infinity) {
            return "\u221E";
        }
        return x < 0 ? `\u2212${-x}` : String(x);
    }

    // a weight in a sum: "2", or "(−1)"
    const term = (w) => (w < 0 ? `(${format(w)})` : format(w));

    // HTML for a node's name, like v<sub>1</sub>
    function name(id) {
        const m = /^([A-Za-z]+)(\d+)$/.exec(id);
        return m === null ? `<i>${id}</i>` : `<i>${m[1]}</i><sub>${m[2]}</sub>`;
    }

    const plural = (k, word) => `${k} ${word}${k === 1 ? "" : "s"}`;

    // The actual shortest distances from `source`, or null if a negative
    // cycle is reachable from it (so that some aren't defined).
    function trueDistances(graph, source) {
        const est = new Map(graph.nodes.map(n => [n.id, Infinity]));
        est.set(source, 0);
        for (let i = 0; i < graph.nodes.length; i++) {
            let changed = false;
            for (const [u, v, w] of graph.edges) {
                if (est.get(u) + w < est.get(v)) {
                    est.set(v, est.get(u) + w);
                    changed = true;
                }
            }
            if (!changed) {
                return est;
            }
        }
        return null;
    }

    // For each node, the fewest edges in an actual shortest path to it from
    // `source` (Infinity if it isn't reachable), given `dist`, the actual
    // shortest distances (so there is no negative cycle).
    function shortestPathEdges(graph, source, dist) {
        const edges = new Map(graph.nodes.map(n => [n.id, Infinity]));
        edges.set(source, 0);
        for (let i = 0; i < graph.nodes.length; i++) {
            for (const [u, v, w] of graph.edges) {
                if (dist.get(u) + w === dist.get(v) && edges.get(u) + 1 < edges.get(v)) {
                    edges.set(v, edges.get(u) + 1);
                }
            }
        }
        return edges;
    }

    // HTML for a list of nodes: "v1", "v1 and v2", or "v1, v2, and v3"
    function listNames(ids) {
        const names = ids.map(name);
        if (names.length <= 2) {
            return names.join(" and ");
        }
        return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    }

    // Run Bellman-Ford on `graph` and record the state after every update
    // (see ./drawing.js for what a state holds). Each state also has
    // `iteration` (1, 2, ...), `position` (the index of its edge in
    // graph.edges), `caption` (HTML describing the step), and, for the last update of an
    // iteration, `last: true` and `changes`, how many estimates changed.
    function bfStates(graph, source, {early, detect}) {
        const nodes = DemoGraphs.sortedNodes(graph);
        const n = nodes.length;
        const est = new Map(nodes.map(id => [id, Infinity]));
        const pred = new Map(nodes.map(id => [id, null]));
        est.set(source, 0);
        const correct = trueDistances(graph, source);
        const pathEdges = correct === null ? null : shortestPathEdges(graph, source, correct);
        const rounds = detect ? n : n - 1;
        const states = [];

        function record(fields) {
            states.push({
                index: states.length,
                est: new Map(est),
                pred: new Map(pred),
                edge: null,
                improved: false,
                iteration: 0,
                position: -1,
                correct,
                ...fields,
            });
        }

        record({
            caption: `<p>Every estimate starts at \u221E, except the source's:
                <code>est[${name(source)}] = 0</code>. No predecessors are known yet.</p>
                <p>Bellman-Ford will update every edge, in the edge update order, ${detect
                    ? `|V| = ${n} times, the last time to detect negative cycles`
                    : `|V| \u2212 1 = ${n - 1} times`}.</p>`,
        });

        let anyChanges = false;
        let iterations = 0;
        for (let i = 1; i <= rounds; i++) {
            iterations = i;
            anyChanges = false;
            let changes = 0;
            graph.edges.forEach(([u, v, w], position) => {
                const old = est.get(v);
                const candidate = est.get(u) + w;
                const improved = candidate < old;
                const call = `<code>update(${name(u)}, ${name(v)})</code>`;
                const sum = `est[${name(u)}] + ${term(w)} = ${format(est.get(u))} + ${term(w)}
                    = ${format(candidate)}`;
                let caption;
                if (est.get(u) === Infinity) {
                    caption = `<p>${call}: no path to ${name(u)} has been found yet
                        (<code>est[${name(u)}] = \u221E</code>), so going through
                        ${name(u)} can't give a shorter path to ${name(v)}.
                        Nothing changes.</p>`;
                } else if (improved) {
                    caption = `<p>${call}: the path to ${name(u)} found so far,
                        followed by the edge (${name(u)}, ${name(v)}), has length
                        ${sum}. That's shorter than the best path to ${name(v)}
                        found so far, of length ${format(old)}.</p>
                        <p>So set <code>est[${name(v)}] = ${format(candidate)}</code>
                        and <code>predecessor[${name(v)}] = ${name(u)}</code>.</p>`;
                } else {
                    caption = `<p>${call}: going through ${name(u)} gives a path to
                        ${name(v)} of length ${sum}. That's no shorter than the best
                        path to ${name(v)} found so far, of length ${format(old)},
                        so nothing changes.</p>`;
                }
                if (improved) {
                    est.set(v, candidate);
                    pred.set(v, u);
                    changes += 1;
                    anyChanges = true;
                }
                record({edge: [u, v, w], improved, iteration: i, position, caption});
            });

            const last = states[states.length - 1];
            last.last = true;
            last.changes = changes;
            const done = `<p>That was the last edge, so iteration ${i} is done.
                ${changes === 0 ? "No estimates changed during it."
                    : `${plural(changes, "estimate")} changed during it.`}</p>`;
            let end = "";
            if (i < n && correct !== null) {
                const guaranteed = nodes.filter(id => pathEdges.get(id) <= i);
                const all = guaranteed.length === nodes.length;
                end += `<p>Now every node whose actual shortest path from ${name(source)}
                    has at most ${plural(i, "edge")} is guaranteed to be estimated
                    correctly. For this graph, ${all ? "that's every node" : guaranteed.length === 1
                        ? `that's ${listNames(guaranteed)}` : `those are ${listNames(guaranteed)}`}.</p>`;
            }
            if (!anyChanges && early) {
                end += `<p>Since nothing changed, nothing will change in the
                    iterations after it either, so with early stopping, the loop
                    breaks.</p>`;
            }
            last.caption += done + end;
            last.iterationCaption = end;
            last.iterationSummary = `Iteration ${i} is done: ${changes === 0
                ? "no estimates changed" : `${plural(changes, "estimate")} changed`}.`;
            if (!anyChanges && early) {
                break;
            }
        }

        // describe the result
        const last = states[states.length - 1];
        let ending;
        if (detect) {
            ending = anyChanges
                ? `<p>An estimate changed during iteration ${iterations}, so
                    <code>contains_negative_cycles</code> is <b>True</b>: a
                    negative cycle is reachable from ${name(source)}, and the
                    estimates aren't shortest distances.</p>`
                : `<p><code>contains_negative_cycles</code> is <b>False</b>, so
                    the estimates are the shortest distances from ${name(source)},
                    and following the purple arrows backward gives the shortest
                    paths.</p>`;
        } else if (correct === null) {
            ending = `<p>Bellman-Ford has run |V| \u2212 1 = ${n - 1} iterations, but
                these estimates aren't shortest distances: the graph has a
                negative cycle, so they would keep decreasing forever. Check
                \u201CDetect negative cycles\u201D to run one more iteration and find
                out.</p>`;
        } else {
            ending = `<p>Bellman-Ford is done, so the estimates are the shortest
                distances from ${name(source)}, and following the purple arrows
                backward gives the shortest paths.</p>`;
        }
        last.caption += ending;
        last.iterationCaption += ending;
        last.done = true;
        return {states, rounds, iterations};
    }

    // ---------------------------------------------------------------------

    const root = document.getElementById("bf-demo");
    const $ = (selector) => root.querySelector(selector);

    const graphSelect = $("#bf-graph");
    const earlyCheckbox = $("#bf-early");
    const detectCheckbox = $("#bf-detect");
    const wholeCheckbox = $("#bf-whole");
    const correctCheckbox = $("#bf-correct");
    DemoGraphs.optionsMenu($("#bf-options"));
    const description = $("#bf-description");
    const caption = $("#bf-caption");
    const iterationLabel = $("#bf-iteration");
    const edgeList = $("#bf-edges");

    for (const graph of BF_GRAPHS) {
        const option = document.createElement("option");
        option.value = graph.id;
        option.textContent = graph.name;
        graphSelect.append(option);
    }

    const drawing = BFDrawing.sketch($("#bf-canvas"));

    let graph = null;
    let run = null;
    let frames = [];   // the index of the state each step shows
    let stepper = null;

    function buildFrames() {
        frames = run.states
            .filter(s => s.index === 0 || !wholeCheckbox.checked || s.last)
            .map(s => s.index);
    }

    // the edges, in the order they're updated: the ones already updated in
    // this iteration are grayed out, and the one being updated is bold
    function showEdges(state) {
        edgeList.replaceChildren();
        graph.edges.forEach(([u, v, w], k) => {
            const chip = document.createElement("span");
            chip.className = "bf-edge";
            if (state.iteration > 0) {
                if (k < state.position) {
                    chip.classList.add("bf-done");
                } else if (k === state.position) {
                    chip.classList.add(wholeCheckbox.checked ? "bf-done" : "bf-current");
                }
            }
            chip.innerHTML = `(${name(u)}, ${name(v)})`;
            edgeList.append(chip);
        });
    }

    function show(k, previous) {
        const state = run.states[frames[k]];
        const before = previous === null ? null : run.states[frames[previous]];

        // before the first update, the next step is in iteration 1
        const iteration = Math.max(1, state.iteration);
        iterationLabel.textContent = `Iteration ${iteration} of ${run.rounds}`
            + (iteration === run.rounds && detectCheckbox.checked
                ? " (the check for negative cycles)" : "");
        showEdges(state);

        caption.innerHTML = wholeCheckbox.checked && state.index > 0
            ? `<p>${state.iterationSummary}</p>${state.iterationCaption}`
            : state.caption;
        // a whole iteration at a time, no one edge is being updated, so
        // none is drawn in bold
        const shown = (s) => s === null || !wholeCheckbox.checked ? s
            : {...s, edge: null, improved: false};
        return drawing.show(shown(state), shown(before), {animate: before !== null});
    }

    function rebuild(keep = false) {
        const at = keep && stepper ? frames[stepper.position()] : 0;
        run = bfStates(graph, graph.source, {
            early: earlyCheckbox.checked,
            detect: detectCheckbox.checked,
        });
        drawing.markCorrect(correctCheckbox.checked);
        buildFrames();
        drawing.setGraph(graph, run.states);
        // keep the same place, as nearly as possible
        let start = frames.findLastIndex(i => i <= at);
        if (keep && wholeCheckbox.checked && at > 0 && run.states[at] && !run.states[at].last) {
            start = Math.min(frames.length - 1, start + 1);
        }
        start = Math.max(0, start);
        if (stepper === null) {
            stepper = DemoGraphs.stepper({
                first: $("#bf-first"),
                back: $("#bf-back"),
                next: $("#bf-next"),
                last: $("#bf-last"),
                play: $("#bf-play"),
                counter: $("#bf-counter"),
            }, frames.length, show);
        } else {
            stepper.reset(frames.length, start);
        }
    }

    function chooseGraph(id) {
        graph = BF_GRAPHS.find(g => g.id === id);
        description.textContent = graph.description;
        rebuild();
    }

    graphSelect.addEventListener("change", () => chooseGraph(graphSelect.value));
    earlyCheckbox.addEventListener("change", () => rebuild());
    detectCheckbox.addEventListener("change", () => rebuild());
    wholeCheckbox.addEventListener("change", () => rebuild(true));
    correctCheckbox.addEventListener("change", () => {
        drawing.markCorrect(correctCheckbox.checked);
    });

    // options from the URL, e.g. for a lecture slide:
    // ?graph=<id>&early&detect&iterations&correct
    const params = new URLSearchParams(location.search);
    earlyCheckbox.checked = params.has("early");
    detectCheckbox.checked = params.has("detect");
    wholeCheckbox.checked = params.has("iterations");
    correctCheckbox.checked = params.has("correct");
    const requested = params.get("graph");
    const initial = BF_GRAPHS.some(g => g.id === requested) ? requested : BF_GRAPHS[0].id;
    graphSelect.value = initial;
    chooseGraph(initial);
})();
