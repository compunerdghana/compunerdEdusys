"use client";

import { useState } from "react";
import { MessagesSquare, Search, Send, Speech, User } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  time: string;
}

export default function CommunicationView() {
  const { success } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "Ama Mensah", role: "Parent (Ward: Kwame Mensah)", content: "Good morning teacher, please did Kwame submit his math assignment?", time: "08:15" },
    { id: "2", sender: "Kofi Owusu", role: "Headmaster", content: "Staff meeting is scheduled for 15:30 in the conference hall.", time: "Yesterday" },
  ]);
  const [typed, setTyped] = useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    const newMsg: Message = {
      id: String(Date.now()),
      sender: "Me (Teacher)",
      role: "Class Instructor",
      content: typed,
      time: "Just now"
    };
    setMessages(prev => [...prev, newMsg]);
    setTyped("");
    success("Message sent and logged successfully!");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Communication Center</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Communicate directly with parents, students and school management. Internal logs synced.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm max-w-3xl space-y-4">
        {/* Chat Pane */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map(msg => {
            const isMe = msg.sender.includes("Me");
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`p-4 rounded-2xl max-w-md ${isMe ? "bg-violet-600 text-white" : "bg-slate-50 border border-slate-100 text-slate-800"}`}>
                  <p className="text-[11px] opacity-75 font-bold uppercase tracking-wide leading-none mb-1.5">{msg.sender} · {msg.role}</p>
                  <p className="text-[12.5px] font-semibold leading-relaxed">{msg.content}</p>
                  <span className="text-[9px] opacity-60 text-right block mt-1.5 font-medium">{msg.time}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="flex gap-2 border-t border-[#f5f3fc] pt-4">
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your reply here..."
            className="flex-1 px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
          />
          <button
            type="submit"
            className="px-4 h-10 rounded-xl text-white font-bold text-[12px] transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Send size={13} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
