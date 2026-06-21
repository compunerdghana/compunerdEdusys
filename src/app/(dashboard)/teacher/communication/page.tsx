"use client";

import { useState } from "react";
import {
  MessagesSquare, Search, Send, CheckCheck, User, ShieldAlert,
  GraduationCap, Users, CalendarClock, MessageSquare, ArrowLeft,
  Phone, Mail, Info, Sparkles
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Contact {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  status: "online" | "offline" | "broadcast";
  ward?: string;
  wardClass?: string;
  email: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  time: string;
  isMe: boolean;
  status: "sent" | "delivered" | "read";
}

export default function CommunicationView() {
  const { success } = useToast();
  
  // Roster of Contacts/Channels
  const [contacts] = useState<Contact[]>([
    {
      id: "headmaster",
      name: "Kofi Owusu",
      role: "School Headmaster",
      avatarInitials: "KO",
      status: "online",
      email: "k.owusu@school.edu.gh",
      phone: "+233 24 123 4567",
      lastMessage: "Staff meeting is scheduled for 15:30 in the conference hall.",
      lastMessageTime: "11:20",
    },
    {
      id: "parent-mensah",
      name: "Ama Mensah",
      role: "Parent",
      avatarInitials: "AM",
      status: "online",
      ward: "Kwame Mensah",
      wardClass: "Primary 1",
      email: "ama.mensah@gmail.com",
      phone: "+233 54 876 5432",
      lastMessage: "Good morning teacher, please did Kwame submit his math assignment?",
      lastMessageTime: "08:15",
      unreadCount: 1,
    },
    {
      id: "class-jhs1",
      name: "JHS 1 Math Parent Group",
      role: "Class Broadcast Channel",
      avatarInitials: "J1",
      status: "broadcast",
      email: "jhs1-parents@school.edu.gh",
      phone: "N/A",
      lastMessage: "New mathematics exercises uploaded to the Document Hub.",
      lastMessageTime: "Yesterday",
    },
    {
      id: "staff-broadcast",
      name: "Staff Announcements",
      role: "School Broadcast Channel",
      avatarInitials: "SA",
      status: "broadcast",
      email: "staff@school.edu.gh",
      phone: "N/A",
      lastMessage: "Reminder: Mid-term lesson notes are due for supervisor review.",
      lastMessageTime: "3 days ago",
    }
  ]);

  const [selectedContactId, setSelectedContactId] = useState("parent-mensah");
  const [searchQuery, setSearchQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat" | "details">("list");

  // Dynamic Chat History Per Contact
  const [conversations, setConversations] = useState<Record<string, Message[]>>({
    headmaster: [
      { id: "h1", sender: "Kofi Owusu", role: "Headmaster", content: "Hello colleagues, please ensure all lesson plans for the coming week are uploaded by Friday noon.", time: "Yesterday", isMe: false, status: "read" },
      { id: "h2", sender: "Me", role: "Teacher", content: "Understood, headmaster. Mine has been drafted and submitted.", time: "Yesterday", isMe: true, status: "read" },
      { id: "h3", sender: "Kofi Owusu", role: "Headmaster", content: "Staff meeting is scheduled for 15:30 in the conference hall.", time: "11:20", isMe: false, status: "read" },
    ],
    "parent-mensah": [
      { id: "p1", sender: "Ama Mensah", role: "Parent", content: "Good morning teacher, please did Kwame submit his math assignment?", time: "08:15", isMe: false, status: "read" },
    ],
    "class-jhs1": [
      { id: "c1", sender: "Me", role: "Teacher", content: "Weekly home assignment results for Fractions have been published.", time: "Yesterday", isMe: true, status: "read" },
      { id: "c2", sender: "System", role: "Broadcast", content: "New mathematics exercises uploaded to the Document Hub.", time: "Yesterday", isMe: false, status: "read" },
    ],
    "staff-broadcast": [
      { id: "s1", sender: "Admin Office", role: "School Admin", content: "Standard scheme parameters have been updated on the Academic Portal.", time: "3 days ago", isMe: false, status: "read" },
      { id: "s2", sender: "Admin Office", role: "School Admin", content: "Reminder: Mid-term lesson notes are due for supervisor review.", time: "3 days ago", isMe: false, status: "read" },
    ]
  });

  const activeContact = contacts.find(c => c.id === selectedContactId) || contacts[0];
  const activeChat = conversations[activeContact.id] || [];

  // Quick Reply Template Chips
  const templateChips = [
    "Kwame did not submit his homework assignment today.",
    "Homework grades have been successfully uploaded.",
    "Please check the Document Hub for details.",
    "Thank you for reaching out. Understood.",
    "I will verify and get back to you shortly."
  ];

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;

    const newMsg: Message = {
      id: String(Date.now()),
      sender: "Me",
      role: "Teacher",
      content: typed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: "sent"
    };

    setConversations(prev => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg]
    }));

    setTyped("");
    success("Message sent and logged successfully!");

    // Simulate double blue checks
    setTimeout(() => {
      setConversations(prev => {
        const chat = prev[activeContact.id] || [];
        return {
          ...prev,
          [activeContact.id]: chat.map(m => m.id === newMsg.id ? { ...m, status: "read" } : m)
        };
      });
    }, 1500);
  }

  // Filter Contacts
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8e4f3] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              <MessagesSquare size={18} />
            </span>
            <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Communication Hub</h1>
          </div>
          <p className="text-slate-500 text-[12px] font-semibold mt-1">
            Secure, synchronized chats connecting you with administration, colleagues, and parents.
          </p>
        </div>
      </div>

      {/* Main Messaging Layout */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#e8e4f3] shadow-sm overflow-hidden h-[540px] flex">
        
        {/* LEFT COLUMN: CONTACTS LIST */}
        <div className={`w-full md:w-[280px] lg:w-[320px] shrink-0 border-r border-[#f0edf8] flex flex-col justify-between ${
          mobileView !== "list" ? "hidden md:flex" : "flex"
        }`}>
          <div>
            <div className="p-4 border-b border-[#f5f3fc]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search chats & names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-slate-50 transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto h-[440px] divide-y divide-[#faf9ff]">
              {filteredContacts.map(c => {
                const isActive = c.id === selectedContactId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContactId(c.id);
                      setMobileView("chat");
                    }}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 ${
                      isActive ? "bg-violet-50/50 border-l-4 border-violet-600" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-100 to-indigo-100 border border-violet-200 text-violet-700 font-extrabold flex items-center justify-center text-[13px] shadow-sm">
                        {c.avatarInitials}
                      </div>
                      {c.status === "online" && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                      )}
                      {c.status === "broadcast" && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="w-1 h-1 bg-white rounded-full"></span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-extrabold text-slate-900 text-[12.5px] truncate">{c.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-bold truncate leading-none mt-0.5">{c.role}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-1.5 font-medium leading-tight">{c.lastMessage}</p>
                    </div>

                    {c.unreadCount && c.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white font-extrabold text-[9px] flex items-center justify-center shrink-0 shadow-sm">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: ACTIVE CHAT TIMELINE */}
        <div className={`flex-1 flex flex-col justify-between h-full bg-[#faf9ff]/50 ${
          mobileView === "list" ? "hidden md:flex" : mobileView === "details" ? "hidden lg:flex" : "flex"
        }`}>
          {/* Active Chat Header */}
          <div className="p-4 border-b border-[#f0edf8] bg-white flex items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileView("list")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 md:hidden transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-100 to-indigo-100 border border-violet-200 text-violet-700 font-extrabold flex items-center justify-center text-[13px] shadow-sm">
                  {activeContact.avatarInitials}
                </div>
                {activeContact.status === "online" && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              
              <div>
                <h3 className="font-extrabold text-slate-900 text-[13.5px] leading-tight">{activeContact.name}</h3>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wide mt-0.5">
                  {activeContact.role} {activeContact.ward ? `· Ward: ${activeContact.ward}` : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => setMobileView(mobileView === "details" ? "chat" : "details")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-[11px] text-slate-600 bg-white hover:bg-slate-50 shadow-sm flex items-center gap-1 transition-all"
            >
              <User size={12} />
              <span className="hidden sm:inline">Profile Details</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeChat.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-[85%] ${msg.isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {!msg.isMe && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center font-extrabold text-[11px] shrink-0 self-end mb-1">
                    {activeContact.avatarInitials}
                  </div>
                )}
                <div>
                  <div className={`p-4 rounded-3xl shadow-sm ${
                    msg.isMe 
                      ? "bg-violet-600 text-white rounded-br-none" 
                      : "bg-white border border-[#e8e4f3] text-slate-800 rounded-bl-none"
                  }`}>
                    <p className="text-[12.5px] font-semibold leading-relaxed whitespace-pre-line">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-70">
                      <span className="text-[8.5px] font-medium leading-none">{msg.time}</span>
                      {msg.isMe && (
                        <CheckCheck size={11} className={msg.status === "read" ? "text-violet-200" : "text-slate-200"} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Replies & Input panel */}
          <div className="p-4 bg-white border-t border-[#f0edf8] shrink-0 space-y-3.5">
            {/* Quick replies slider */}
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} className="text-violet-500" />
                Quick Message Templates
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {templateChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTyped(chip)}
                    className="px-3.5 py-1.5 h-8 rounded-full border border-violet-100 hover:border-violet-300 bg-violet-50/50 hover:bg-violet-50 text-violet-700 font-bold text-[10.5px] transition-all whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={`Send message to ${activeContact.name}...`}
                className="flex-1 px-4 h-11 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-slate-50 transition-all shadow-inner"
              />
              <button
                type="submit"
                className="px-4.5 h-11 rounded-xl text-white font-bold text-[12.5px] transition-all flex items-center gap-2 shadow-md shrink-0 hover:opacity-90 active:scale-98"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Send size={14} />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT DETAILS PANEL */}
        <div className={`w-full md:w-[260px] lg:w-[280px] shrink-0 border-l border-[#f0edf8] flex flex-col justify-between bg-white h-full transition-all ${
          mobileView !== "details" ? "hidden lg:flex" : "flex"
        }`}>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between md:hidden">
              <button
                onClick={() => setMobileView("chat")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="font-extrabold text-[13px] text-slate-800">Profile Details</span>
            </div>

            {/* Profile Avatar Card */}
            <div className="text-center space-y-3 pt-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-md border border-violet-200">
                {activeContact.avatarInitials}
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-[14px] leading-tight">{activeContact.name}</h4>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wide mt-1">{activeContact.role}</p>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-4 pt-4 border-t border-[#f5f3fc] text-[11.5px] font-semibold text-slate-500">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block leading-none">Contact Metadata</span>
              
              <div className="flex items-center gap-2.5">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="truncate" title={activeContact.email}>{activeContact.email}</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <a href={`tel:${activeContact.phone}`} className="hover:text-violet-600 underline underline-offset-2">
                  {activeContact.phone}
                </a>
              </div>

              {activeContact.ward && (
                <div className="bg-[#faf9ff] border border-[#f0edf8] rounded-xl p-3.5 space-y-2 mt-2">
                  <span className="text-[9.5px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap size={13} /> Student Roster Ward
                  </span>
                  <div className="text-[11px] space-y-1 font-medium">
                    <p><strong>Name:</strong> {activeContact.ward}</p>
                    <p><strong>Classroom:</strong> {activeContact.wardClass}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Notice footer */}
          <div className="p-4 border-t border-[#f5f3fc] bg-slate-50 text-[10px] text-slate-400 font-semibold flex items-start gap-2">
            <Info size={13} className="text-violet-500 shrink-0 mt-0.5" />
            <span>Chat archives are securely saved and synced under school policy guidelines.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
