"""產生 PDF A（學習教材與 100 題題庫，不含答案）與 PDF B（100 題答案解析）。

用法：
  npx tsx scripts/export-content.ts pdf-build/content.json
  python3 scripts/build_pdfs.py

需求：pip install weasyprint，並安裝 Noto Sans CJK TC 字型。
輸出：
  public/downloads/osh-learning-and-questions.pdf   公開下載，不含答案
  content-private/pdf-b-answers.pdf                 含答案，上傳到 Supabase Storage 的 private-docs
"""

from __future__ import annotations

import html
import json
import sys
from datetime import date
from pathlib import Path

from weasyprint import HTML

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "pdf-build" / "content.json"
QUESTIONS = ROOT / "content-private" / "questions.private.json"
OUT_A = ROOT / "public" / "downloads" / "osh-learning-and-questions.pdf"
OUT_B = ROOT / "content-private" / "pdf-b-answers.pdf"

STAGE_NAMES = "一二三四五"
TYPE_NAMES = {"concept": "基本觀念", "practice": "實務應用", "scenario": "情境判斷"}
TITLE = "職業安全衛生學習與測驗"
TODAY = date.today().isoformat()

CSS = """
@page {
  size: A5 portrait;
  margin: 15mm 13mm 16mm 13mm;
  @bottom-center { content: counter(page); font-size: 8pt; color: #64748b; }
  @top-right { content: string(stage); font-size: 7.5pt; color: #64748b; }
}
@page :first { @bottom-center { content: none; } @top-right { content: none; } }
html { font-family: "Noto Sans CJK TC", "Noto Sans TC", sans-serif; font-size: 9.5pt; line-height: 1.6; color: #1e293b; }
h1, h2, h3, h4 { line-height: 1.35; color: #0f172a; break-after: avoid; }
h1 { font-size: 15pt; margin: 0 0 3mm; string-set: stage content(); }
h2 { font-size: 11.5pt; margin: 5mm 0 2mm; padding-bottom: 1mm; border-bottom: 0.4pt solid #0f766e; color: #115e59; }
h3 { font-size: 10pt; margin: 3.5mm 0 1.5mm; }
p { margin: 0 0 1.8mm; }
ul, ol { margin: 0 0 2mm; padding-left: 5mm; }
li { margin-bottom: 0.6mm; }
.cover { height: 170mm; display: flex; flex-direction: column; justify-content: center; }
.cover .t { font-size: 20pt; font-weight: 700; color: #115e59; line-height: 1.3; }
.cover .s { font-size: 11pt; margin-top: 4mm; }
.cover .m { margin-top: 10mm; font-size: 8.5pt; color: #475569; }
.stage { break-before: page; }
.pages { font-size: 7.5pt; color: #64748b; font-weight: 400; margin-left: 1.5mm; white-space: nowrap; }
table { width: 100%; border-collapse: collapse; margin: 1mm 0 2.5mm; font-size: 8.5pt; }
th, td { border: 0.4pt solid #cbd5e1; padding: 1.2mm 1.5mm; text-align: left; vertical-align: top; }
th { background: #f1f5f9; }
table.two th:first-child, table.two td:first-child { width: 27%; }
table.three th:first-child, table.three td:first-child { width: 24%; }
tr { break-inside: avoid; }
.verify { border: 0.6pt solid #f59e0b; background: #fffbeb; padding: 2mm 2.5mm; margin: 1.5mm 0 2.5mm; font-size: 8.5pt; break-inside: avoid; }
.verify b { color: #92400e; }
.src { font-size: 7.5pt; color: #64748b; margin-top: 1mm; word-break: break-all; }
.verify .src { color: #78350f; }
.note { font-size: 8.5pt; color: #475569; }
.case { border: 0.4pt solid #cbd5e1; padding: 2.5mm; margin: 2mm 0 3mm; }
.case h4 { margin: 0 0 1mm; font-size: 9.5pt; }
.tag { font-size: 7pt; padding: 0.3mm 1.5mm; border-radius: 1mm; background: #e2e8f0; margin-right: 1mm; }
.lesson { background: #f0fdfa; padding: 1.5mm 2mm; font-size: 8.5pt; }
.q { break-inside: avoid; margin: 0 0 3.2mm; }
.q .stem { font-weight: 700; margin-bottom: 0.8mm; }
.q .meta { font-size: 7pt; color: #64748b; font-weight: 400; }
.q ol { list-style: none; padding-left: 3mm; margin: 0; }
.q li { margin: 0.3mm 0; }
.ans { margin-top: 1mm; font-size: 8.5pt; }
.ans .key { display: inline-block; font-weight: 700; color: #fff; background: #0f766e; padding: 0 1.8mm; border-radius: 1mm; }
.ans .exp { margin-top: 0.8mm; background: #f8fafc; padding: 1.5mm 2mm; }
.ans .warn { color: #92400e; }
.steps li { margin-bottom: 1mm; }
"""


