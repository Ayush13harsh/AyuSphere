'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { fetchAPI } from '../lib/api';

export default function Chatbot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hello! I'm Dr. AyuSphere. Describe your symptoms and I'll help guide you to the right care.", specialist: null, keyword: null }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        const userMsg = input.trim();
        setInput('');
        
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const data = await fetchAPI('/chatbot/message', {
                method: 'POST',
                body: JSON.stringify({ message: userMsg })
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: data.response, 
                specialist: data.recommended_specialist,
                keyword: data.specialty_keyword
            }]);
            
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: "I'm having trouble connecting to my medical database. Please check your connection." 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout title="Dr. AyuSphere">
            <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.06)' }}>
                {/* Premium Chat Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e293b, #334155, #475569)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    color: 'white'
                }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: '0 6px 15px rgba(99,102,241,0.4)',
                        fontSize: '1.5rem'
                    }}>🧠</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Dr. AyuSphere</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                            <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>Online • Medical Assistant</span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--white-solid)' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ 
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'slide-up 0.3s ease'
                        }}>
                            {msg.role === 'assistant' && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', marginBottom: '4px', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Dr. AyuSphere
                                </span>
                            )}
                            <div style={{
                                background: msg.role === 'user' 
                                    ? 'linear-gradient(135deg, #ef4444, #f43f5e)' 
                                    : 'var(--white)',
                                color: msg.role === 'user' ? 'white' : 'var(--text-dark)',
                                padding: '14px 18px',
                                borderRadius: '20px',
                                borderBottomRightRadius: msg.role === 'user' ? '6px' : '20px',
                                borderBottomLeftRadius: msg.role === 'assistant' ? '6px' : '20px',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                                boxShadow: msg.role === 'user' 
                                    ? '0 6px 15px rgba(239,68,68,0.25)' 
                                    : '0 3px 10px rgba(0,0,0,0.04)',
                                backdropFilter: msg.role === 'assistant' ? 'blur(10px)' : 'none'
                            }}>
                                {msg.text}
                            </div>
                            
                            {msg.role === 'assistant' && msg.specialist && (
                                <Link 
                                    href={`/hospitals?specialty=${encodeURIComponent(msg.keyword)}`} 
                                    style={{
                                        marginTop: '8px',
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: 'white', fontSize: '0.85rem', fontWeight: 700,
                                        textDecoration: 'none',
                                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                        transition: 'transform 0.2s'
                                    }}>
                                    🏥 Find {msg.specialist}
                                </Link>
                            )}
                        </div>
                    ))}
                    
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderRadius: '20px', borderBottomLeftRadius: '6px', background: 'var(--white)', border: '1px solid var(--border)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'blink 1s infinite' }}></span>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', animation: 'blink 1s infinite 0.2s' }}></span>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', animation: 'blink 1s infinite 0.4s' }}></span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Premium Input Bar */}
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--white-solid)' }}>
                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your symptoms..."
                            style={{
                                flex: 1, padding: '14px 20px',
                                borderRadius: '16px', border: '1.5px solid var(--border)',
                                fontSize: '1rem', outline: 'none',
                                background: 'var(--white)',
                                backdropFilter: 'blur(10px)',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                color: 'var(--text-dark)'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim()}
                            style={{ 
                                background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--border)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                width: '52px', height: '52px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'all 0.3s ease',
                                boxShadow: input.trim() ? '0 6px 15px rgba(99,102,241,0.3)' : 'none',
                                flexShrink: 0
                            }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
