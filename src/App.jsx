import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Binary,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

const OPS = [
  { id: "add", label: "加法", symbol: "+", color: "cyan" },
  { id: "sub", label: "減法", symbol: "−", color: "violet" },
  { id: "mul", label: "乘法", symbol: "×", color: "amber" },
  { id: "div", label: "除法", symbol: "÷", color: "emerald" },
];

const cx = (...items) => items.filter(Boolean).join(" ");
const maskFor = (bits) => 2 ** bits - 1;
const unsigned = (n, bits) => ((n % 2 ** bits) + 2 ** bits) % 2 ** bits;
const signedVal = (n, bits) => { const u = unsigned(n, bits); return u >= 2 ** (bits - 1) ? u - 2 ** bits : u; };
const hex = (n, bits) => "0x" + unsigned(n, bits).toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0");
const bin = (n, bits) => unsigned(n, bits).toString(2).padStart(bits, "0");
const groupBin = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

function BitRow({ value, bits, label, accent = "cyan", active = [], signedLabel }) {
  const colors = {
    cyan: "border-cyan-400/55 bg-cyan-400/10 text-cyan-100 shadow-cyan-500/10",
    violet: "border-violet-400/55 bg-violet-400/10 text-violet-100 shadow-violet-500/10",
    amber: "border-amber-400/55 bg-amber-400/10 text-amber-100 shadow-amber-500/10",
    emerald: "border-emerald-400/55 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/10",
    rose: "border-rose-400/55 bg-rose-400/10 text-rose-100 shadow-rose-500/10",
    slate: "border-slate-600 bg-slate-900/70 text-slate-300",
  };
  const chars = bin(value, bits).split("");
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3 text-xs">
        <div className="font-semibold tracking-wide text-slate-300">{label}</div>
        <div className="font-mono text-slate-500">{signedLabel ?? `十進位 ${unsigned(value, bits)} · ${hex(value, bits)}`}</div>
      </div>
      <div className="grid gap-1.5 overflow-x-auto pb-4" style={{ gridTemplateColumns: `repeat(${bits}, minmax(1.75rem, 1fr))` }}>
        {chars.map((c, i) => (
          <motion.div
            key={`${i}-${c}`}
            initial={{ scale: 0.88, opacity: 0.55 }}
            animate={{ scale: active.includes(i) ? 1.08 : 1 }}
            className={cx(
              "relative flex aspect-square min-h-8 items-center justify-center rounded-lg border font-mono text-sm font-bold shadow-lg sm:min-h-10 sm:text-base",
              colors[accent],
              active.includes(i) && "ring-2 ring-white/70"
            )}
          >
            {c}
            <span className="absolute -bottom-4 font-sans text-[8px] font-normal text-slate-600">{bits - 1 - i}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CarryRow({ carries, bits }) {
  const shown = Array(bits).fill(0).map((_, i) => carries[i] ?? "");
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-rose-300">Carry 進位訊號 ←</div>
      <div className="grid gap-1.5 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${bits}, minmax(1.75rem, 1fr))` }}>
        {shown.map((c, i) => (
          <motion.div
            key={`${i}-${c}`}
            animate={c === 1 ? { y: [0, -4, 0], opacity: 1 } : { opacity: 0.2 }}
            className="flex h-5 items-center justify-center rounded border border-rose-400/30 bg-rose-400/10 font-mono text-xs text-rose-200"
          >{c}</motion.div>
        ))}
      </div>
    </div>
  );
}

function FlagsRow({ A, B, bits }) {
  const sum = A + B;
  const u = unsigned(sum, bits);
  const msb = (x) => (unsigned(x, bits) >> (bits - 1)) & 1;
  const flags = [
    { k: "C", v: sum > maskFor(bits) ? 1 : 0, tip: "Carry：最高位進位＝無號溢位" },
    { k: "V", v: msb(A) === msb(B) && msb(sum) !== msb(A) ? 1 : 0, tip: "oVerflow：有號溢位（兩同號相加變號）" },
    { k: "Z", v: u === 0 ? 1 : 0, tip: "Zero：結果為 0" },
    { k: "N", v: msb(sum), tip: "Negative：最高位為 1（有號解讀為負）" },
  ];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Status flags 狀態旗標</div>
      <div className="grid gap-2 sm:grid-cols-4">
        {flags.map(({ k, v, tip }) => (
          <div key={k} className={cx("rounded-xl border p-2.5 text-center", v ? "border-rose-400/40 bg-rose-400/10" : "border-slate-800 bg-slate-900/60")}>
            <div className={cx("font-mono text-lg font-black", v ? "text-rose-200" : "text-slate-600")}>{k} = {v}</div>
            <div className="mt-1 text-[10px] leading-4 text-slate-500">{tip}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">C 與 V 是兩件事：C 看「無號」是否超過 {maskFor(bits)}，V 看「有號」是否超出 {-(2 ** (bits - 1))}～{2 ** (bits - 1) - 1}。試試 200 + 100 觀察兩者差異。</p>
    </div>
  );
}

function SliderField({ label, value, setValue, max, disabled = false }) {
  const clamp = (n) => Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));
  return (
    <label className={cx("block rounded-2xl border border-slate-800 bg-slate-950/45 p-4", disabled && "opacity-50")}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <input
          type="number" min="0" max={max} value={value} disabled={disabled}
          onChange={(e) => setValue(clamp(e.target.value))}
          className="w-24 rounded-lg bg-slate-800 px-3 py-1 text-right font-mono text-lg font-bold text-white outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      <input
        type="range" min="0" max={max} value={value} disabled={disabled}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
      />
      <div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>0</span><span>{max}</span></div>
    </label>
  );
}

function explainAdd(A, B, bits) {
  const steps = [{ title: "載入暫存器", text: "CPU 將兩個運算元載入 A、B 暫存器，從最低有效位元（最右側）準備開始。", col: -1, carries: [] }];
  let carry = 0;
  const carries = Array(bits).fill("");
  for (let k = 0; k < bits; k++) {
    const ai = (A >> k) & 1, bi = (B >> k) & 1;
    const before = carry;
    const sum = ai + bi + carry;
    carry = sum >= 2 ? 1 : 0;
    if (k + 1 < bits) carries[bits - 2 - k] = carry;
    steps.push({ title: `第 ${k + 1} 位：全加器運算`, text: `${ai} + ${bi} + 進位 ${before} = ${sum}，寫入 ${sum & 1}${carry ? "，並向左送出進位 1" : "，不產生進位"}。`, col: bits - 1 - k, carries: [...carries] });
  }
  steps.push({ title: "運算完成", text: carry ? `最高位仍有進位 ${carry}；在固定 ${bits} 位元中會形成溢位旗標。` : "每一位的結果已寫回結果暫存器，沒有無號溢位。", col: -1, carries: [...carries] });
  return steps;
}

function twosSteps(A, B, bits) {
  const negB = unsigned(-B, bits);
  const steps = [
    { title: "載入 A 與 B", text: "減法器不必是獨立電路：接下來把 B 轉為二補數，再交給同一個加法器。這正是二補數的第一個好處——減法可以共用加法硬體。", stage: 0, col: -1, carries: [] },
    { title: "步驟 1：逐位反相", text: `B = ${bin(B,bits)}，每個 0、1 互換，得到 ${bin((~B) & maskFor(bits),bits)}。`, stage: 1, col: -1, carries: [] },
    { title: "步驟 2：末位加 1", text: `反相結果再加 1，得到 −B 的 ${bits} 位元二補數 ${bin(negB,bits)}。（若用「一補數」只反相不加 1，會出現 +0 與 −0 兩種零；二補數的零唯一，這是它的第二個好處。）`, stage: 2, col: -1, carries: [] },
    { title: "步驟 3：交給加法器", text: `接下來用同一組全加器逐位計算 A + (−B)，符號位和其他位元一視同仁地參與運算。`, stage: 3, col: -1, carries: [] },
  ];
  let carry = 0;
  const carries = Array(bits).fill("");
  for (let k = 0; k < bits; k++) {
    const ai = (A >> k) & 1, bi = (negB >> k) & 1;
    const before = carry;
    const sum = ai + bi + carry;
    carry = sum >= 2 ? 1 : 0;
    if (k + 1 < bits) carries[bits - 2 - k] = carry;
    steps.push({ title: `第 ${k + 1} 位：全加器運算`, text: `${ai} + ${bi} + 進位 ${before} = ${sum}，寫入 ${sum & 1}${carry ? "，並向左送出進位 1" : "，不產生進位"}。`, stage: 3, col: bits - 1 - k, carries: [...carries] });
  }
  steps.push({ title: "減法完成", text: `${carry ? "超出最左側的進位 1 直接捨棄，" : ""}同一組加法電路完成了減法。同一組位元有兩種讀法：無號 ${unsigned(A - B, bits)}，有號（二補數）${signedVal(A - B, bits)}；${bits}-bit 有號範圍是 ${-(2 ** (bits - 1))}～${2 ** (bits - 1) - 1}。`, stage: 4, col: -1, carries: [...carries] });
  return steps;
}

function mulSteps(A, B, bits) {
  const steps = [{ title: "初始化", text: "乘積暫存器清為 0，逐位檢查乘數 B（由右到左）。", part: 0, shift: 0 }];
  let acc = 0;
  for (let k = 0; k < bits; k++) {
    const bit = (B >> k) & 1;
    const part = bit ? A << k : 0;
    acc += part;
    steps.push({ title: `檢查 B 的第 ${k} 位：${bit}`, text: bit ? `位元是 1：把 A 左移 ${k} 位後加入累加器。` : `位元是 0：這一列的部分積全為 0，不需要相加。`, part, shift: k, acc });
  }
  steps.push({ title: "乘法完成", text: "所有部分積已對齊並相加。乘法其實就是「檢查位元、左移、重複加法」。", part: 0, shift: -1, acc: A * B });
  return steps;
}

function divSteps(A, B, bits) {
  if (B === 0) return [{ title: "無法除以 0", text: "除數為 0 時，硬體會觸發除零例外；請把 B 調整為至少 1。", error: true }];
  const steps = [{ title: "初始化長除法", text: "餘數 R = 0，商 Q = 0；從被除數 A 的最高位元開始拉下。", r: 0, q: 0 }];
  let r = 0, q = 0;
  for (let k = bits - 1; k >= 0; k--) {
    r = (r << 1) | ((A >> k) & 1);
    const pulled = r;
    let accepted = false;
    if (r >= B) { r -= B; q |= 1 << k; accepted = true; }
    steps.push({ title: `拉下第 ${k} 位，再試減`, text: `R 左移並拉下 ${((A >> k) & 1)}，成為 ${pulled}。${accepted ? `可減去 B=${B}，商的第 ${k} 位寫 1。` : `小於 B=${B}，商的第 ${k} 位寫 0，保留餘數。`}`, r, q, pulled, accepted, col: bits - 1 - k });
  }
  steps.push({ title: "除法完成", text: `商為 ${q}，餘數為 ${r}。除法就是「左移、比較、試減、寫入商位元」的循環。`, r, q });
  return steps;
}

export default function App() {
  const [op, setOp] = useState("add");
  const [bits, setBits] = useState(8);
  const [A, setA] = useState(13);
  const [B, setB] = useState(6);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const max = maskFor(bits);
  useEffect(() => { setA((x) => Math.min(x, max)); setB((x) => Math.min(x, max)); setStep(0); setPlaying(false); }, [bits, max]);
  useEffect(() => { setStep(0); setPlaying(false); }, [op, A, B]);

  const steps = useMemo(() => {
    if (op === "add") return explainAdd(A, B, bits);
    if (op === "sub") return twosSteps(A, B, bits);
    if (op === "mul") return mulSteps(A, B, bits);
    return divSteps(A, B, bits);
  }, [op, A, B, bits]);

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 1050 / speed);
    return () => clearTimeout(t);
  }, [playing, step, steps.length, speed]);

  const current = steps[Math.min(step, steps.length - 1)];
  const result = op === "add" ? A + B : op === "sub" ? A - B : op === "mul" ? A * B : B ? Math.floor(A / B) : null;

  const reset = () => { setA(13); setB(6); setStep(0); setPlaying(false); };
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(139,92,246,.10),transparent_25%)]" />
      <header className="relative border-b border-slate-800/80 bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3 shadow-xl shadow-cyan-500/10"><Cpu className="h-7 w-7 text-cyan-300" /></div>
            <div><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-cyan-300"><Sparkles className="h-3.5 w-3.5" /> Interactive ALU Lab</div><h1 className="text-xl font-black tracking-tight sm:text-2xl">二進位 CPU 運算步進模擬器</h1><p className="mt-1 text-sm text-slate-500">在人類的數學直覺與晶片底層電路之間，搭一座看得見的橋。</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1.5">
            <span className="px-2 text-xs text-slate-500">字長</span>
            {[4, 8].map((n) => <button key={n} onClick={() => setBits(n)} className={cx("rounded-lg px-3 py-2 text-xs font-bold transition", bits === n ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:bg-slate-800")}>{n}-bit</button>)}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-6">
        <nav className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/55 p-2 sm:grid-cols-4">
          {OPS.map((item) => <button key={item.id} onClick={() => setOp(item.id)} className={cx("flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all", op === item.id ? "bg-white text-slate-950 shadow-lg" : "text-slate-400 hover:bg-slate-800 hover:text-white")}><span className="font-mono text-lg">{item.symbol}</span>{item.label}</button>)}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Calculator className="h-4 w-4 text-cyan-300" />輸入運算元</h2><button onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white" title="重設"><RotateCcw className="h-4 w-4" /></button></div>
              <div className="space-y-3"><SliderField label="暫存器 A" value={A} setValue={setA} max={max} /><SliderField label="暫存器 B" value={B} setValue={setB} max={max} /></div>
              <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.06] p-4">
                <div className="text-xs text-slate-500">人類看到的算式</div>
                <div className="mt-1 font-mono text-2xl font-black text-white">{A} {OPS.find(x=>x.id===op)?.symbol} {B} = {result === null ? "錯誤" : op === "div" && B ? `${result} … ${A % B}` : result}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{hex(A,bits)} {OPS.find(x=>x.id===op)?.symbol} {hex(B,bits)}{result !== null && ` = ${hex(result, op==="mul"?bits*2:bits)}`}</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-200"><Lightbulb className="h-4 w-4" />這一頁要看什麼？</div>
              <p className="text-sm leading-6 text-slate-400">{op === "add" ? "觀察進位如何從右向左，像骨牌般傳入下一個全加器；並留意 C（無號溢位）與 V（有號溢位）是兩個不同的旗標。" : op === "sub" ? "觀察 B 如何經過反相、加 1 變成 −B，再由同一個加法器逐位算出 A + (−B)——減法其實是加法。" : op === "mul" ? "觀察乘數的每個 1，如何產生左移並對齊的部分積。" : "觀察餘數如何左移、試減除數，再逐位決定商是 0 或 1。"}</p>
            </section>
          </aside>

          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 shadow-2xl">
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><div className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">CPU datapath · clock {step}</div><h2 className="mt-1 text-xl font-black">{current.title}</h2></div>
                <div className="flex items-center gap-2">
                  <button onClick={prev} disabled={step===0} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 disabled:opacity-25 hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => { if(step === steps.length-1) setStep(0); setPlaying(x=>!x); }} className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-300">{playing ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}{playing ? "暫停" : step===steps.length-1 ? "重播" : "自動播放"}</button>
                  <button onClick={next} disabled={step===steps.length-1} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 disabled:opacity-25 hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
                  <button onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))} className="rounded-xl border border-slate-700 px-3 py-2.5 font-mono text-xs font-bold text-slate-300 hover:bg-slate-800" title="播放速度">{speed}x</button>
                </div>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800"><motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" animate={{ width: `${((step+1)/steps.length)*100}%` }} /></div>
              <div className="mt-2 text-right text-[10px] font-mono text-slate-600">STEP {step+1} / {steps.length}</div>
            </div>

            <div className="p-5 sm:p-8">
              <AnimatePresence mode="wait"><motion.div key={`${op}-${step}`} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} className="mb-7 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300"><span className="mr-2 inline-flex rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">微指令</span>{current.text}</motion.div></AnimatePresence>

              <div className="space-y-7">
                {op === "add" && <>
                  {current.carries && <CarryRow carries={current.carries} bits={bits}/>}
                  <BitRow value={A} bits={bits} label="暫存器 A（被加數）" accent="cyan" active={current.col>=0?[current.col]:[]} />
                  <BitRow value={B} bits={bits} label="暫存器 B（加數）" accent="violet" active={current.col>=0?[current.col]:[]} />
                  <div className="border-t border-dashed border-slate-700 pt-5"><BitRow value={A+B} bits={bits} label="SUM 結果暫存器" accent="emerald" active={current.col>=0?[current.col]:[]} signedLabel={`無號 ${unsigned(A+B,bits)} · 有號 ${signedVal(A+B,bits)} · ${hex(A+B,bits)}`} /></div>
                  <FlagsRow A={A} B={B} bits={bits} />
                </>}

                {op === "sub" && <>
                  {current.stage>=3 && <CarryRow carries={current.carries} bits={bits}/>}
                  <BitRow value={A} bits={bits} label="暫存器 A" accent="cyan" active={current.col>=0?[current.col]:[]} />
                  <BitRow value={B} bits={bits} label="原始 B" accent={current.stage>=1?"slate":"violet"} />
                  {current.stage>=1 && current.stage<3 && <BitRow value={(~B)&max} bits={bits} label="NOT B（逐位反相）" accent={current.stage===1?"violet":"slate"} />}
                  {current.stage>=2 && <BitRow value={(-B)&max} bits={bits} label="二補數 −B（反相加 1）" accent={current.stage===2?"amber":"violet"} active={current.col>=0?[current.col]:[]} />}
                  {current.stage>=3 && <div className="border-t border-dashed border-slate-700 pt-5"><BitRow value={A-B} bits={bits} label="A + (−B) 結果" accent="emerald" active={current.col>=0?[current.col]:[]} signedLabel={`無號 ${unsigned(A-B,bits)} · 有號 ${signedVal(A-B,bits)} · ${hex(A-B,bits)}`} /></div>}
                  {current.stage>=4 && <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[.06] p-4 text-sm leading-6 text-slate-400"><span className="font-bold text-cyan-200">為什麼用二補數？</span>①減法共用同一個加法器，不必另做減法電路；②零的表示唯一（一補數會有 +0/−0）；③符號位可直接參與運算，不需特殊處理。同一組位元的解讀由程式決定：無號 0～{max}，有號 {-(2**(bits-1))}～{2**(bits-1)-1}。</div>}
                </>}

                {op === "mul" && <>
                  <BitRow value={A} bits={bits} label="被乘數 A" accent="cyan" />
                  <BitRow value={B} bits={bits} label="乘數 B（逐位掃描）" accent="violet" active={current.shift>=0?[bits-1-current.shift]:[]} />
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Partial products 部分積</div>
                    <div className="space-y-1 font-mono text-sm">
                      {Array.from({length: bits},(_,k)=>{ const part=((B>>k)&1)?A<<k:0; return <div key={k} className={cx("flex items-center justify-between rounded-lg px-3 py-1.5 transition", current.shift===k?"bg-amber-400/15 text-amber-100":"text-slate-600")}><span>B[{k}] = {(B>>k)&1}</span><span>{groupBin(bin(part,bits*2))}</span></div> })}
                    </div>
                  </div>
                  <BitRow value={current.acc??0} bits={bits*2} label="累加器 ACC" accent="emerald" signedLabel={`目前累加：${current.acc??0} · ${hex(current.acc??0,bits*2)}`} />
                  <p className="text-xs leading-5 text-slate-500">積暫存器需要 {bits*2} 位：兩個 {bits} 位數相乘最大可達 {max} × {max} = {max*max}。本頁的「移位—相加」是教學模型；真實 CPU 多用 Booth 編碼或 Wallace tree 在更少的時脈內完成。</p>
                </>}

                {op === "div" && <>
                  {B===0 ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-8 text-center text-rose-200"><Zap className="mx-auto mb-3 h-8 w-8"/><div className="font-bold">Divide-by-zero exception</div><div className="mt-2 text-sm text-rose-300/70">硬體停止本次運算，避免產生無定義結果。</div></div> : <>
                    <BitRow value={A} bits={bits} label="被除數 A" accent="cyan" active={current.col>=0?[current.col]:[]} />
                    <BitRow value={B} bits={bits} label="除數 B" accent="violet" />
                    <div className="grid gap-5 border-t border-dashed border-slate-700 pt-5 sm:grid-cols-2"><BitRow value={current.q??0} bits={bits} label="商暫存器 Q" accent="emerald" signedLabel={`目前商：${current.q??0}`} /><BitRow value={current.r??0} bits={bits} label="餘數暫存器 R" accent="amber" signedLabel={`目前餘數：${current.r??0}`} /></div>
                    {current.pulled !== undefined && <div className={cx("rounded-xl border p-3 text-center text-sm font-semibold",current.accepted?"border-emerald-400/30 bg-emerald-400/10 text-emerald-200":"border-amber-400/30 bg-amber-400/10 text-amber-200")}>比較器：{current.pulled} {current.accepted?"≥":"<"} {B}　→　{current.accepted?"允許減法，寫入 1":"恢復餘數，寫入 0"}</div>}
                  </>}
                </>}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[{icon:Binary,title:"硬體只需要 0 與 1",text:"位元對應電路的低、高電位；暫存器則負責保存一組位元。"},{icon:Zap,title:"複雜運算拆成微指令",text:"移位、比較、反相與加法反覆組合，就能建構四則運算。"},{icon:Cpu,title:"ALU 是共同核心",text:"不同運算共享加法器與資料路徑，以更少的硬體完成更多工作。"}].map(({icon:Icon,title,text})=><div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><Icon className="mb-3 h-5 w-5 text-cyan-300"/><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}
        </section>
      </main>
      <footer className="relative mx-auto max-w-7xl px-5 py-8 text-center text-xs text-slate-700">Educational simulation · 固定字長下的位元行為為簡化教學模型</footer>
    </div>
  );
}
