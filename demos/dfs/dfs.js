// The DFS demo: choose a graph and a source, then step through the recursive
// DFS from Lecture 13, watching the nested calls to dfs build up as a tree.
// Uses DemoGraphs from ../common/graph.js, DFSDrawing from ./drawing.js, and
// DFS_GRAPHS from ./graphs.js.

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

    const code = (u) => `<code>dfs(${u})</code>`;

    // Run DFS (or full DFS) on `graph` and record the state after every step
    // (see ./drawing.js for what a state holds; each also has a `caption`,
    // and `substeps`, the caption of each part of the step, for "small
    // steps"). A step ends whenever dfs is called or returns: in one step,
    // the running call explores its neighbors until one is undiscovered, and
    // calls dfs on it, or until it runs out of neighbors, and returns.
    function dfsStates(graph, source, full, times) {
        const neighbors = DemoGraphs.neighbors(graph);
        const nodes = DemoGraphs.sortedNodes(graph);
        const status = new Map(nodes.map(n => [n, "undiscovered"]));
        const calls = [];
        const stack = [];
        const states = [];
        const backEdges = [];
        let clock = 0;
        const kind = graph.directed ? "successors" : "neighbors";
        const kindOne = graph.directed ? "successor" : "neighbor";

        function record({explorations = [], called = null, returned = null,
                         caption, substeps = [caption]}) {
            states.push({
                status: new Map(status),
                calls: calls.map(c => ({...c})),
                clock,
                stack: [...stack],
                current: stack.length > 0 ? calls[stack[stack.length - 1]].node : null,
                explorations,
                called,
                returned,
                caption,
                substeps,
            });
        }

        // the start of a call to dfs on u: mark u pending
        function enter(u, parent) {
            status.set(u, "pending");
            clock += 1;
            calls.push({
                node: u,
                parent,
                depth: parent < 0 ? 0 : calls[parent].depth + 1,
                start: clock,
                finish: null,
            });
            stack.push(calls.length - 1);
        }

        // HTML for "..., which marks u as pending." or, with start and
        // finish times shown, also for the clock ticking, in the order of
        // the code: the status changes, and then the clock ticks
        const tick = () => `The clock goes up from ${clock - 1} to <b>${clock}</b>`;
        const marksPending = (u) => times
            ? `, which marks <b>${u}</b> as ${statusWord("pending")}.
                ${tick()}, so <code>start[${u}] = ${clock}</code>.`
            : `, which marks <b>${u}</b> as ${statusWord("pending")}.`;
        const marksVisited = (u) => times
            ? `, so mark <b>${u}</b> as ${statusWord("visited")}.
                ${tick()}, so <code>finish[${u}] = ${clock}</code>.`
            : `, so mark <b>${u}</b> as ${statusWord("visited")}.`;

        // The captions for a call to dfs on u, with small steps: with start
        // and finish times shown, marking u, the clock ticking, and setting
        // the start time are each their own step. `lead` is the open
        // paragraph that says u is called; `after` comes last.
        function callSteps(lead, u, after = "") {
            if (!times) {
                return [`${lead}${marksPending(u)} ${after}</p>`];
            }
            return [
                `${lead}, which marks <b>${u}</b> as ${statusWord("pending")}.</p>`,
                `<p>${tick()}.</p>`,
                `<p>Set <code>start[${u}] = ${clock}</code>. ${after}</p>`,
            ];
        }

        // HTML describing the exploration of the edge from u to e.v, when v
        // has already been seen
        function seen(u, e) {
            let text = `It is already ${statusWord(e.was)}, so there's nothing to do.`;
            if (graph.directed && e.was === "pending") {
                text = `It is already ${statusWord("pending")}, so
                    (<b>${u}</b>, <b>${e.v}</b>) is a <b>back edge</b>:
                    the graph has a cycle.`;
            }
            return text;
        }

        // the body of dfs(u), after u has been marked pending
        function loop(u) {
            const index = stack[stack.length - 1];
            let explorations = [];
            let resumedAfter = null;  // the neighbor whose call just returned

            // HTML for the start of a step's caption
            function opening() {
                if (resumedAfter === null) {
                    const all = neighbors.get(u);
                    return all.length === 0
                        ? `<p>In ${code(u)}: <b>${u}</b> has no ${kind}.</p>`
                        : `<p>In ${code(u)}: loop over <b>${u}</b>'s ${kind}
                            (${listNodes(all)}, in sorted order).</p>`;
                }
                return `<p>${code(resumedAfter)} has returned, so ${code(u)}
                    picks up its loop where it left off, after <b>${resumedAfter}</b>.</p>`;
            }

            // HTML summarizing the explorations of neighbors already seen
            function seenSummary(list) {
                if (list.length === 0) {
                    return "";
                }
                const groups = ["pending", "visited"].map(s => list.filter(e => e.was === s))
                    .filter(g => g.length > 0)
                    .map(g => `${listNodes(g.map(e => e.v))}
                        ${g.length === 1 ? "is" : "are"} already ${statusWord(g[0].was)}`);
                let text = `<p>Explore the edge${list.length === 1 ? "" : "s"} to
                    ${listNodes(list.map(e => e.v))}: ${groups.join("; ")}.</p>`;
                const back = list.filter(e => graph.directed && e.was === "pending");
                for (const e of back) {
                    text += `<p>(<b>${u}</b>, <b>${e.v}</b>) is a <b>back edge</b>,
                        so the graph has a cycle.</p>`;
                }
                return text;
            }

            function substepsFor(list) {
                const parts = [];
                list.forEach((e, k) => {
                    const head = k === 0 ? opening() : "";
                    parts.push(`${head}<p>Explore the edge from <b>${u}</b> to its
                        ${kindOne} <b>${e.v}</b>. ${seen(u, e)}</p>`);
                });
                return parts;
            }

            for (const v of neighbors.get(u)) {
                const e = {
                    v,
                    key: DemoGraphs.edgeKey(graph, u, v),
                    discovered: status.get(v) === "undiscovered",
                    was: status.get(v),
                };
                explorations.push(e);
                if (!e.discovered) {
                    if (graph.directed && e.was === "pending") {
                        backEdges.push([u, v]);
                    }
                    continue;
                }

                // call dfs on v
                const before = explorations.slice(0, -1);
                enter(v, index);
                const callText = `<p>Explore the edge to <b>${v}</b>: it's
                    ${statusWord("undiscovered")}, so call ${code(v)}${marksPending(v)}
                    ${code(u)} waits until it returns.</p>`;
                const substeps = substepsFor(before);
                substeps.push(`${before.length === 0 ? opening() : ""}<p>Explore the
                    edge from <b>${u}</b> to its ${kindOne} <b>${v}</b>. It's
                    ${statusWord("undiscovered")}.</p>`);
                substeps.push(...callSteps(`<p>So call ${code(v)}`, v,
                    `${code(u)} waits until it returns.`));
                record({
                    explorations,
                    called: v,
                    caption: opening() + seenSummary(before) + callText,
                    substeps,
                });

                loop(v);
                explorations = [];
                resumedAfter = v;
            }

            // the loop is done: mark u visited and return
            status.set(u, "visited");
            clock += 1;
            calls[index].finish = clock;
            stack.pop();
            const parent = calls[index].parent;
            let returnTo;
            if (parent >= 0) {
                returnTo = `returns to ${code(calls[parent].node)}`;
            } else if (full) {
                returnTo = "returns to <code>full_dfs</code>";
            } else {
                returnTo = "returns. The search is done";
            }
            const last = neighbors.get(u).length === 0 ? ""
                : explorations.length > 0 ? `That was <b>${u}</b>'s last ${kindOne}. `
                : `<b>${u}</b> has no ${kind} left. `;
            const lead = `<p>${last}The loop is done`;
            const after = `${code(u)} ${returnTo}.`;
            const returnText = `${lead}${marksVisited(u)} ${after}</p>`;
            const substeps = substepsFor(explorations);
            const head = explorations.length === 0 ? opening() : "";
            substeps.push(`${head}${lead}, so mark <b>${u}</b> as ${statusWord("visited")}.</p>`);
            if (times) {
                // as for a call (see callSteps), each is its own step
                substeps.push(
                    `<p>${tick()}.</p>`,
                    `<p>Set <code>finish[${u}] = ${clock}</code>.</p>`,
                );
            }
            substeps.push(`<p>${after}</p>`);
            record({
                explorations,
                returned: u,
                caption: opening() + seenSummary(explorations) + returnText,
                substeps,
            });
        }

        // the calls made from outside dfs
        const call = full ? "full_dfs(graph)" : `dfs(graph, ${source})`;
        record({caption: `<p>Every node starts out ${statusWord("undiscovered")}.
            Click <b>Next</b> to call <code>${call}</code>.</p>`});

        let rootCalls = 0;
        for (const start of full ? nodes : [source]) {
            if (status.get(start) !== "undiscovered") {
                continue;
            }
            rootCalls += 1;
            enter(start, -1);
            let lead;
            if (!full) {
                lead = `<p>Call ${code(start)}`;
            } else if (rootCalls === 1) {
                lead = `<p><code>full_dfs</code> loops over the nodes. The first
                    one, <b>${start}</b>, is ${statusWord("undiscovered")}, so it calls
                    ${code(start)}`;
            } else {
                lead = `<p><code>full_dfs</code> continues looping over the nodes,
                    and the next ${statusWord("undiscovered")} one is <b>${start}</b>,
                    so it calls ${code(start)}`;
            }
            record({
                called: start,
                caption: `${lead}${marksPending(start)}</p>`,
                substeps: callSteps(lead, start),
            });
            loop(start);
        }

        // describe the end of the search
        const last = states[states.length - 1];
        const never = nodes.filter(n => status.get(n) === "undiscovered");
        let ending = "";
        if (full) {
            ending = `<p>Every node has been visited, so <code>full_dfs</code> is
                done. It called <code>dfs</code> itself ${rootCalls}
                time${rootCalls === 1 ? "" : "s"}.</p>`;
        } else if (never.length > 0) {
            ending = `<p>${listNodes(never)} ${never.length === 1 ? "was" : "were"}
                never discovered: ${never.length === 1 ? "it isn't" : "they aren't"}
                reachable from <b>${source}</b>. (Check “full DFS” to visit every
                node.)</p>`;
        }
        if (graph.directed) {
            ending += backEdges.length > 0
                ? `<p>The search found ${backEdges.length}
                    back edge${backEdges.length === 1 ? "" : "s"}, so the graph has a cycle.</p>`
                : `<p>The search found no back edges${full ? ", so the graph has no cycles" : ""}.</p>`;
        }
        last.caption += ending;
        last.substeps[last.substeps.length - 1] += ending;

        return states;
    }

    // ---------------------------------------------------------------------

    const root = document.getElementById("dfs-demo");
    const $ = (selector) => root.querySelector(selector);

    const graphSelect = $("#dfs-graph");
    const sourceSelect = $("#dfs-source");
    const fullCheckbox = $("#dfs-full");
    const smallCheckbox = $("#dfs-small");
    const timesCheckbox = $("#dfs-times");
    DemoGraphs.optionsMenu($("#dfs-options"));
    const description = $("#dfs-description");
    const caption = $("#dfs-caption");

    for (const graph of DFS_GRAPHS) {
        const option = document.createElement("option");
        option.value = graph.id;
        option.textContent = graph.name;
        graphSelect.append(option);
    }

    const drawing = DFSDrawing.sketch($("#dfs-canvas"));

    let graph = null;
    let states = [];
    let stepper = null;

    // What each click of Next shows: a whole step, or with "small steps" one
    // part of one (exploring one edge, calling dfs, or returning). With
    // start and finish times shown, marking a node, the clock ticking, and
    // setting the time are separate parts.
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

    function computeStates() {
        const full = fullCheckbox.checked;
        sourceSelect.disabled = full;
        states = dfsStates(graph, sourceSelect.value, full, timesCheckbox.checked);
        drawing.setGraph(graph, states, {full, times: timesCheckbox.checked});
    }

    function rebuild() {
        computeStates();
        buildFrames();
        if (stepper === null) {
            stepper = DemoGraphs.stepper({
                first: $("#dfs-first"),
                back: $("#dfs-back"),
                next: $("#dfs-next"),
                last: $("#dfs-last"),
                play: $("#dfs-play"),
                counter: $("#dfs-counter"),
            }, frames.length, show);
        } else {
            stepper.reset(frames.length);
        }
    }

    // switching between whole and small steps, or showing the times, keeps
    // the same step
    function keepStep(recompute) {
        const now = frames[stepper.position()];
        if (recompute) {
            computeStates();
        }
        buildFrames();
        const k = frames.findLastIndex(f => f.state === now.state);
        stepper.reset(frames.length, k);
    }

    function chooseGraph(id) {
        graph = DFS_GRAPHS.find(g => g.id === id);
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
    smallCheckbox.addEventListener("change", () => keepStep(false));
    timesCheckbox.addEventListener("change", () => keepStep(true));

    // on a lecture slide (see "embedding" in demos.css), start with small steps
    if (document.documentElement.classList.contains("demo-embed")) {
        smallCheckbox.checked = true;
    }

    // ?times in the URL (e.g. on a lecture slide) starts with the start and
    // finish times shown
    if (new URLSearchParams(location.search).has("times")) {
        timesCheckbox.checked = true;
    }

    // start with the graph named by ?graph=<id> in the URL (e.g. on a lecture
    // slide), or else the first one
    const requested = new URLSearchParams(location.search).get("graph");
    const initial = DFS_GRAPHS.some(g => g.id === requested)
        ? requested : DFS_GRAPHS[0].id;
    graphSelect.value = initial;
    chooseGraph(initial);
})();