def e(text: object) -> str:
    return html.escape(str(text))


def fmt_pages(pages: list[int]) -> str:
    pages = sorted(set(pages))
    parts, start, prev = [], pages[0], pages[0]
    for p in pages[1:]:
        if p == prev + 1:
            prev = p
            continue
        parts.append(f"P{start}" if start == prev else f"P{start}–P{prev}")
        start = prev = p
    parts.append(f"P{start}" if start == prev else f"P{start}–P{prev}")
    return "、".join(parts)


def sources_html(sources: list[dict]) -> str:
    return "".join(f'<div class="src">來源：{e(s["label"])}<br>{e(s["url"])}<br>查證日期 {e(s["checked"])}</div>' for s in sources)


def block_html(b: dict) -> str:
    t = b["type"]
    if t == "p":
        return f"<p>{e(b['text'])}</p>"
    if t == "list":
        tag = "ol" if b.get("ordered") else "ul"
        return f"<{tag}>" + "".join(f"<li>{e(i)}</li>" for i in b["items"]) + f"</{tag}>"
    if t == "table":
        head = "".join(f"<th>{e(h)}</th>" for h in b["headers"])
        rows = "".join("<tr>" + "".join(f"<td>{e(c)}</td>" for c in r) + "</tr>" for r in b["rows"])
        cls = "two" if len(b["headers"]) == 2 else "three" if len(b["headers"]) == 3 else ""
        return f'<table class="{cls}"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>'
    if t == "steps":
        items = "".join(
            f"<li><b>{e(s['title'])}</b>{('：' + e(s['text'])) if s.get('text') else ''}</li>" for s in b["items"]
        )
        return f'<ol class="steps">{items}</ol>'
    if t == "verify":
        return f'<div class="verify"><b>需確認現行規範</b><br>{e(b["text"])}{sources_html(b.get("sources", []))}</div>'
    if t == "note":
        return f'<p class="note">{e(b["text"])}</p>'
    raise ValueError(t)


def stage_material(s: dict) -> str:
    out = [f'<section class="stage"><h1>階段{STAGE_NAMES[s["id"] - 1]}　{e(s["title"])}</h1>']
    out.append(f'<p>{e(s["intro"])}</p><p class="note">原始教材對應：{e(s["pageRange"])}</p>')
    out.append("<h2>學習目標</h2><ul>" + "".join(f"<li>{e(o)}</li>" for o in s["objectives"]) + "</ul>")
    out.append("<h2>核心觀念</h2>")
    for sec in s["sections"]:
        out.append(f'<h3>{e(sec["title"])}<span class="pages">{fmt_pages(sec["pages"])}</span></h3>')
        out.extend(block_html(b) for b in sec["blocks"])
    out.append("<h2>重要名詞</h2><table class=\"two\"><thead><tr><th>名詞</th><th>說明</th></tr></thead><tbody>")
    out.extend(
        f'<tr><td>{e(t["term"])}</td><td>{e(t["definition"])}<span class="pages">{fmt_pages(t["pages"])}</span></td></tr>'
        for t in s["terms"]
    )
    out.append("</tbody></table><h2>實際工作案例</h2>")
    for c in s["cases"]:
        kind = "真實案例" if c["kind"] == "real" else "教材範例"
        out.append(f'<div class="case"><h4><span class="tag">{kind}</span>{e(c["title"])}</h4>')
        out.extend(f"<p>{e(f)}</p>" for f in c["facts"])
        for a in c["analysis"]:
            out.append(f'<p><b>{e(a["label"])}</b></p><ul>' + "".join(f"<li>{e(i)}</li>" for i in a["items"]) + "</ul>")
        out.append(f'<p class="lesson"><b>學習重點：</b>{e(c["lesson"])}</p>')
        if c.get("source"):
            out.append(f'<p class="note">{sources_html([c["source"]])}</p>')
        out.append("</div>")
    out.append("<h2>重點整理</h2><ol>" + "".join(f"<li>{e(k)}</li>" for k in s["keyPoints"]) + "</ol>")
    return "".join(out)


