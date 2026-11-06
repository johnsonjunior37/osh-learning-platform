import { Check, Copy, Download, Mail, MessageCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { SITE_TITLE, siteUrl } from '../lib/config'

export function SharePage() {
  const url = siteUrl()
  const [qr, setQr] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''))
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('請複製以下網址', url)
    }
  }

  const text = `${SITE_TITLE}：${url}`
  const lineHref = `https://line.me/R/share?text=${encodeURIComponent(text)}`
  const mailHref = `mailto:?subject=${encodeURIComponent(SITE_TITLE)}&body=${encodeURIComponent(
    `請使用以下連結進行職業安全衛生學習與測驗：\n${url}`,
  )}`

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">分享平台</h1>
        <p className="mt-1 text-slate-600">把網址或 QR Code 傳給同仁，手機掃描即可開啟。</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mx-auto aspect-square w-full max-w-64 rounded-xl border border-slate-200 bg-white p-2">
          {qr ? (
            <img src={qr} alt={`${SITE_TITLE} 網址 QR Code`} className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-slate-400">產生中</div>
          )}
        </div>
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-[15px] break-all text-slate-700">{url}</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-700 font-semibold text-white"
          >
            {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
            {copied ? '已複製' : '複製連結'}
          </button>
          <a
            href={qr || undefined}
            download="osh-learning-qrcode.png"
            aria-disabled={!qr}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
          >
            <Download className="size-5" aria-hidden />
            下載 QR Code
          </a>
          <a
            href={lineHref}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#06C755] font-semibold text-white"
          >
            <MessageCircle className="size-5" aria-hidden />
            LINE 分享
          </a>
          <a
            href={mailHref}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
          >
            <Mail className="size-5" aria-hidden />
            Email 分享
          </a>
        </div>
      </section>
    </div>
  )
}
