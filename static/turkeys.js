// A Thanksgiving easter egg for the schedule: each click on the turkey in a
// week's title turns one more word on the page into a turkey, in the order
// of WORDS: "Office" in Office Hours, then "Staff" in Course Staff. The
// click after those starts a takeover: every word on the page turns
// into a turkey, in a random order, slowly at first and then faster and
// faster. Each turkey falls from the top of the window onto its word. Then
// the turkeys swirl around the page and settle into the words
// "Happy Thanksgiving". Clicking one of those turkeys fades the page back
// in, as it was.

(function () {
    const TURKEY = "🦃";

    // [where to look, the text the element has to contain, the part of it
    // that becomes a turkey]
    const NAVIGATION = "#sidebar a, .mobile-navbar a";
    const WORDS = [
        [NAVIGATION, "Office Hours", "Office"],
        [NAVIGATION, "Course Staff", "Staff"],
    ];

    // the first words to go in the takeover, in this order (in the same
    // form as WORDS); the rest go in a random order
    const FIRST = [
        ["h2", "Complexity Theory", "Complexity"],
        ["h2", "Kruskal", "Algorithm"],
        [NAVIGATION, "Campuswire", "Campus"],
        [NAVIGATION, "Gradescope", "Grade"],
    ];

    // When a click turns one word into a turkey, the turkey falls from above
    // the top of the window, taking DROP ms
    const DROP = 700;

    // In the takeover, words turn into turkeys at a rate that starts at
    // RATE per second and grows by a factor of e every RAMP seconds.
    const RATE = 0.7;
    const RAMP = 1;
    // a word, for the takeover: letters and digits, with any apostrophes
    // or hyphens inside it
    const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

    // Then, the turkeys swirl into these words (one line each)
    const MESSAGE = ["HAPPY", "THANKSGIVING!"];
    const SWIRL_DELAY = 700;  // ms after the last word turns into a turkey
    const SWIRL = 4200;       // how long each turkey takes to get to its place,
    const STAGGER = 900;      // starting up to this many ms after the first
    const TURNS = 1.5;        // how many times it goes around the center
    const FADE_BACK = 1200;   // ms for the page to fade back in, once one of
                              // the turkeys in the words is clicked

    // make each turkey in a schedule week's title clickable
    function wrapTurkeys() {
        for (const heading of document.querySelectorAll("h2")) {
            const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) {
                if (walker.currentNode.nodeValue.includes(TURKEY)) {
                    nodes.push(walker.currentNode);
                }
            }
            for (const node of nodes) {
                const parts = node.nodeValue.split(TURKEY);
                const fragment = document.createDocumentFragment();
                parts.forEach((part, i) => {
                    fragment.append(part);
                    if (i < parts.length - 1) {
                        const button = document.createElement("span");
                        button.textContent = TURKEY;
                        button.className = "turkey-trigger";
                        button.setAttribute("role", "button");
                        button.setAttribute("tabindex", "0");
                        button.setAttribute("aria-label", "Gobble");
                        button.style.cursor = "pointer";
                        button.addEventListener("click", gobble);
                        button.addEventListener("keydown", (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                gobble();
                            }
                        });
                        fragment.append(button);
                    }
                });
                node.replaceWith(fragment);
            }
        }
    }

    // turn the word in `element` into a turkey, right away
    function becomeTurkey(element, word) {
        element.textContent = TURKEY;
        element.setAttribute("aria-label", word);
        element.style.display = "inline-block";
    }

    // Turkeys that fall from above the top of the window, speeding up as they
    // fall, each replacing the word in its element when it lands. `items` is
    // a list of [element, word]. Words that aren't on the screen are
    // replaced right away.
    function dropTurkeys(items) {
        // where each turkey will be, once it has replaced its word (measured
        // all at once, so that the page is laid out only once)
        for (const [element] of items) {
            element.textContent = TURKEY;
            element.style.display = "inline-block";
        }
        const boxes = items.map(([element]) => element.getBoundingClientRect());
        const styles = items.map(([element]) => {
            const style = getComputedStyle(element);
            return {fontSize: style.fontSize, fontFamily: style.fontFamily};
        });
        for (const [element, word] of items) {
            element.textContent = word;
            element.style.display = "";
        }

        items.forEach(([element, word], i) => {
            const box = boxes[i];
            if (box.width === 0 || box.bottom < 0 || box.top > window.innerHeight) {
                // not on the screen (e.g., in the menu for small screens)
                becomeTurkey(element, word);
                return;
            }
            const faller = document.createElement("span");
            faller.textContent = TURKEY;
            faller.setAttribute("aria-hidden", "true");
            Object.assign(faller.style, {
                position: "fixed",
                left: `${box.left + box.width / 2}px`,
                top: `${box.top + box.height / 2}px`,
                fontSize: styles[i].fontSize,
                fontFamily: styles[i].fontFamily,
                lineHeight: `${box.height}px`,
                zIndex: "9999",
                pointerEvents: "none",
                transform: "translate(-50%, -50%)",
            });
            document.body.append(faller);
            // from just above the top of the window, accelerating like
            // gravity (two translations rather than calc(), which Safari
            // doesn't animate here)
            const above = box.top + box.height;
            const fall = faller.animate([
                {transform: `translateY(${-above}px) translate(-50%, -50%)`},
                {transform: "translateY(0px) translate(-50%, -50%)"},
            ], {duration: DROP, easing: "cubic-bezier(.45, 0, .85, .6)", fill: "forwards"});
            fall.finished.then(() => {
                faller.remove();
                becomeTurkey(element, word);
                // it lands with a little squash
                element.animate([
                    {transform: "scale(1, 1)"},
                    {transform: "scale(1.3, 0.75)", offset: 0.35},
                    {transform: "scale(1, 1)"},
                ], {duration: 260, easing: "ease-out"});
            });
        });
    }

    // the text nodes inside `element`
    function textNodes(element) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        return nodes;
    }

    // Put each `word` described by [where, label, word] (see WORDS) in a
    // span of its own, and return the spans. The text around it is kept
    // with it in one span: the navigation's links are flex boxes, which
    // would drop the spaces at the ends of separate pieces of text.
    function isolate([where, label, word]) {
        const spans = [];
        for (const element of document.querySelectorAll(where)) {
            if (!element.textContent.includes(label)) {
                continue;
            }
            const node = textNodes(element).find(n => n.nodeValue.includes(word));
            if (!node) {
                continue;
            }
            const at = node.nodeValue.indexOf(word);
            const span = document.createElement("span");
            span.textContent = word;
            const piece = document.createElement("span");
            piece.append(node.nodeValue.slice(0, at), span,
                node.nodeValue.slice(at + word.length));
            swap(node, piece);
            spans.push(span);
        }
        return spans;
    }

    // Every piece of text replaced so far, as [what replaced it, the
    // original], so that the page can be put back the way it was.
    let replaced = [];

    function swap(original, replacement) {
        original.replaceWith(replacement);
        replaced.push([replacement, original]);
    }

    // put back every piece of text that was replaced, newest first
    function restore() {
        for (const [replacement, original] of replaced.reverse()) {
            replacement.replaceWith(original);
        }
        replaced = [];
        for (const trigger of document.querySelectorAll(".turkey-trigger")) {
            trigger.style.visibility = "";
        }
        clicks = 0;
    }

    let clicks = 0;

    function gobble() {
        clicks += 1;
        if (clicks <= WORDS.length) {
            const word = WORDS[clicks - 1][2];
            dropTurkeys(isolate(WORDS[clicks - 1]).map(span => [span, word]));
        } else if (clicks === WORDS.length + 1) {
            takeOver();
        }
    }

    // turn every word on the page into a turkey, in a random order, slowly
    // at first and then faster and faster
    function takeOver() {
        // the words to go first, each with its copies (e.g., in both menus)
        const first = FIRST.map(isolate);
        const firstSpans = new Set(first.flat());

        // put each other word in a span of its own
        const skip = "script, style, noscript, textarea, select, option, svg, .turkey-trigger";
        const nodes = textNodes(document.body).filter(n =>
            !n.parentElement.closest(skip) && !firstSpans.has(n.parentElement)
            && n.nodeValue.match(WORD));
        const words = [];
        for (const node of nodes) {
            const piece = document.createElement("span");
            let last = 0;
            for (const match of node.nodeValue.matchAll(WORD)) {
                piece.append(node.nodeValue.slice(last, match.index));
                const word = document.createElement("span");
                word.textContent = match[0];
                piece.append(word);
                words.push([word]);
                last = match.index + match[0].length;
            }
            piece.append(node.nodeValue.slice(last));
            swap(node, piece);
        }

        // in a random order, after the first ones
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        words.unshift(...first.filter(spans => spans.length > 0));

        // by `t` seconds in, the number of turkeys is the integral of the
        // rate, RATE * RAMP * (e^(t / RAMP) - 1), plus the first one
        let start = null, done = 0;
        function frame(now) {
            start ??= now;
            const t = (now - start) / 1000;
            const due = Math.min(words.length, 1 + Math.floor(RATE * RAMP * Math.expm1(t / RAMP)));
            const falling = [];
            while (done < due) {
                for (const span of words[done]) {
                    falling.push([span, span.textContent]);
                }
                done += 1;
            }
            if (falling.length > 0) {
                dropTurkeys(falling);
            }
            if (done < words.length) {
                requestAnimationFrame(frame);
            } else {
                // once the last turkeys have landed
                setTimeout(swirl, DROP + SWIRL_DELAY);
            }
        }
        requestAnimationFrame(frame);
    }

    // The letters of MESSAGE, in a 7-pixel-tall font (5 wide, except "!"),
    // like an old LED sign, so that they stay readable when each pixel is a
    // turkey.
    const FONT = {
        A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
        H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
        I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
        K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
        N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
        P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
        Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
        "!": ["1", "1", "1", "1", "1", "0", "1"],
        " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    };
    const LETTER_GAP = 1;     // pixels between letters,
    const LINE_GAP = 2;       // and between lines

    // Where the turkeys go to spell MESSAGE, as big as it fits in the
    // window: the centers of its pixels, as [x, y], and the size of a pixel.
    function messageCells() {
        const glyph = (letter) => FONT[letter] ?? FONT[" "];
        const lineWidth = (line) => [...line].reduce(
            (sum, letter) => sum + glyph(letter)[0].length + LETTER_GAP, -LETTER_GAP);
        const cols = Math.max(...MESSAGE.map(lineWidth));
        const rows = MESSAGE.length * (7 + LINE_GAP) - LINE_GAP;
        const size = Math.max(8, Math.floor(Math.min(
            window.innerWidth * 0.92 / cols, window.innerHeight * 0.7 / rows)));
        const top = (window.innerHeight - rows * size) / 2;
        const cells = [];
        MESSAGE.forEach((line, l) => {
            const left = (window.innerWidth - lineWidth(line) * size) / 2;
            let x = 0;  // the column the letter starts in
            for (const letter of line) {
                glyph(letter).forEach((bits, r) => {
                    [...bits].forEach((bit, c) => {
                        if (bit === "1") {
                            cells.push([
                                left + (x + c + 0.5) * size,
                                top + (l * (7 + LINE_GAP) + r + 0.5) * size,
                            ]);
                        }
                    });
                });
                x += glyph(letter)[0].length + LETTER_GAP;
            }
        });
        return {cells, size};
    }

    // the turkeys swirl around the page, and settle into the words
    function swirl() {
        const width = window.innerWidth, height = window.innerHeight;
        const cx = width / 2, cy = height / 2;

        // the turkeys on the screen
        const onScreen = [...document.querySelectorAll("span")].filter(span => {
            if (span.textContent !== TURKEY || span.children.length > 0) {
                return false;
            }
            const box = span.getBoundingClientRect();
            return box.width > 0 && box.bottom > 0 && box.top < height
                && box.right > 0 && box.left < width;
        });

        // the grid for the words, fine enough for them to be readable
        const {cells, size} = messageCells();
        // fill the words from left to right, so that nearby turkeys don't
        // all head for the same letter
        cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        // the page fades away behind the turkeys
        const overlay = document.createElement("div");
        overlay.setAttribute("aria-hidden", "true");
        Object.assign(overlay.style, {
            position: "fixed", inset: "0", zIndex: "9999", overflow: "hidden",
            pointerEvents: "none", transition: `background-color ${SWIRL / 2}ms ease`,
        });
        document.body.append(overlay);
        const background = getComputedStyle(document.body).backgroundColor;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            overlay.style.backgroundColor = background === "rgba(0, 0, 0, 0)" ? "#fff" : background;
        }));

        // a free-floating copy of each turkey, where it is now; the turkeys
        // closest to the left go to the leftmost cells
        // (drawn in the same font, at the same size, so that it looks just
        // the same when it takes the turkey's place)
        const flyers = onScreen.map(span => {
            const box = span.getBoundingClientRect();
            const style = getComputedStyle(span);
            return {
                x: box.left + box.width / 2,
                y: box.top + box.height / 2,
                size: parseFloat(style.fontSize),
                font: style.fontFamily,
                lineHeight: `${box.height}px`,
            };
        });
        onScreen.forEach(span => { span.style.visibility = "hidden"; });
        // if the words need more turkeys than there are, the rest swirl in
        // from off the screen
        while (flyers.length < cells.length) {
            const angle = Math.random() * 2 * Math.PI;
            const far = Math.hypot(width, height) * (0.6 + 0.3 * Math.random());
            flyers.push({x: cx + Math.cos(angle) * far, y: cy + Math.sin(angle) * far, size});
        }
        flyers.sort((a, b) => a.x - b.x || a.y - b.y);
        flyers.forEach((flyer, i) => {
            if (i < cells.length) {
                [flyer.tx, flyer.ty] = cells[i];
                flyer.tsize = size * 0.95;
            } else {
                // left over: off the screen, fading out
                const angle = Math.random() * 2 * Math.PI;
                const far = Math.hypot(width, height);
                flyer.tx = cx + Math.cos(angle) * far;
                flyer.ty = cy + Math.sin(angle) * far;
                flyer.tsize = flyer.size;
                flyer.fade = true;
            }
        });

        // each turkey: its own element, its start and end in polar
        // coordinates around the center, and when it starts
        for (const flyer of flyers) {
            const element = document.createElement("span");
            element.textContent = TURKEY;
            Object.assign(element.style, {
                position: "absolute", left: "0", top: "0", display: "inline-block",
                lineHeight: flyer.lineHeight ?? "1", fontFamily: flyer.font ?? "",
                fontSize: `${flyer.size}px`, willChange: "transform, opacity",
                transform: "translate(-50%, -50%)",
            });
            overlay.append(element);
            flyer.element = element;
            flyer.r0 = Math.hypot(flyer.x - cx, flyer.y - cy);
            flyer.a0 = Math.atan2(flyer.y - cy, flyer.x - cx);
            flyer.r1 = Math.hypot(flyer.tx - cx, flyer.ty - cy);
            let a1 = Math.atan2(flyer.ty - cy, flyer.tx - cx);
            // always going counterclockwise, TURNS times around
            while (a1 < flyer.a0) {
                a1 += 2 * Math.PI;
            }
            flyer.a1 = a1 + 2 * Math.PI * Math.floor(TURNS);
            if (TURNS % 1 !== 0 && a1 - flyer.a0 < Math.PI) {
                flyer.a1 += 2 * Math.PI;
            }
            flyer.delay = Math.random() * STAGGER;
            flyer.spin = (Math.random() < 0.5 ? -1 : 1) * 360 * (1 + Math.random());
        }

        const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
        let start = null;
        function frame(now) {
            start ??= now;
            let moving = false;
            for (const flyer of flyers) {
                const u = Math.min(1, Math.max(0, (now - start - flyer.delay) / SWIRL));
                const e = ease(u);
                // out to a wide orbit and back in to its place
                const r = flyer.r0 + (flyer.r1 - flyer.r0) * e
                    + Math.sin(Math.PI * e) * Math.min(width, height) * 0.15;
                const a = flyer.a0 + (flyer.a1 - flyer.a0) * e;
                const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
                const scale = (flyer.size + (flyer.tsize - flyer.size) * e) / flyer.size;
                const spin = flyer.spin * (1 - e) * Math.sin(Math.PI * e);
                flyer.element.style.transform =
                    `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${spin}deg) scale(${scale})`;
                if (flyer.fade) {
                    flyer.element.style.opacity = String(1 - e);
                }
                if (u < 1) {
                    moving = true;
                }
            }
            if (moving) {
                requestAnimationFrame(frame);
            } else {
                // clicking a turkey in the words brings the page back
                for (const flyer of flyers) {
                    if (!flyer.fade) {
                        flyer.element.style.pointerEvents = "auto";
                        flyer.element.style.cursor = "pointer";
                        flyer.element.addEventListener("click", fadeBack);
                    }
                }
            }
        }
        requestAnimationFrame(frame);

        // put the page back behind the turkeys, and fade them away
        let fading = false;
        function fadeBack() {
            if (fading) {
                return;
            }
            fading = true;
            restore();
            overlay.style.transition = `opacity ${FADE_BACK}ms ease`;
            overlay.style.pointerEvents = "none";
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), FADE_BACK + 50);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wrapTurkeys);
    } else {
        wrapTurkeys();
    }
})();
