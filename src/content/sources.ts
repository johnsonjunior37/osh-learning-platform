import type { SourceRef } from './types'

const CHECKED = '2026-11-06'

export const SOURCES = {
  oshAmendment: {
    label: '勞動部新聞稿：立法院三讀通過職業安全衛生法部分條文修正案（2025-12-02）',
    url: 'https://www.mol.gov.tw/1607/1632/1633/86798/post',
    checked: CHECKED,
  },
  oshAmendmentPenalty: {
    label: '聯合新聞網：職安法三讀加重雇主罰則（2025-12-03）',
    url: 'https://udn.com/news/story/7243/9177992',
    checked: CHECKED,
  },
  cprBls2021: {
    label: '臺北榮民總醫院：2021 BLS 民眾版講義',
    url: 'https://wd.vghtpe.gov.tw/cstc/files/2021BLS(%E6%B0%91%E7%9C%BE%E7%89%88)%E5%A4%A7%E5%A0%82%E8%AA%B2%E4%B8%8A%E8%AA%B2%E8%AC%9B%E7%BE%A9.pdf',
    checked: CHECKED,
  },
  insurance2026: {
    label: '工商時報：2026 年勞保、職保投保薪資級距（2026-01-21）',
    url: 'https://www.ctee.com.tw/news/20260121701103-430104',
    checked: CHECKED,
  },
  healthCheckDraft: {
    label: '工商時報：勞動部預告修正勞工健康檢查頻率（2026-04-18）',
    url: 'https://www.ctee.com.tw/news/20260418700590-431401',
    checked: CHECKED,
  },
  caseConfinedSpace: {
    label: '臺中市政府勞動檢查處：從事缺氧/局限空間作業發生吸入疑似硫化氫中毒重大職業災害',
    url: 'https://www.doli.taichung.gov.tw/media/1350245/%E5%BE%9E%E4%BA%8B%E7%BC%BA%E6%B0%A7-%E5%B1%80%E9%99%90%E7%A9%BA%E9%96%93%E4%BD%9C%E6%A5%AD%E7%99%BC%E7%94%9F%E5%90%B8%E5%85%A5%E7%96%91%E4%BC%BC%E7%A1%AB%E5%8C%96%E6%B0%AB%E4%B8%AD%E6%AF%92.pdf',
    checked: CHECKED,
  },
  caseCleaningFall: {
    label: '臺中市政府勞動檢查處：從事居家清潔作業發生墜落災害致死重大職業災害案例',
    url: 'https://www.doli.taichung.gov.tw/media/768098/%E5%BE%9E%E4%BA%8B%E5%B1%85%E5%AE%B6%E6%B8%85%E6%BD%94%E4%BD%9C%E6%A5%AD%E7%99%BC%E7%94%9F%E5%A2%9C%E8%90%BD%E7%81%BD%E5%AE%B3%E8%87%B4%E6%AD%BB%E9%87%8D%E5%A4%A7%E8%81%B7%E6%A5%AD%E7%81%BD%E5%AE%B3%E6%A1%88%E4%BE%8B.pdf',
    checked: CHECKED,
  },
  caseContractor: {
    label: '臺北市政府 107 年 11 月 20 日府訴三字第 1072091808 號訴願決定書',
    url: 'https://laws.gov.taipei/law/LawDecision/ContentExport?id=1346-030',
    checked: CHECKED,
  },
  confinedSpaceRescue: {
    label: '勞動部新聞稿：局限空間作業切勿冒然進入搶救（2017-06-26）',
    url: 'https://www.mol.gov.tw/1607/1632/1640/19999/post',
    checked: CHECKED,
  },
} satisfies Record<string, SourceRef>
