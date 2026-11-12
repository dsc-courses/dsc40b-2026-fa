// An easter egg for the schedule, for the week of the Ohio State-Michigan
// game: clicking the "M" in "Midterm 02" draws a red X through every M on
// the page (capital or not), one after another in a quick, random wave.
// Clicking that M again takes the Xs away.

(function () {
    const TITLE = "Midterm 02";  // the week title whose first letter is clickable
    const WAVE = 900;            // ms over which the Xs are drawn, in random order
    const STROKE = 180;          // ms to draw each stroke of an X

    const css = `
        .strike-m {
            position: relative;
        }
        .strike-m::before,
        .strike-m::after {
            content: "";
            position: absolute;
            left: -12%;
            right: -12%;
            top: 50%;
            height: .13em;
            margin-top: -.065em;
            border-radius: .07em;
            background: #d20000;
            pointer-events: none;
            transform: rotate(var(--angle)) scaleX(0);
            animation: strike-m ${STROKE}ms ease-out forwards;
            animation-delay: var(--delay);
        }
        .strike-m::before {
            --angle: 45deg;
        }
        .strike-m::after {
            --angle: -45deg;
            animation-delay: calc(var(--delay) + ${STROKE}ms);
        }
        @keyframes strike-m {
            to { transform: rotate(var(--angle)) scaleX(1); }
        }
    `;

    // the text nodes inside `element`, except in scripts, styles and icons
    function textNodes(element) {
        const skip = "script, style, noscript, textarea, select, option, svg";
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            if (!walker.currentNode.parentElement.closest(skip)) {
                nodes.push(walker.currentNode);
            }
        }
        return nodes;
    }

    // every piece of text that was split up to strike its Ms, as [the span
    // that replaced it, the original], so that it can be put back
    let struck = [];

    function strike() {
        for (const node of textNodes(document.body)) {
            if (!/m/i.test(node.nodeValue)) {
                continue;
            }
            // kept together in one span: some of the site's links are flex
            // boxes, which would drop the spaces at the ends of separate
            // pieces of text
            const piece = document.createElement("span");
            for (const part of node.nodeValue.split(/(m)/i)) {
                if (/^m$/i.test(part)) {
                    const letter = document.createElement("span");
                    letter.className = "strike-m";
                    letter.textContent = part;
                    letter.style.setProperty("--delay", `${Math.round(Math.random() * WAVE)}ms`);
                    piece.append(letter);
                } else if (part) {
                    piece.append(part);
                }
            }
            node.replaceWith(piece);
            struck.push([piece, node]);
        }
    }

    function unstrike() {
        for (const [piece, node] of struck.reverse()) {
            piece.replaceWith(node);
        }
        struck = [];
    }

    // make the M in the week's title clickable
    function setUp() {
        const heading = [...document.querySelectorAll("h2")]
            .find(h => h.textContent.trim().startsWith(TITLE));
        if (!heading) {
            return;
        }
        const node = textNodes(heading).find(n => n.nodeValue.includes(TITLE));
        const at = node.nodeValue.indexOf(TITLE);
        const trigger = document.createElement("span");
        trigger.textContent = TITLE[0];
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
        trigger.setAttribute("aria-label", "M");
        trigger.style.cursor = "pointer";
        const piece = document.createElement("span");
        piece.append(node.nodeValue.slice(0, at), trigger, node.nodeValue.slice(at + 1));
        node.replaceWith(piece);

        const style = document.createElement("style");
        style.textContent = css;
        document.head.append(style);

        const toggle = () => (struck.length > 0 ? unstrike() : strike());
        trigger.addEventListener("click", toggle);
        trigger.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setUp);
    } else {
        setUp();
    }
})();
