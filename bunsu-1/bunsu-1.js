// ------------------------------
// 基本処理
// ------------------------------

const OP_TYPES = ["plus", "minus"];
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

// 新しい描画専用関数を追加
function updateQrCode() {
    new QRious({
        element: document.getElementById('qr'),
        value: window.location.href
    });
}

function updateUrl(selectedOps) {
    const params = new URLSearchParams(location.search);
    params.set("op", selectedOps.join(","));
    history.replaceState({}, "", `${location.pathname}?${params}`);
	updateQrCode();
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

// ------------------------------
// シード処理
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

let random;
function rand(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

function updateSeed() {
    const params = new URLSearchParams(location.search);
    const seed = Math.floor(Math.random() * 0xffffffff);
    params.set("seed", seed);
    history.replaceState({}, "", `${location.pathname}?${params}`);
    seedLabel.textContent = seed;
}

function regenerate() {
    random = mulberry32(getSeed());
    const ops = getSelectedOpsFromCheckboxes();
    currentProblems = generateProblems(20, ops);

    renderProblems(currentProblems);
    renderAnswers(currentProblems);

    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
	updateQrCode();
}


// ------------------------------
// 問題生成ロジック
// ------------------------------
function randomOp(ops) {
    return ops[rand(0, ops.length - 1)];
}

function normalizeKey(op, a, b, d) {
    if (op === "plus") {
        if (a > b) [a, b] = [b, a];
    }
    return `${op}:${a}:${b}:${d}`;
}

function createPlus(d) {
    const n1 = rand(1, d - 1);
    const n2 = rand(1, d - 1);
    return {
        op: "plus",
        n1, n2, d,
        text: `\\( \\frac{${n1}}{${d}} + \\frac{${n2}}{${d}} \\)`,
        answer: `\\( \\frac{${n1 + n2}}{${d}} \\)`
    };
}

function createMinus(d) {
    let n1 = rand(1, d - 1);
    let n2 = rand(1, d - 1);
    
    if (n1 <= n2) {
        if (n1 === n2) {
            if (n1 === d - 1) n2--;
            else n1++;
        } else {
            [n1, n2] = [n2, n1];
        }
    }
    return {
        op: "minus",
        n1, n2, d,
        text: `\\( \\frac{${n1}}{${d}} − \\frac{${n2}}{${d}} \\)`,
        answer: `\\( \\frac{${n1 - n2}}{${d}} \\)`
    };
}


function createProblem(op) {
	const d = (op === "minus") ? rand(3, 12) : rand(2, 12);
    if (op === "plus") return createPlus(d);
    if (op === "minus") return createMinus(d);
    throw new Error(`Unknown operator: ${op}`);
}

function generateProblems(count, ops) {
    const problems = [];
    const used = new Set();
    let safety = 0;

    while (problems.length < count) {
        if (++safety > 50000) break;

        const op = randomOp(ops);
        const problem = createProblem(op);
        const key = normalizeKey(problem.op, problem.n1, problem.n2, problem.d);

        if (used.has(key)) continue;
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
        document.getElementById("problems2")
    ];

    containers.forEach(c => c.replaceChildren());

    problems.forEach((problem, index) => {
        const column = Math.floor(index / 10);
        const row = document.createElement("div");
        row.className = "problem";
        
        const no = document.createElement("span");
        no.className = "no";
        no.textContent = `${problem.no}.`;
        
        const expr = document.createElement("span");
        expr.className = "expr";
        expr.innerHTML = `${problem.text} <span class="blank"> = </span>`;
        
        row.append(no, expr);
        containers[column].appendChild(row);
    });
}

function renderAnswers(problems) {
    const containers = [
        document.getElementById("answers1"),
        document.getElementById("answers2")
    ];

    containers.forEach(c => c.replaceChildren());

    problems.forEach((problem, index) => {
        const column = Math.floor(index / 10);
        const row = document.createElement("div");
        row.className = "answer";

        const no = document.createElement("span");
        no.className = "no";
        no.textContent = `${problem.no}.`;

        const value = document.createElement("span");
        value.className = "expr";
        value.innerHTML = problem.answer;

        row.append(no, value);
        containers[column].appendChild(row);
    });
}

// ------------------------------
// 初期化
// ------------------------------
function initialize() {
    applyUrlToCheckboxes();
    checkboxes.forEach(box => box.addEventListener("change", onOperationChanged));

    generateButton.addEventListener("click", () => {
        updateSeed();
        regenerate();
    });
    printButton.addEventListener("click", () => window.print());

    regenerate();
	updateQrCode();
}

document.addEventListener("DOMContentLoaded", initialize);
