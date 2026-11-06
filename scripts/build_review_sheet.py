"""產生題庫審核表（Excel），每題附上原始教材對應頁的文字，方便逐題核對。

用法：python3 scripts/build_review_sheet.py <教材逐頁文字檔>
  逐頁文字檔格式：每頁以「=====P頁碼」開頭（可用 pdftotext 逐頁擷取產生）
輸出：content-private/question-review.private.xlsx（含答案，請勿公開）
"""

import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = ROOT / "content-private" / "questions.private.json"
OUT = ROOT / "content-private" / "question-review.private.xlsx"
TYPE_NAMES = {"concept": "基本觀念", "practice": "實務應用", "scenario": "情境判斷"}


def load_pages(path: Path) -> dict[int, str]:
    pages: dict[int, str] = {}
    current = None
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"=====P(\d+)", line)
        if m:
            current = int(m.group(1))
            pages[current] = ""
        elif current is not None:
            pages[current] += line.strip() + " "
    return pages


def main() -> int:
    pages = load_pages(Path(sys.argv[1])) if len(sys.argv) > 1 else {}
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8"))

    wb = Workbook()
    ws = wb.active
    ws.title = "題庫審核"
    headers = ["題號", "階段", "題型", "難度", "題目", "A", "B", "C", "D", "正確答案", "解析", "教材頁碼",
               "教材原文（自動擷取，圖片頁需對照原始 PDF）", "涉及可能變動的規範", "審核結果", "審核意見"]
    ws.append(headers)
    for q in questions:
        opts = {o["key"]: o["text"] for o in q["options"]}
        excerpt = "\n\n".join(f"【P{p}】{pages.get(p, '').strip() or '（此頁為圖片，請對照原始 PDF）'}" for p in q["pages"])
        ws.append([
            q["id"], q["stage"], TYPE_NAMES[q["type"]], q["difficulty"], q["stem"],
            opts["A"], opts["B"], opts["C"], opts["D"], q["answer"], q["explanation"],
            "、".join(f"P{p}" for p in q["pages"]), excerpt[:1500],
            "是" if q.get("needsVerification") else "", "", "",
        ])

    widths = [8, 6, 9, 6, 36, 22, 22, 22, 22, 8, 36, 10, 60, 10, 10, 24]
    for i, w in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = w
    head_fill = PatternFill("solid", fgColor="0F766E")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = head_fill
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    answer_fill = PatternFill("solid", fgColor="DCFCE7")
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
        row[9].fill = answer_fill
        row[9].font = Font(bold=True)
    ws.freeze_panes = "F2"
    ws.auto_filter.ref = ws.dimensions

    dv = DataValidation(type="list", formula1='"通過,需修改,刪除"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"O2:O{len(questions) + 1}")

    guide = wb.create_sheet("審核說明")
    for line in [
        "審核步驟",
        "1. 逐題對照「教材原文」欄確認題目、正確答案與解析與教材一致。",
        "2. 確認每題只有一個明確正確答案，錯誤選項不會被合理地認為也正確。",
        "3. 「涉及可能變動的規範」為「是」的題目，請對照現行法規或公告。",
        "4. 在「審核結果」選擇：通過、需修改、刪除；需修改請在「審核意見」說明。",
        "5. 全部審核完成後，依 README 的步驟將通過的題目設為 approved，正式測驗才會開放。",
        "",
        "注意：本檔含正式答案，請勿公開或上傳到公開位置。",
    ]:
        guide.append([line])
    guide.column_dimensions["A"].width = 90
    guide["A1"].font = Font(bold=True, size=13)

    wb.save(OUT)
    print(f"已產生 {OUT.relative_to(ROOT)}（{len(questions)} 題）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
