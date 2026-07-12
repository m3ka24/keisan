// ------------------------------
// 基本処理
// ------------------------------

const OP_TYPES = ["plus", "minus", "mul", "div"];
let currentProblems = [];

const checkboxes = [...document.querySelectorAll('#toolbar input[type="checkbox"]')];
const generateButton = document.getElementById("generateButton");
const printButton = document.getElementById("printButton");

function getSelectedOpsFromUrl() {
    const value = new URLSearchParams(location.search).get("op");
    if (!value) return [...OP_TYPES];

    const ops = value.split(",").filter(op => OP_TYPES.includes(op));
    return ops.length ? ops : [...OP_TYPES];
}

function updateUrl(selectedOps) {
    const params = new URLSearchParams(location.search);
    params.set("op", selectedOps.join(","));
    history.replaceState({}, "", `${location.pathname}?${params}`);
}

function applyUrlToCheckboxes() {
    const selected = getSelectedOpsFromUrl();
    checkboxes.forEach(box => box.checked = selected.includes(box.value));
}

function getSelectedOpsFromCheckboxes() {
    return checkboxes.filter(box => box.checked).map(box => box.value);
}

function onOperationChanged() {
    const selected = getSelectedOpsFromCheckboxes();

    if (!selected.length) {
        alert("少なくとも1種類選択してください。");
        applyUrlToCheckboxes();
        return;
    }

    updateUrl(selected);
    regenerate();
}

function regenerate() {
    const ops = getSelectedOpsFromCheckboxes();
    currentProblems = generateProblems(100, ops);
    renderProblems(currentProblems);
    renderAnswers(currentProblems);
}

function initialize() {
    applyUrlToCheckboxes();

    checkboxes.forEach(box =>
        box.addEventListener("change", onOperationChanged)
    );

    generateButton.addEventListener("click", regenerate);
    printButton.addEventListener("click", () => window.print());

    regenerate();
}

document.addEventListener("DOMContentLoaded", initialize);



// ------------------------------
// 問題生成
// ------------------------------
const seedLabel = document.getElementById("seedLabel");
function getSeed() {
    const params = new URLSearchParams(location.search);

    let seed = Number(params.get("seed"));

    if (Number.isInteger(seed) && seed >= 0) {
		seedLabel.textContent = seed;
        return seed;
    }

    seed = Math.floor(Math.random() * 0xffffffff);

    params.set("seed", seed);
    history.replaceState({}, "", `${location.pathname}?${params}`);
	seedLabel.textContent = seed;


    return seed;
}

function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


let random; // regenerate で代入される

function rand(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

function regenerate() {
    random = mulberry32(getSeed());

    const ops = getSelectedOpsFromCheckboxes();

    currentProblems = generateProblems(100, ops);

    renderProblems(currentProblems);
    renderAnswers(currentProblems);
}

function updateSeed() {
    const params = new URLSearchParams(location.search);

    const seed = Math.floor(Math.random() * 0xffffffff);

    params.set("seed", seed);

    history.replaceState({}, "", `${location.pathname}?${params}`);

    seedLabel.textContent = seed;
}


function randomOp(ops) {
    return ops[rand(0, ops.length - 1)];
}

function normalizeKey(op, a, b) {
    if (op === "plus" || op === "mul") {
        if (a > b) [a, b] = [b, a];
    }
    return `${op}:${a}:${b}`;
}

function createPlus() {
    const a = rand(10, 99);
    const b = rand(10, 99);

    return {
        op: "plus",
        a,
        b,
        text: `${a} ＋ ${b}`,
        answer: a + b
    };
}

function createMinus() {
    let a = rand(10, 99);
    let b = rand(10, 99);

    if (a < b) [a, b] = [b, a];

    return {
        op: "minus",
        a,
        b,
        text: `${a} − ${b}`,
        answer: a - b
    };
}

function createMul() {
    const a = rand(10, 99);
    const b = rand(10, 99);

    return {
        op: "mul",
        a,
        b,
        text: `${a} × ${b}`,
        answer: a * b
    };
}

function createDiv() {
    const divisor = rand(10, 99);
    const quotient = rand(10, 99);
    const dividend = divisor * quotient;

    return {
        op: "div",
        a: dividend,
        b: divisor,
        text: `${dividend} ÷ ${divisor}`,
        answer: quotient
    };
}

function createProblem(op) {
    switch (op) {
        case "plus":
            return createPlus();

        case "minus":
            return createMinus();

        case "mul":
            return createMul();

        case "div":
            return createDiv();

        default:
            throw new Error(`Unknown operator: ${op}`);
    }
}

function generateProblems(count, ops) {
    const problems = [];
    const used = new Set();

    let safety = 0;

    while (problems.length < count) {

        if (++safety > 50000) {
            throw new Error("問題を十分生成できませんでした。");
        }

        const op = randomOp(ops);
        const problem = createProblem(op);

        const key = normalizeKey(
            problem.op,
            problem.a,
            problem.b
        );

        if (used.has(key)) {
            continue;
        }

        used.add(key);

        problems.push({
            no: problems.length + 1,
            ...problem
        });
    }

    return problems;
}

// ------------------------------
// 描画
// ------------------------------

function renderProblems(problems) {
    const containers = [
        document.getElementById("problems1"),
        document.getElementById("problems2"),
        document.getElementById("problems3"),
        document.getElementById("problems4")
    ];

    containers.forEach(c => c.replaceChildren());

    problems.forEach((problem, index) => {
        const column = Math.floor(index / 25);

        const row = document.createElement("div");
        row.className = "problem";

        const no = document.createElement("span");
        no.className = "no";
        no.textContent = `${problem.no}.`;

        const expr = document.createElement("span");
        expr.className = "expr";

        expr.innerHTML = `
            ${problem.text}
            <span class="blank"> = </span>
        `;

        row.append(no, expr);
        containers[column].appendChild(row);
    });
}

function renderAnswers(problems) {
    const containers = [
        document.getElementById("answers1"),
        document.getElementById("answers2"),
        document.getElementById("answers3"),
        document.getElementById("answers4")
    ];

    containers.forEach(c => c.replaceChildren());

    problems.forEach((problem, index) => {
        const column = Math.floor(index / 25);

        const row = document.createElement("div");
        row.className = "answer";

        const no = document.createElement("span");
        no.className = "no";
        no.textContent = `${problem.no}.`;

        const value = document.createElement("span");
        value.className = "expr";
        value.textContent = problem.answer;

        row.append(no, value);
        containers[column].appendChild(row);
    });
}

// ------------------------------
// 初期化
// ------------------------------
function initialize() {
    applyUrlToCheckboxes();

    checkboxes.forEach(box =>
        box.addEventListener("change", onOperationChanged)
    );

	generateButton.addEventListener("click", () => {
		updateSeed();
	    regenerate();
	});
    printButton.addEventListener("click", () => window.print());

    regenerate();
}

document.addEventListener("DOMContentLoaded", initialize);