def question_html(q: dict, n: int, with_answer: bool) -> str:
    opts = "".join(f"<li>（{o['key']}）{e(o['text'])}</li>" for o in q["options"])
    meta = f'<span class="meta">　{TYPE_NAMES[q["type"]]}・{fmt_pages(q["pages"])}</span>'
    body = f'<div class="q"><div class="stem">{n}. {e(q["stem"])}{meta}</div><ol>{opts}</ol>'
    if with_answer:
        warn = '<br><span class="warn">本題涉及可能變動的規範，請以現行法規或公告為準。</span>' if q.get("needsVerification") else ""
        body += (
            f'<div class="ans"><span class="key">答案 {q["answer"]}</span>'
            f'<div class="exp">{e(q["explanation"])}<br><span class="note">教材 {fmt_pages(q["pages"])}</span>{warn}</div></div>'
        )
    return body + "</div>"


def cover(subtitle: str, lines: list[str]) -> str:
    meta = "".join(f"<div>{e(x)}</div>" for x in lines)
    return f'<div class="cover"><div class="t">{TITLE}</div><div class="s">{e(subtitle)}</div><div class="m">{meta}</div></div>'


def build_a(stages: list[dict], questions: list[dict]) -> str:
    parts = [
        cover(
            "PDF A　五階段學習教材與 100 題題庫",
            [
                "內容依據：一般安全衛生教育訓練教材（112 頁）",
                "本冊不含答案與解析",
                "標示「需確認現行規範」之內容，請以現行法規或公告為準",
                f"製作日期：{TODAY}",
            ],
        )
    ]
    for s in stages:
        parts.append(stage_material(s))
        qs = [q for q in questions if q["stage"] == s["id"]]
        parts.append(f'<h2 style="break-before: page">階段{STAGE_NAMES[s["id"] - 1]}練習題　共 {len(qs)} 題</h2>')
        parts.extend(question_html(q, i + 1, False) for i, q in enumerate(qs))
        parts.append("</section>")
    return "".join(parts)


def build_b(questions: list[dict]) -> str:
    parts = [
        cover(
            "PDF B　100 題答案解析",
            ["本冊含正式答案，僅供管理者使用，請勿公開散布", f"製作日期：{TODAY}"],
        )
    ]
    for sid in range(1, 6):
        qs = [q for q in questions if q["stage"] == sid]
        parts.append(f'<section class="stage"><h1>階段{STAGE_NAMES[sid - 1]}　答案解析</h1>')
        parts.append(
            "<table><thead><tr>"
            + "".join(f"<th>{i + 1}</th>" for i in range(10))
            + "</tr></thead><tbody><tr>"
            + "".join(f"<td>{q['answer']}</td>" for q in qs[:10])
            + "</tr></tbody><thead><tr>"
            + "".join(f"<th>{i + 11}</th>" for i in range(10))
            + "</tr></thead><tbody><tr>"
            + "".join(f"<td>{q['answer']}</td>" for q in qs[10:20])
            + "</tr></tbody></table>"
        )
        parts.extend(question_html(q, i + 1, True) for i, q in enumerate(qs))
        parts.append("</section>")
    return "".join(parts)


def render(body: str, out: Path) -> None:
    doc = f'<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'
    out.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=doc, base_url=str(ROOT)).write_pdf(out)
    print(f"已產生 {out.relative_to(ROOT)}")


def main() -> int:
    stages = json.loads(CONTENT.read_text(encoding="utf-8"))
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    if len(questions) != 100:
        print("題庫應為 100 題", file=sys.stderr)
        return 1
    public_questions = [{k: v for k, v in q.items() if k not in ("answer", "explanation", "needsVerification")} for q in questions]
    render(build_a(stages, public_questions), OUT_A)
    render(build_b(questions), OUT_B)
    return 0


if __name__ == "__main__":
    sys.exit(main())
