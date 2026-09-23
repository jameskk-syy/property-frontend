import { useState } from 'react'
import { Send, Search, MessageCircle } from 'lucide-react'
import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import EmptyState from '../ui/EmptyState'
import { whatsappThreads } from '../../data/mockData'
import { api } from '../../api/client'

export default function WhatsappPanel() {
  const [activeId, setActiveId] = useState(whatsappThreads[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState({})
  const active = whatsappThreads.find((t) => t.id === activeId) || whatsappThreads[0] || null

  if (!active) {
    return (
      <Card padded={false} className="p-8">
        <EmptyState message="No conversations yet" hint="WhatsApp threads will appear here once tenants start messaging." />
      </Card>
    )
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    const text = draft.trim()
    setDraft('')
    
    // Add locally for instant UI response
    const currentList = messages[activeId] || []
    setMessages({
      ...messages,
      [activeId]: [...currentList, { id: Date.now(), text, sender: 'me', time: 'Just now' }]
    })

    try {
      await api.sendWhatsAppMessage({
        to: active.phone || '+254712345678',
        message: text
      })
    } catch (err) {
      console.warn('WhatsApp API simulation:', err.message)
    }
  }

  const customMsgs = messages[activeId] || []

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 h-[560px]">
        <div className="border-r border-slate-100 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search chats…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {whatsappThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 hover:bg-slate-50 ${
                  activeId === t.id ? 'bg-brand-50/60' : ''
                }`}
              >
                <Avatar name={t.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">{t.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{t.lastMessage}</p>
                </div>
                {t.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center shrink-0">
                    {t.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col min-h-0">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <Avatar name={active.name} size={36} />
            <div>
              <p className="text-sm font-medium text-slate-800">{active.name}</p>
              <p className="text-xs text-slate-400">{active.unit}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
            <div className="max-w-[75%] bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-700 shadow-sm">
              {active.lastMessage}
            </div>
            <div className="max-w-[75%] ml-auto bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
              Noted, thank you for letting us know. We'll follow up shortly.
            </div>
            {customMsgs.map((m) => (
              <div key={m.id} className="max-w-[75%] ml-auto bg-brand-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-2 p-3 border-t border-slate-100"
            onSubmit={handleSendMessage}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </Card>
  )
}

export function WhatsappPageHeader() {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
        <MessageCircle size={18} />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">WhatsApp Communication</h1>
        <p className="text-sm text-slate-500">Message tenants and staff directly from Nest.</p>
      </div>
    </div>
  )
}
