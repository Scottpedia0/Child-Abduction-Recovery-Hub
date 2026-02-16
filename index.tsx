import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, LiveServerMessage, Modality, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, writeBatch, getDoc, deleteDoc, query, where, setDoc, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInAnonymously } from "firebase/auth";
import { jsPDF } from 'jspdf';
import { Analytics } from '@vercel/analytics/react';
import html2canvas from 'html2canvas';
// knowledgeBaseTemplates inlined directly into seedData below (external .js import unreliable on CDN host)

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCLn6ThJrbhnNGO1-YeM_ONqK70-Ega7og",
  authDomain: "recovery-hub-prod.firebaseapp.com",
  projectId: "recovery-hub-prod",
  storageBucket: "recovery-hub-prod.firebasestorage.app",
  messagingSenderId: "663715464779",
  appId: "1:663715464779:web:e20168c84c83c42b1bafce",
  measurementId: "G-WBW2YJ2TQH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- TYPES ---
type View = 'onboarding' | 'dashboard' | 'liveConversation' | 'knowledgeBase' | 'termsOfService' | 'dataManagement' | 'myChecklist' | 'caseJournal' | 'expenses' | 'correspondence' | 'caseSettings' | 'documentVault' | 'campaignBuilder' | 'taskBrainstormer' | 'contactList' | 'prevention' | 'howItWorks' | 'supportResources';
type CustodyStatus = 'no-order' | 'sole-custody-me-local' | 'joint-custody-local' | 'sole-custody-them-local' | 'sole-custody-me-foreign' | 'joint-custody-foreign' | 'sole-custody-them-foreign' | 'other';
type ParentRole = 'mother' | 'father' | 'legal-guardian' | 'other';

interface DossierData {
    summary: string;
    risk: 'High' | 'Medium' | 'Low';
    legalSystem: string;
    redFlags: string[];
    suggestedTasks: { task: string; priority: string }[];
    dateGenerated: string;
}

interface CaseProfile {
    childName: string;
    childDOB?: string; // Added for quick copy
    fromCountry: string;
    toCountry: string;
    abductionDate: string;
    abductorRelationship?: string;
    custodyStatus: CustodyStatus;
    parentRole: ParentRole;
    additionalContext?: string;
    completedActions?: string[]; 
    isProfileComplete: boolean;
    isSkipped?: boolean;
    dossierData?: DossierData; // Keep for legacy/current
    dossierHistory?: DossierData[]; // New: History of assessments
    caseNumbers?: Record<string, string>; 
}

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

interface ActionItem {
  id: string;
  category: string;
  task: string;
  description: string;
  priority: 'Immediate' | 'High' | 'Medium' | 'Low';
  url?: string;
  completed: boolean;
  subtasks?: SubTask[];
}

interface LogEntry {
    id: string;
    date: string;
    time: string;
    type: 'Phone Call' | 'Email' | 'In-Person' | 'Police Interaction' | 'Court' | 'Sighting' | 'Other';
    description: string;
    peopleInvolved: string;
    createdAt: string;
    isPublic?: boolean; 
    sourceDocId?: string; 
}

interface ExpenseEntry {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    category: 'Legal' | 'Travel' | 'Investigation' | 'Administrative' | 'Other';
}

interface KnowledgeBaseEntry {
    id: string;
    entryType: 'resource' | 'template' | 'procedure' | 'data_model' | 'seo_outline' | 'localization' | 'guidance' | 'country_matrix' | 'opsec' | 'prevention';
    name: string;
    countryPair: string;
    resourceType: string;
    summary?: string;
    flagged?: boolean;
    url?: string;
    email?: string;
    phone?: string;
    useCase?: string;
    instructions?: string;
    fullText?: string; // Added for deep content viewing
    tags?: string[];
}

interface VaultDocument {
    id: string;
    name: string;
    type: string;
    date: string;
    summary: string;
    extractedText: string;
    fileType: string;
    size: number;
    uploadedAt: string;
    cloudUrl?: string;
    isPublic?: boolean; 
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    suggestedTasks?: ActionItem[];
}

interface ContactEntry {
    id: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    notes?: string;
}

interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    type: 'task' | 'heading' | 'paragraph';
}

// --- RAG HELPER ---
const getRagContext = async (): Promise<string> => {
    try {
        const docs = await getFilesFromLocalVault();
        if (docs.length > 0) {
             // Increased context limit to 2000 chars for better RAG
             const context = docs.map(d => `[DOCUMENT: ${d.type} (${d.date})] \nSummary: ${d.summary} \nContent Snippet: ${d.extractedText?.substring(0, 2000)}...`).join('\n\n');
             return context ? `\n\n--- REFERENCE DOCUMENTS (RAG CONTEXT) ---\n${context}\n--------------------------------------\n` : '';
        }
        return '';
    } catch (e) {
        console.warn("RAG Fetch failed", e);
        return '';
    }
}


// --- AUDIO HELPERS for LiveConversation ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- HELPER: File to Base64 ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

// --- HELPER: Resize Image ---
const resizeImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
    });
}

// --- INDEXED DB HELPERS (Local Fallback) ---
const DB_NAME = 'RecoveryHubVault';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

const openVaultDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const saveFileToLocalVault = async (doc: VaultDocument, fileBlob: Blob) => {
    const db = await openVaultDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...doc, blob: fileBlob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getFilesFromLocalVault = async (): Promise<VaultDocument[]> => {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
             const docs = request.result.map(({ blob, ...rest }) => rest);
             resolve(docs);
        };
        request.onerror = () => reject(request.error);
    });
};

const deleteFileFromLocalVault = async (id: string) => {
    const db = await openVaultDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};


// --- AI CLIENT ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- COMPONENTS ---

// --- NEW COMPONENT: Task Assistant AI Modal ---
const TaskAssistantModal: React.FC<{ task: ActionItem, onClose: () => void }> = ({ task, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initial greeting
        setMessages([{
            role: 'ai',
            text: `I see you're working on "${task.task}". How can I help you complete this? I can draft emails, explain legal forms, or find specific contact info.`
        }]);
    }, [task]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const ragContext = await getRagContext();
            const prompt = `
            You are an expert assistant helping a parent complete a specific recovery task: "${task.task}".
            Description of task: "${task.description}"
            
            User Request: "${userMsg.text}"
            
            RAG Context (Available Evidence):
            ${ragContext}
            
            Instructions:
            - Be tactical and direct.
            - If they need a letter, write the draft.
            - If they need instructions, list step-by-step bullets.
            - If they asked for a link (like to a form), try to provide the official URL for the country involved if you know it.
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt
            });

            const responseText = result.text || "I couldn't generate a response. Please try again.";
            setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to assistant." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tour-backdrop" onClick={onClose}>
            <div className="tour-card" onClick={e => e.stopPropagation()} style={{ width: '600px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="tour-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🤖 Task Assistant</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{task.task}</div>
                    </div>
                    <button className="tour-close" onClick={onClose}>×</button>
                </div>
                
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--surface-raised)' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: '1rem', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ 
                                backgroundColor: m.role === 'user' ? '#1e3a5f' : 'white', 
                                color: m.role === 'user' ? 'white' : 'black',
                                padding: '0.8rem', 
                                borderRadius: '12px',
                                border: m.role === 'ai' ? '1px solid var(--border-default)' : 'none',
                                maxWidth: '80%',
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.95rem'
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Thinking...</div>}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for help (e.g. 'Draft the letter', 'What is the URL?')"
                        style={{ flexGrow: 1 }}
                    />
                    <button className="button-primary" onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
};

const QuickCopyCard: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`Copied ${label} to clipboard`);
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button className="button-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2ecf5' }} onClick={() => copyToClipboard(profile.childName, "Child Name")}>
                Child: <strong>{profile.childName}</strong> 📋
            </button>
            {profile.childDOB && (
                <button className="button-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2ecf5' }} onClick={() => copyToClipboard(profile.childDOB!, "DOB")}>
                    DOB: <strong>{profile.childDOB}</strong> 📋
                </button>
            )}
            <button className="button-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2ecf5' }} onClick={() => copyToClipboard(profile.abductionDate, "Abduction Date")}>
                Taken: <strong>{profile.abductionDate}</strong> 📋
            </button>
            {Object.entries(profile.caseNumbers || {}).map(([key, val]) => (
                 <button key={key} className="button-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(147,197,253,0.4)', color: '#93c5fd' }} onClick={() => copyToClipboard(val, key)}>
                    {key}: <strong>{val}</strong> 📋
                </button>
            ))}
        </div>
    );
};

const IntelligenceBriefWidget: React.FC<{ profile: CaseProfile, onUpdate: (d: DossierData) => void, onAddTask?: (task: string, priority: string) => void }> = ({ profile, onUpdate, onAddTask }) => {
    const [loading, setLoading] = useState(false);
    const [viewIndex, setViewIndex] = useState(0);
    
    const history = profile.dossierHistory || (profile.dossierData ? [profile.dossierData] : []);
    const currentView = history[history.length - 1 - viewIndex]; 

    const refreshAnalysis = async () => {
        setLoading(true);
        try {
            const savedLogs = localStorage.getItem('caseLogs');
            let recentContext: string = "No recent logs available.";
            if (savedLogs) {
                const logs: LogEntry[] = JSON.parse(savedLogs);
                recentContext = logs.slice(0, 5).map(l => `- ${l.date}: ${l.description}`).join('\n');
            }

            const savedItems = localStorage.getItem('actionItems');
            let existingTasks = '';
            if (savedItems) {
                const parsed: ActionItem[] = JSON.parse(savedItems);
                existingTasks = parsed.filter(t => !t.completed).map(t => `- ${t.task}`).join('\n');
            }

            const prompt = `
            Analyze the CURRENT status of this child abduction case from ${profile.fromCountry} to ${profile.toCountry}.
            Date Taken: ${profile.abductionDate}.
            Custody status: ${profile.custodyStatus}.
            Additional context: ${profile.additionalContext || 'None provided'}

            RECENT ACTIVITY (Use this to update the assessment):
            ${recentContext}

            EXISTING TASKS (do NOT suggest these — suggest NEW ones):
            ${existingTasks || 'No tasks yet.'}

            Provide an updated assessment. NOT just static legal info, but a reactive summary.
            Also suggest 2-3 NEW specific, actionable tasks they should add to their plan that they haven't already. Make them concrete and immediately doable.
            Return JSON:
            {
                "risk": "High" | "Medium" | "Low",
                "summary": "Reactive summary based on recent logs and general country status.",
                "legalSystem": "Updates on challenges in ${profile.toCountry}.",
                "redFlags": ["List current urgent red flags based on recent activity"],
                "suggestedTasks": [{"task": "Specific actionable task", "priority": "Immediate" | "High" | "Medium"}]
            }
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            risk: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            legalSystem: { type: Type.STRING },
                            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            suggestedTasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, priority: { type: Type.STRING } }, required: ["task", "priority"] } }
                        },
                        required: ["risk", "summary", "legalSystem", "redFlags", "suggestedTasks"]
                    }
                }
            });

            const text = result.text;
            const data = text ? JSON.parse(text) : {};
            const newDossier = { ...data, dateGenerated: new Date().toLocaleString() };
            onUpdate(newDossier);
            setViewIndex(0); 
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dossier-card">
                <div className="loading-dossier">
                    <div className="pulse-ring"></div>
                    <div>Analyzing Recent Activity...</div>
                </div>
            </div>
        );
    }

    if (history.length === 0) return (
        <div className="dossier-card">
            <button className="button-secondary" onClick={refreshAnalysis}>Initialize Intelligence Brief</button>
        </div>
    );

    return (
        <div className={`dossier-card risk-${currentView?.risk.toLowerCase() || 'medium'}`}>
            <div className="dossier-header">
                <strong>Assessment Log</strong>
                <span className="risk-badge">{currentView?.risk} RISK</span>
            </div>
            
            {history.length > 1 && (
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'}}>
                    <button onClick={() => setViewIndex(Math.min(viewIndex + 1, history.length - 1))} disabled={viewIndex >= history.length - 1} style={{border:'none', background:'none', cursor:'pointer', fontWeight:'bold', color: '#93c5fd'}}>← Older</button>
                    <span style={{fontSize: '0.8rem', color: 'rgba(200,216,232,0.6)'}}>{viewIndex === 0 ? "Latest Update" : `History (${history.length - viewIndex}/${history.length})`}</span>
                    <button onClick={() => setViewIndex(Math.max(viewIndex - 1, 0))} disabled={viewIndex === 0} style={{border:'none', background:'none', cursor:'pointer', fontWeight:'bold', color: '#93c5fd'}}>Newer →</button>
                </div>
            )}

            <div className="dossier-summary">{currentView?.summary}</div>
            {currentView?.redFlags && currentView.redFlags.length > 0 && (
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <strong>⚠️ Current Red Flags:</strong>
                    <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0' }}>
                        {currentView.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                </div>
            )}
            {onAddTask && currentView?.suggestedTasks && currentView.suggestedTasks.length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>💡 Suggested Next Steps</div>
                    {currentView.suggestedTasks.map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: i < currentView.suggestedTasks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            <div style={{ fontSize: '0.85rem', flex: 1 }}>
                                <span className={`mini-priority ${s.priority.toLowerCase()}`} style={{ marginRight: '0.5rem' }}>{s.priority}</span>
                                {s.task}
                            </div>
                            <button onClick={() => onAddTask(s.task, s.priority)} style={{ background: 'none', border: '1px solid rgba(147,197,253,0.4)', color: '#93c5fd', borderRadius: '8px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>+ Add</button>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(200,216,232,0.5)' }}>Generated: {currentView?.dateGenerated}</span>
                <button className="button-secondary" onClick={refreshAnalysis} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {viewIndex === 0 ? 'Refresh Analysis' : 'Jump to Latest'}
                </button>
            </div>
        </div>
    );
};

const CriticalTasksWidget: React.FC<{ items: ActionItem[], onStart: () => void, isGenerating: boolean, onBrainstorm: () => void, onViewTasks?: () => void }> = ({ items, onStart, isGenerating, onBrainstorm, onViewTasks }) => {
    const incomplete = items.filter(i => !i.completed);
    const topTasks = incomplete.filter(i => i.priority === 'Immediate' || i.priority === 'High').slice(0, 3);
    const nextTasks = incomplete.filter(i => i.priority !== 'Immediate' && i.priority !== 'High').slice(0, 3);

    if (items.length === 0) {
        return (
            <div className="critical-tasks-empty">
                <h4>⚠️ Action Plan Not Started</h4>
                <p>Hit the button below to generate a checklist customized to your case. In the meantime, here are the universal first steps every parent should take:</p>
                <div style={{ textAlign: 'left', fontSize: '0.9rem', margin: '0.75rem 0', lineHeight: '1.8' }}>
                    <div>1. <strong>File a police report</strong> — in your home country, today</div>
                    <div>2. <strong>Contact an international family law attorney</strong> — in BOTH countries</div>
                    <div>3. <strong>Call your Central Authority</strong> — (US: 1-888-407-4747 State Dept)</div>
                    <div>4. <strong>Secure your child's passport</strong> — request it flagged or cancelled</div>
                    <div>5. <strong>Document everything</strong> — save texts, emails, screenshots, all of it</div>
                </div>
                <button className="button-primary" onClick={onStart} disabled={isGenerating} style={{ width: '100%' }}>
                    {isGenerating ? 'Generating Your Plan...' : 'Generate My Full Action Plan'}
                </button>
            </div>
        );
    }

    if (incomplete.length === 0) {
        return (
            <div className="critical-tasks-empty" style={{ backgroundColor: 'rgba(129,199,132,0.1)', borderColor: 'rgba(76,175,80,0.5)' }}>
                <h4 style={{ color: '#81c784' }}>All Listed Tasks Complete</h4>
                <p>The mission isn't over. Review strategy or brainstorm next steps.</p>
                <button className="button-secondary" onClick={onBrainstorm}>Brainstorm Next Actions</button>
            </div>
        );
    }

    const tasksToShow = topTasks.length > 0 ? topTasks : nextTasks;
    const title = topTasks.length > 0 ? "Top Priorities" : "Next Priorities";
    const completedCount = items.filter(i => i.completed).length;
    const recentlyCompleted = items.filter(i => i.completed).length; // total completed acts as lifetime momentum

    return (
        <div className="critical-tasks-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(200,216,232,0.5)', letterSpacing: '1px' }}>{title}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(200,216,232,0.6)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontWeight: 700, color: '#93c5fd' }}>{completedCount}</span> done · <span style={{ fontWeight: 700 }}>{incomplete.length}</span> to go
                </div>
            </div>
            {topTasks.length === 0 && <div style={{ fontSize: '0.7rem', color: '#81c784', fontWeight: 'bold', marginBottom: '0.5rem' }}>High Priority Cleared ✅</div>}
            {tasksToShow.map(task => (
                <div key={task.id} className="mini-task-card" onClick={onViewTasks} style={{ cursor: 'pointer' }}>
                    <span className={`mini-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="mini-task-text">{task.task}</span>
                </div>
            ))}
            {onViewTasks && <button onClick={onViewTasks} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: '0.8rem', cursor: 'pointer', padding: '0.4rem 0', width: '100%', textAlign: 'center' }}>View all tasks →</button>}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                <button onClick={onBrainstorm} style={{ background: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', width: '100%', color: '#93c5fd', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    💡 What should I do next?
                </button>
            </div>
        </div>
    );
};

// --- MOMENTUM TRACKER ---
const MomentumTracker: React.FC<{ items: ActionItem[] }> = ({ items }) => {
    const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
    const [stats, setStats] = useState({ tasksCompleted: 0, logsAdded: 0, expensesLogged: 0, docsUploaded: 0, streak: 0 });

    useEffect(() => {
        const loadActivity = async () => {
            const timestamps: string[] = [];
            let logsCount = 0, expensesCount = 0, docsCount = 0;

            // Logs
            try {
                const logs: LogEntry[] = JSON.parse(localStorage.getItem('caseLogs') || '[]');
                logs.forEach(l => { if (l.createdAt) timestamps.push(l.createdAt); });
                logsCount = logs.length;
            } catch {}

            // Expenses
            try {
                const expenses: ExpenseEntry[] = JSON.parse(localStorage.getItem('caseExpenses') || '[]');
                expenses.forEach(e => { if (e.date) timestamps.push(new Date(e.date).toISOString()); });
                expensesCount = expenses.length;
            } catch {}

            // Vault docs (IndexedDB)
            try {
                const docs = await getFilesFromLocalVault();
                docs.forEach(d => { if (d.uploadedAt) timestamps.push(d.uploadedAt); });
                docsCount = docs.length;
            } catch {}

            // Completed tasks (current + archived from localStorage)
            let archived: ActionItem[] = [];
            try { archived = JSON.parse(localStorage.getItem('recoveryHubArchived') || '[]'); } catch {}
            const tasksCompleted = items.filter(i => i.completed).length + archived.length;

            // Build 30-day heatmap
            const now = new Date();
            const days: { date: string; count: number }[] = [];
            const dayMap: Record<string, number> = {};

            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                dayMap[key] = 0;
                days.push({ date: key, count: 0 });
            }

            timestamps.forEach(ts => {
                try {
                    const key = new Date(ts).toISOString().split('T')[0];
                    if (dayMap[key] !== undefined) dayMap[key]++;
                } catch {}
            });

            days.forEach(d => { d.count = dayMap[d.date]; });
            setActivityData(days);

            // Calculate streak
            let streak = 0;
            for (let i = days.length - 1; i >= 0; i--) {
                if (days[i].count > 0) streak++;
                else break;
            }

            setStats({ tasksCompleted, logsAdded: logsCount, expensesLogged: expensesCount, docsUploaded: docsCount, streak });
        };
        loadActivity();
    }, [items]);

    const totalActions = stats.tasksCompleted + stats.logsAdded + stats.expensesLogged + stats.docsUploaded;

    const maxCount = Math.max(...activityData.map(d => d.count), 1);
    const getColor = (count: number) => {
        if (count === 0) return '#e2e8f0';
        const intensity = Math.min(count / maxCount, 1);
        if (intensity <= 0.33) return '#93c5fd';
        if (intensity <= 0.66) return '#3b82f6';
        return '#1e3a5f';
    };

    const weekDay = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('en', { weekday: 'short' }).charAt(0);
    };

    const activeDays = activityData.filter(d => d.count > 0).length;
    const totalActivity = activityData.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className="momentum-tracker">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: totalActions > 0 ? '0.5rem' : 0 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,216,232,0.4)' }}>Your Momentum</span>
                {stats.streak > 1 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#93c5fd' }}>🔥 {stats.streak}-day streak</span>}
            </div>
            {totalActions === 0 ? (
                <div style={{ textAlign: 'center', padding: '0.75rem 0', fontSize: '0.8rem', color: 'rgba(200,216,232,0.5)' }}>
                    Every action counts. Complete a task, log evidence, or upload a document to start tracking.
                </div>
            ) : (
                <>
                    <div className="momentum-stats">
                        {stats.tasksCompleted > 0 && <div className="momentum-stat"><span className="stat-number">{stats.tasksCompleted}</span><span className="stat-label">tasks done</span></div>}
                        {stats.logsAdded > 0 && <div className="momentum-stat"><span className="stat-number">{stats.logsAdded}</span><span className="stat-label">evidence logged</span></div>}
                        {stats.expensesLogged > 0 && <div className="momentum-stat"><span className="stat-number">{stats.expensesLogged}</span><span className="stat-label">expenses tracked</span></div>}
                        {stats.docsUploaded > 0 && <div className="momentum-stat"><span className="stat-number">{stats.docsUploaded}</span><span className="stat-label">docs uploaded</span></div>}
                    </div>
                    <div className="momentum-bar-row">
                        {activityData.slice(-14).map((d) => (
                            <div key={d.date} className="momentum-bar-col" title={`${d.date}: ${d.count} action${d.count !== 1 ? 's' : ''}`}>
                                <div className="momentum-bar" style={{ height: d.count > 0 ? Math.max(6, (d.count / maxCount) * 32) + 'px' : '3px', backgroundColor: d.count > 0 ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.08)' }} />
                            </div>
                        ))}
                    </div>
                    <div className="momentum-footer">
                        <span>{activeDays > 0 ? `${activeDays} active day${activeDays !== 1 ? 's' : ''} in last 2 weeks` : 'No recent activity'}</span>
                        {totalActions > 0 && <span>{totalActions} total action{totalActions !== 1 ? 's' : ''}</span>}
                    </div>
                </>
            )}
        </div>
    );
};

const SimilarCasesWidget: React.FC<{ from: string, to: string }> = ({ from, to }) => {
    const [stories, setStories] = useState<{ title: string; url: string; source: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStories = async () => {
            if (!from || !to) return;
            setLoading(true);
            try {
                const result = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `Find 3 recent news stories or legal summaries about parental child abduction cases from ${from} to ${to}. Return ONLY a JSON array with objects containing "title", "url", and "source".`,
                    config: {
                        tools: [{ googleSearch: {} }]
                    }
                });
                
                const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
                const foundStories: any[] = [];
                
                if (chunks) {
                    chunks.forEach((chunk: any) => {
                        if (chunk.web?.uri && chunk.web?.title) {
                             foundStories.push({
                                 title: chunk.web.title,
                                 url: chunk.web.uri as string,
                                 source: new URL(chunk.web.uri as string).hostname
                             });
                        }
                    });
                }
                setStories(foundStories.slice(0, 3));
            } catch (e) {
                console.error("Error fetching stories", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStories();
    }, [from, to]);

    if (loading) return <div className="stat-box">Scanning related cases...</div>;
    if (stories.length === 0) return null;

    return (
        <div className="similar-cases-widget">
            <div className="section-header">Related Stories found in Search</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {stories.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="story-link-card">
                        <div className="story-title">{s.title}</div>
                        <div className="story-source">{s.source}</div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const TaskBrainstormer: React.FC<{ profile: CaseProfile, onAddTask: (task: ActionItem) => void, items: ActionItem[] }> = ({ profile, onAddTask, items }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());
    const [dismissedTaskIds, setDismissedTaskIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        getFilesFromLocalVault().then(docs => setVaultDocs(docs));
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        let docContext = '';
        if (selectedDocId) {
            const chosenDoc = vaultDocs.find(d => d.id === selectedDocId);
            if (chosenDoc) {
                docContext = `\n\nThe parent is referencing this specific document:\nDocument: "${chosenDoc.name}" (${chosenDoc.type})\nDate: ${chosenDoc.date}\nSummary: ${chosenDoc.summary}\nExtracted Text: ${chosenDoc.extractedText?.substring(0, 3000) || 'No text extracted'}`;
            }
        }

        const userMsg: ChatMessage = { role: 'user', text: input + (selectedDocId ? ` [📎 Attached: ${vaultDocs.find(d => d.id === selectedDocId)?.name}]` : '') };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSelectedDocId('');
        setLoading(true);

        try {
            // Gather intelligence context
            const ragContext = await getRagContext();
            const savedLogs = localStorage.getItem('caseLogs');
            let recentLogs = '';
            if (savedLogs) {
                const parsed: LogEntry[] = JSON.parse(savedLogs);
                recentLogs = parsed.slice(0, 5).map(l => `- ${l.date}: ${l.type} — ${l.description}`).join('\n');
            }
            const existingTasks = items.filter(t => !t.completed).map(t => `- [${t.priority}] ${t.task}`).join('\n');
            const completedTasks = items.filter(t => t.completed).map(t => `- ${t.task}`).join('\n');
            const dismissedTexts = messages.flatMap(m => m.suggestedTasks || []).filter(t => dismissedTaskIds.has(t.id) || addedTaskIds.has(t.id)).map(t => `- ${t.task}`).join('\n');
            const dossier = profile.dossierData;
            const intelSummary = dossier ? `Risk: ${dossier.risk}. ${dossier.summary}. Red flags: ${dossier.redFlags?.join(', ')}` : '';

            const prompt = `
            You are a direct, tactical strategic advisor helping ${profile.childName ? profile.childName + "'s parent" : "a parent"} recover their child who was taken from ${profile.fromCountry} to ${profile.toCountry}.
            ${profile.childName ? `The child's name is ${profile.childName}.` : ''}
            Custody status: ${profile.custodyStatus}.
            Date taken: ${profile.abductionDate}.
            Additional context: ${profile.additionalContext || 'None'}

            INTELLIGENCE BRIEF: ${intelSummary || 'No analysis run yet.'}

            RECENT ACTIVITY:
            ${recentLogs || 'No recent logs.'}

            CURRENT TASKS (already on their plan — do NOT suggest these):
            ${existingTasks || 'No tasks yet.'}

            COMPLETED TASKS (already done — do NOT suggest these):
            ${completedTasks || 'None yet.'}

            PREVIOUSLY SUGGESTED / DISMISSED (parent already saw these — do NOT repeat):
            ${dismissedTexts || 'None.'}

            REFERENCE DOCUMENTS:
            ${ragContext || 'No documents uploaded.'}

            ${docContext}

            The parent says: "${input}"

            INSTRUCTIONS:
            1. Use ${profile.childName || "the child"}'s name when relevant. Be personal — this is their kid.
            2. Validate their concern in 1-2 sentences, then be TACTICAL.
            3. Suggest exactly 3 concrete, NEW tasks (not already on their plan). Make them specific and immediately doable.
            4. End with 1-2 probing follow-up questions to uncover more they should be thinking about. Things like "Have you checked if..." or "Do you know whether..." — questions that lead to more action.

            Return JSON:
            {
                "reply": "Your conversational reply here... End with your follow-up questions.",
                "suggestedTasks": [
                    { "category": "Legal/Prevention/Logistics", "task": "Title of task", "description": "Short description", "priority": "High/Medium/Immediate" }
                ]
            }
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            reply: { type: Type.STRING },
                            suggestedTasks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        category: { type: Type.STRING },
                                        task: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        priority: { type: Type.STRING }
                                    },
                                    required: ["category", "task", "description", "priority"]
                                }
                            }
                        },
                        required: ["reply", "suggestedTasks"]
                    }
                }
            });

            const text = result.text;
            const data = text ? JSON.parse(text) : {};
            const aiMsg: ChatMessage = {
                role: 'ai',
                text: data.reply,
                suggestedTasks: data.suggestedTasks?.map((t: any, i: number) => ({
                    id: Date.now() + i.toString(),
                    ...t,
                    completed: false
                }))
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default', height: '600px', display: 'flex', flexDirection: 'column' }}>
            <h2>Strategy Chat & Brainstorming</h2>
            <p>Tell me what you're worried about (e.g., "I think they'll move cities" or "I'm out of money"). I'll help you turn that worry into a plan.</p>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '1rem' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: '1rem', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                            backgroundColor: m.role === 'user' ? 'var(--accent-muted)' : 'var(--surface-card)', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            maxWidth: '80%'
                        }}>
                            <strong>{m.role === 'user' ? 'You' : 'Guide'}: </strong> {m.text}
                            
                            {m.suggestedTasks && m.suggestedTasks.length > 0 && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>SUGGESTED ACTIONS:</div>
                                    {m.suggestedTasks.filter(t => !dismissedTaskIds.has(t.id)).map(t => (
                                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', backgroundColor: addedTaskIds.has(t.id) ? '#e8f5e9' : '#f1f8e9', padding: '0.5rem', borderRadius: '8px', opacity: addedTaskIds.has(t.id) ? 0.7 : 1 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.task}</div>
                                                <div style={{ fontSize: '0.8rem' }}>{t.description}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.3rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                                                {addedTaskIds.has(t.id) ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 600 }}>✓ Added</span>
                                                ) : (
                                                    <>
                                                        <button className="button-secondary" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }} onClick={() => { onAddTask(t); setAddedTaskIds(prev => new Set(prev).add(t.id)); }}>
                                                            + Add
                                                        </button>
                                                        <button style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'none', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-tertiary)' }} onClick={() => setDismissedTaskIds(prev => new Set(prev).add(t.id))} title="Don't suggest this again">
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Thinking...</div>}
            </div>

            {vaultDocs.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                    <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                        <option value="">📎 Attach a document (optional)</option>
                        {vaultDocs.map(d => <option key={d.id} value={d.id}>{d.name} — {d.type} ({d.date})</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type your concern here..."
                />
                <button className="button-primary" onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

const MyChecklist: React.FC<{ items: ActionItem[]; setItems: React.Dispatch<React.SetStateAction<ActionItem[]>>; onOpenBrainstorm: () => void }> = ({ items, setItems, onOpenBrainstorm }) => {
    const [assistingTask, setAssistingTask] = useState<ActionItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [archivedItems, setArchivedItems] = useState<ActionItem[]>(() => {
        const saved = localStorage.getItem('recoveryHubArchived');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('recoveryHubArchived', JSON.stringify(archivedItems));
    }, [archivedItems]);

    const toggleItem = (id: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    };

    const archiveItem = (id: string) => {
        const item = items.find(i => i.id === id);
        if (item) {
            setArchivedItems(prev => [item, ...prev]);
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const restoreItem = (id: string) => {
        const item = archivedItems.find(i => i.id === id);
        if (item) {
            setItems(prev => [item, ...prev]);
            setArchivedItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const deleteItem = (id: string) => {
        if (confirm("Are you sure you want to delete this task? This cannot be undone.")) {
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = !searchTerm || item.task.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
        return matchesSearch && matchesPriority;
    });

    const exportTasksPDF = () => {
        const doc = new jsPDF();
        
        // Professional Header
        doc.setFillColor(30, 58, 95); // Primary Blue
        doc.rect(0, 0, 210, 20, 'F');
        
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("RECOVERY HUB: OFFICIAL ACTION PLAN", 10, 13);
        
        // Watermark
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(40);
        doc.text("LEGAL PRIVILEGE", 40, 150, { angle: 45 });

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 30);
        doc.text("Confidential Case Document", 150, 30);
        
        let y = 40;
        
        const categories = ['Immediate', 'High', 'Medium', 'Low'];
        const allItems = [...items, ...archivedItems]; // Include archived in PDF

        categories.forEach(prio => {
            const tasks = allItems.filter(i => i.priority === prio);
            if (tasks.length > 0) {
                // Section Header
                doc.setFontSize(12);
                doc.setFillColor(240, 240, 245);
                doc.rect(10, y-6, 190, 8, 'F');
                
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text(`${prio.toUpperCase()} PRIORITY`, 12, y);
                y += 8;
                
                tasks.forEach(item => {
                    const check = item.completed ? "[X]" : "[  ]";
                    
                    // Task Title
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${check} ${item.task}`, 15, y);
                    y += 5;
                    
                    // Task Desc
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                    const lines = doc.splitTextToSize(item.description, 170);
                    doc.text(lines, 20, y);
                    y += (lines.length * 5) + 8;
                    
                    if (y >= 270) {
                        doc.addPage();
                        y = 20;
                    }
                });
                y += 5;
            }
        });
        
        doc.save("Official_Action_Plan.pdf");
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2>Action Plan</h2>
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    <button className="button-secondary" onClick={exportTasksPDF} style={{ fontSize: '0.8rem' }}>🖨️ PDF</button>
                    <button className="button-secondary" onClick={onOpenBrainstorm} style={{ fontSize: '0.8rem' }}>💡 Brainstorm</button>
                    <button className="button-secondary" onClick={() => setShowArchived(!showArchived)} style={{ fontSize: '0.8rem' }}>
                        {showArchived ? '← Back to Active' : `📦 Archive (${archivedItems.length})`}
                    </button>
                </div>
            </div>

            {!showArchived && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
                    <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }} />
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                        <option value="all">All Priorities</option>
                        <option value="Immediate">Immediate</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            )}

            {showArchived ? (
                <div className="items-list" style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Archived tasks are still included in PDF exports. Click restore to move back to active.</p>
                    {archivedItems.map(item => (
                        <div key={item.id} className="action-item completed">
                            <div className="action-item-header">
                                <strong className="action-item-task-text" style={{ textDecoration: 'line-through' }}>{item.task}</strong>
                                <button className="button-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => restoreItem(item.id)}>Restore</button>
                            </div>
                        </div>
                    ))}
                    {archivedItems.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No archived tasks yet. Complete a task and archive it to keep your list clean.</p>}
                </div>
            ) : (
                <div className="items-list">
                    {filteredItems.map(item => (
                        <div key={item.id} className={`action-item ${item.completed ? 'completed' : ''}`}>
                            <div className="action-item-header">
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" className="action-item-checkbox" checked={item.completed} onChange={() => toggleItem(item.id)} />
                                    <strong className="action-item-task-text">{item.task}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                    <button className="button-ai" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setAssistingTask(item)}>
                                        🤖 Help
                                    </button>
                                    {item.completed && (
                                        <button style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => archiveItem(item.id)} title="Archive">📦</button>
                                    )}
                                    <span className={`action-item-priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
                                    <button className="action-item-delete" onClick={() => deleteItem(item.id)} title="Delete Task">🗑️</button>
                                </div>
                            </div>
                            <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.9rem' }}>{item.description}</p>
                            {item.subtasks && item.subtasks.length > 0 && (
                                <div style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
                                    {item.subtasks.map(sub => (
                                        <div key={sub.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>- {sub.text}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && <p>No items yet. Go to Dashboard to generate a plan.</p>}
                    {items.length > 0 && filteredItems.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No tasks match your search.</p>}
                </div>
            )}

            {assistingTask && (
                <TaskAssistantModal task={assistingTask} onClose={() => setAssistingTask(null)} />
            )}
        </div>
    );
};

const DocumentVault: React.FC = () => {
    // ... (unchanged)
    const [files, setFiles] = useState<VaultDocument[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('');

    useEffect(() => {
        getFilesFromLocalVault().then(setFiles);
        if (auth.currentUser) {
            const q = query(collection(db, `users/${auth.currentUser.uid}/documents`));
            getDocs(q).then(snap => {
                const cloudDocs = snap.docs.map(d => d.data() as VaultDocument);
                if (cloudDocs.length > 0) setFiles(cloudDocs);
            });
        }
    }, []);

    const analyzeAndSaveDocument = async (file: File) => {
        setIsAnalyzing(true);
        setAnalysisStatus(`Analyzing ${file.name}...`);
        try {
            const base64 = await fileToBase64(file);
            const prompt = `
            Analyze this document image/PDF for an international child abduction case. 
            Extract:
            1. "type": What is it? (e.g., Court Order, Police Report).
            2. "date": The specific date written ON the document (YYYY-MM-DD). 
            3. "summary": A 2-sentence summary.
            4. "extractedText": The full text content.
            Return JSON.
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: [
                    { inlineData: { mimeType: file.type, data: base64 } },
                    { text: prompt }
                ],
                config: { responseMimeType: "application/json" }
            });

            const text = result.text;
            const analysis = text ? JSON.parse(text) : {};
            
            const docData: VaultDocument = {
                id: Date.now().toString(),
                name: file.name,
                type: analysis.type || 'Uncategorized',
                date: analysis.date || new Date().toISOString().split('T')[0],
                summary: analysis.summary || 'No summary available',
                extractedText: analysis.extractedText || '',
                fileType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                isPublic: false // Default to private
            };

            if (auth.currentUser) {
                await setDoc(doc(db, `users/${auth.currentUser.uid}/documents`, docData.id), docData);
            }
            await saveFileToLocalVault(docData, file);
            setFiles(prev => [...prev, docData]);
            setAnalysisStatus('Done!');
            setTimeout(() => setAnalysisStatus(''), 2000);

        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Are you sure you want to delete this document? This cannot be undone.")) {
            try {
                await deleteFileFromLocalVault(id);
                if (auth.currentUser) {
                    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/documents`, id));
                }
                setFiles(files.filter(f => f.id !== id));
            } catch(e) {
                console.error(e);
                alert("Error deleting file.");
            }
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Digital Vault & RAG Context</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Documents are analyzed by AI to extract dates and context.</p>
            
            <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
                <input 
                    type="file" 
                    id="vault-upload" 
                    style={{ display: 'none' }} 
                    onChange={(e) => e.target.files?.[0] && analyzeAndSaveDocument(e.target.files[0])} 
                    accept=".pdf,image/*"
                />
                <label htmlFor="vault-upload" className="button-primary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                    {isAnalyzing ? 'Analyzing...' : '➕ Upload & Analyze Document'}
                </label>
                {analysisStatus && <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{analysisStatus}</div>}
            </div>

            <div style={{ marginTop: '1rem' }}>
                {files.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-raised)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.95rem' }}>Upload court orders, custody agreements, police reports, embassy correspondence — anything related to your case. The AI reads each document, extracts key details, and makes them available to all other tools (Strategy Chat, Comms HQ, etc).</p>
                    </div>
                )}
                {files.map(f => (
                    <div key={f.id} className="action-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <strong>{f.name}</strong>
                                <span className="journal-badge" style={{marginLeft: '0.5rem'}}>{f.type}</span>
                            </div>
                            <button onClick={() => handleDelete(f.id)} style={{color: '#ba1a1a', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}} title="Delete Document">🗑️</button>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Dated: {f.date}</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{f.summary}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CaseJournal: React.FC = () => {
    // ... (unchanged)
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [newLog, setNewLog] = useState<{ type: string; description: string; people: string }>({ type: 'Phone Call', description: '', people: '' });
    const [isPolishing, setIsPolishing] = useState(false);
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'logs' | 'docs'>('all');
    const [analyzingDoc, setAnalyzingDoc] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('caseLogs');
        if (saved) setLogs(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('caseLogs', JSON.stringify(logs));
        if (auth.currentUser && logs.length > 0) {
            setDoc(doc(db, `users/${auth.currentUser.uid}/data/logs`), { items: logs }).catch(() => {});
        }
    }, [logs]);

    const fetchTimeline = () => {
        getFilesFromLocalVault().then(docs => {
             const docItems = docs.map(d => ({
                 ...d,
                 timelineType: 'doc',
                 dateObj: (d.date || d.uploadedAt) ? new Date(d.date || d.uploadedAt) : new Date()
             }));
             const logItems = logs.map(l => ({
                 ...l,
                 timelineType: 'log',
                 dateObj: new Date(l.date + ' ' + l.time)
             }));

             const combined = [...docItems, ...logItems].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
             setTimelineItems(combined);
        });
    };

    useEffect(() => {
        fetchTimeline();
    }, [logs]);

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (files.length > 5) { alert("Maximum 5 files at a time to avoid issues."); return; }
        if (!confirm(`Upload ${files.length} file(s) and map to timeline? OK = Yes, Cancel = No`)) return;

        setAnalyzingDoc(true);
        let totalEvents = 0;

        for (let fi = 0; fi < files.length; fi++) {
            const file = files[fi];
            try {
                 const base64 = await fileToBase64(file);
                 const prompt = `
                 Analyze this legal document. It may describe a HISTORY of events.

                 Return a JSON object with two parts:
                 1. "mainDoc": { "type": "Doc Type", "date": "Filing Date", "summary": "Overall summary" }
                 2. "timelineEvents": An ARRAY of specific events mentioned in the text.
                    Example: [ { "date": "2023-01-01", "description": "Hearing occurred", "type": "Court" } ]

                 If only one event, just put it in the array.
                 `;

                 const result = await ai.models.generateContent({
                    model: "gemini-2.5-pro",
                    contents: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: prompt }
                    ],
                    config: { responseMimeType: "application/json" }
                 });
                 const text = result.text;
                 const analysis = text ? JSON.parse(text) : {};

                 const vaultDoc: VaultDocument = {
                    id: (Date.now() + fi).toString(),
                    name: file.name,
                    type: analysis.mainDoc?.type || 'Evidence',
                    date: analysis.mainDoc?.date || new Date().toISOString().split('T')[0],
                    summary: analysis.mainDoc?.summary || 'Uploaded to timeline',
                    extractedText: '',
                    fileType: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    isPublic: false
                };

                if (auth.currentUser) {
                    await setDoc(doc(db, `users/${auth.currentUser.uid}/documents`, vaultDoc.id), vaultDoc);
                }
                await saveFileToLocalVault(vaultDoc, file);

                if (analysis.timelineEvents && Array.isArray(analysis.timelineEvents)) {
                    const newLogs: LogEntry[] = analysis.timelineEvents.map((evt: any, i: number) => ({
                        id: (Date.now() + fi * 100 + i).toString(),
                        date: evt.date,
                        time: "09:00",
                        type: evt.type || "Other",
                        description: evt.description + ` (Source: ${file.name})`,
                        peopleInvolved: "",
                        createdAt: new Date().toISOString(),
                        isPublic: false,
                        sourceDocId: vaultDoc.id
                    }));
                    setLogs(prev => [...newLogs, ...prev]);
                    totalEvents += newLogs.length;
                }
            } catch (err) {
                console.error(`Failed to process ${file.name}:`, err);
            }
        }

        alert(`Processed ${files.length} file(s). Found ${totalEvents} timeline events.`);
        fetchTimeline();
        setAnalyzingDoc(false);
        e.target.value = '';
    };

    const addLog = () => {
        const entry: LogEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            type: newLog.type as any,
            description: newLog.description,
            peopleInvolved: newLog.people,
            createdAt: new Date().toISOString(),
            isPublic: false
        };
        setLogs([entry, ...logs]);
        setNewLog({ type: 'Phone Call', description: '', people: '' });
    };

    const deleteLog = (id: string) => {
        if (confirm("Delete this timeline entry?")) {
            setLogs(logs.filter(l => l.id !== id));
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setEditText(item.timelineType === 'doc' ? (item.summary || '') : (item.description || ''));
    };

    const saveEdit = async (id: string, isDoc: boolean) => {
        if (isDoc) {
            // Update doc summary in IndexedDB
            try {
                const vaultDb = await openVaultDB();
                const tx = vaultDb.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(id);
                req.onsuccess = () => {
                    if (req.result) {
                        req.result.summary = editText;
                        store.put(req.result);
                    }
                };
                tx.oncomplete = () => fetchTimeline();
            } catch {}
        } else {
            setLogs(logs.map(l => l.id === id ? { ...l, description: editText } : l));
        }
        setEditingId(null);
        setEditText('');
    };

    const deleteVaultDoc = async (id: string) => {
        if (!confirm('Delete this document from the timeline?')) return;
        await deleteFileFromLocalVault(id);
        fetchTimeline();
    };

    const togglePublic = async (id: string, isDoc: boolean, currentVal: boolean) => {
        if (isDoc) {
             const db = await openVaultDB();
             const tx = db.transaction(STORE_NAME, 'readwrite');
             const store = tx.objectStore(STORE_NAME);
             const req = store.get(id);
             req.onsuccess = () => {
                 const data = req.result;
                 data.isPublic = !currentVal;
                 store.put(data);
                 fetchTimeline(); 
             };
        } else {
            setLogs(logs.map(l => l.id === id ? { ...l, isPublic: !currentVal } : l));
        }
    };

    const polishWithAI = async () => {
        if (!newLog.description) return;
        setIsPolishing(true);
        try {
            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: `Rewrite this log entry to be objective, factual, and professional for a legal affidavit. Remove emotional language. Context: ${newLog.description}`
            });
            if (result.text) {
                setNewLog(prev => ({ ...prev, description: result.text! }));
            }
        } catch (e) { console.error(e); } finally { setIsPolishing(false); }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("EVIDENCE LOG & CHRONOLOGY", 10, 13);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 28);
        
        let y = 40;
        
        timelineItems.forEach(item => {
            if (filter === 'logs' && item.timelineType !== 'log') return;
            if (filter === 'docs' && item.timelineType !== 'doc') return;

            const isDoc = item.timelineType === 'doc';
            const dateStr = isDoc ? new Date(item.date).toLocaleDateString() : `${item.date}`;
            const typeStr = isDoc ? item.type.toUpperCase() : item.type.toUpperCase();
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(dateStr, 10, y);
            
            doc.setFillColor(isDoc ? 230 : 240, isDoc ? 230 : 240, isDoc ? 250 : 250);
            doc.rect(40, y-4, 160, 8, 'F');
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(typeStr, 42, y+1);
            
            y += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            
            const desc = isDoc ? `FILE: ${item.name}\nSUMMARY: ${item.summary}` : item.description;
            const lines = doc.splitTextToSize(desc, 155);
            doc.text(lines, 42, y);
            
            y += (lines.length * 5) + 8;
            
            if (y >= 270) {
                doc.addPage();
                y = 20;
            }
        });
        doc.save("Case_Timeline.pdf");
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Case Timeline (Evidence Locker)</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={filter} onChange={(e: any) => setFilter(e.target.value)} style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
                        <option value="all">Show All</option>
                        <option value="logs">Logs Only</option>
                        <option value="docs">Documents Only</option>
                    </select>
                    <button className="button-secondary" onClick={exportPDF}>🖨️ Export Log PDF</button>
                </div>
            </div>
            
            <p style={{fontSize:'0.85rem', color: 'var(--text-secondary)'}}>
                Click the Globe 🌍 icon to toggle an event as "Public" for your campaign website.
            </p>

            {/* Fixed Z-Index and Positioning for Upload Form */}
            <div className="form-grid" style={{ position: 'relative', zIndex: 10, backgroundColor: 'var(--surface-raised)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border-default)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Add New Event Log</h4>
                <select value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value})}>
                    <option>Phone Call</option>
                    <option>Email</option>
                    <option>Police Interaction</option>
                    <option>Court</option>
                    <option>Sighting</option>
                    <option>Other</option>
                </select>
                <input type="text" placeholder="People Involved (e.g. Officer Smith)" value={newLog.people} onChange={e => setNewLog({...newLog, people: e.target.value})} />
                <div className="full-width">
                    <textarea placeholder="Description of event..." value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} rows={3} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
                        <button className="button-ai" onClick={polishWithAI} disabled={!newLog.description || isPolishing}>
                            {isPolishing ? 'Polishing...' : '✨ Polish for Court'}
                        </button>
                        
                        <div style={{ position: 'relative' }}>
                            <input type="file" id="timeline-upload" style={{display:'none'}} onChange={handleDocUpload} accept=".pdf,image/*" multiple />
                            <label htmlFor="timeline-upload" className="button-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', position: 'relative', zIndex: 20 }}>
                                {analyzingDoc ? 'Analyzing Documents...' : '➕ Upload Docs (up to 5)'}
                            </label>
                        </div>
                    </div>
                </div>
                <button className="button-primary full-width" onClick={addLog}>Add Entry</button>
            </div>

            <div className="journal-timeline">
                {timelineItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No timeline entries yet</p>
                        <p style={{ fontSize: '0.9rem' }}>Start by uploading documents (court orders, police reports, custody agreements) — the AI will read them and automatically build your timeline. You can also manually log calls, emails, and meetings above.</p>
                    </div>
                )}
                {timelineItems.map((item, i) => {
                    if (filter === 'logs' && item.timelineType !== 'log') return null;
                    if (filter === 'docs' && item.timelineType !== 'doc') return null;

                    const isDoc = item.timelineType === 'doc';
                    const isPublic = item.isPublic || false;

                    return (
                        <div key={item.id || i} className="journal-entry" style={{ borderLeft: isDoc ? '4px solid #715573' : '1px solid var(--border-default)' }}>
                            <div className="journal-meta" style={{width: '100%'}}>
                                <span className="journal-badge" style={{ backgroundColor: isDoc ? '#fbd7fc' : '#dbe2f9', color: isDoc ? '#29132d' : '#141b2c' }}>
                                    {isDoc ? `📄 ${item.type}` : item.type}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {isDoc ? (item.date && !isNaN(new Date(item.date).getTime()) ? new Date(item.date).toLocaleDateString() : 'No date') : `${item.date} at ${item.time}`}
                                </span>
                                {!isDoc && item.peopleInvolved && <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>with {item.peopleInvolved}</span>}
                                
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => togglePublic(item.id, isDoc, isPublic)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            fontSize: '1.2rem',
                                            opacity: isPublic ? 1 : 0.3,
                                            filter: isPublic ? 'none' : 'grayscale(100%)'
                                        }}
                                        title={isPublic ? "Public on Website" : "Private (Click to Publish)"}
                                    >
                                        🌍
                                    </button>
                                    <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Edit Entry">
                                        ✏️
                                    </button>
                                    <button onClick={() => isDoc ? deleteVaultDoc(item.id) : deleteLog(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ba1a1a' }} title="Delete Entry">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {editingId === item.id ? (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                                        <button className="button-primary" onClick={() => saveEdit(item.id, isDoc)} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>Save</button>
                                        <button className="button-secondary" onClick={() => setEditingId(null)} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="journal-description">
                                    {isDoc ? (
                                        <>
                                            <strong>📎 {item.name}</strong>{item.sourceDocId ? '' : ''}
                                            <br/>
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.summary}</span>
                                        </>
                                    ) : item.description}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const KnowledgeBaseBuilder: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
    // Seed Data — Comprehensive Global Knowledge Base
    const seedData: KnowledgeBaseEntry[] = [
        // --- LEGAL TEXTS & TREATIES ---
        { id: 'kb-1', entryType: 'resource', name: 'Hague Convention on International Child Abduction (1980)', countryPair: 'Global', resourceType: 'Legal Text',
            tags: ['Legal', 'Treaty', 'Hague', 'Official'], summary: 'The core international treaty governing the return of children wrongfully removed across borders. Covers 101 signatory countries.',
            fullText: `THE HAGUE CONVENTION ON THE CIVIL ASPECTS OF INTERNATIONAL CHILD ABDUCTION (1980)\n\nKey Articles:\n\nArticle 1 — Objects\na) To secure the prompt return of children wrongfully removed to or retained in any Contracting State.\nb) To ensure that rights of custody and access are effectively respected across Contracting States.\n\nArticle 3 — Wrongful Removal\nRemoval or retention is wrongful where it breaches custody rights under the law of the State of habitual residence.\n\nArticle 12 — One-Year Rule\nIf proceedings begin within one year, the court SHALL order return. After one year, return may still be ordered unless the child is settled in the new environment.\n\nArticle 13 — Exceptions to Return\na) The left-behind parent was not exercising custody rights.\nb) The left-behind parent consented or acquiesced.\nc) Grave risk of physical/psychological harm (the most litigated exception).\nd) The child objects and has reached an age of maturity.\n\nArticle 15 — Declaration of Wrongfulness\nCourts may request a declaration from the home country that the removal was wrongful.\n\nArticle 21 — Access Rights\nCentral Authorities shall promote peaceful enjoyment of access rights.\n\nKey Deadlines:\n- File within 1 year of abduction for strongest case\n- Central Authority must act within 6 weeks\n- Courts should decide promptly (6 weeks is the benchmark)`
        },
        { id: 'kb-2', entryType: 'resource', name: 'Brussels II Revised Regulation (EU)', countryPair: 'EU Countries', resourceType: 'Legal Text',
            tags: ['Legal', 'EU', 'Brussels II'], summary: 'EU regulation that strengthens Hague Convention returns within EU member states. Stricter rules, harder to refuse return.',
            fullText: `BRUSSELS II REVISED (REGULATION 2201/2003) — EU CHILD ABDUCTION RULES\n\nApplies between: All EU member states (except Denmark)\n\nKey Features:\n- Overrides Hague Convention Article 13(b) in many cases\n- The court in the country of habitual residence has FINAL say\n- Even if the destination country refuses return, the home country court can override that decision\n- Stricter timelines: 6 weeks for first instance court decisions\n- Child must be heard during proceedings (if age/maturity allows)\n\nArticle 11(4): A court cannot refuse return under Article 13(b) if adequate arrangements have been made to protect the child.\n\nArticle 11(6-8) — The Override Mechanism:\nIf a court refuses to return the child, the case goes BACK to the court of habitual residence, which can order the return — and that order is directly enforceable.\n\nPractical Effect: Within the EU, it is extremely difficult to prevent a return order. The home country court always gets the last word.`
        },
        { id: 'kb-3', entryType: 'resource', name: 'UN Convention on the Rights of the Child', countryPair: 'Global', resourceType: 'Legal Text',
            tags: ['Legal', 'UN', 'Children Rights'], summary: 'The most widely ratified human rights treaty. Article 11 specifically addresses illicit transfer and non-return of children abroad.',
            fullText: `UN CONVENTION ON THE RIGHTS OF THE CHILD — RELEVANT ARTICLES\n\nArticle 11:\n1. States Parties shall take measures to combat the illicit transfer and non-return of children abroad.\n2. States shall promote bilateral or multilateral agreements or accession to existing agreements.\n\nArticle 9:\n1. A child shall not be separated from their parents against their will, except when competent authorities determine separation is in the child's best interests.\n3. The right to maintain personal relations and direct contact with BOTH parents on a regular basis.\n\nArticle 10:\n1. Applications to enter or leave a State for family reunification shall be dealt with in a positive, humane and expeditious manner.\n\nArticle 35:\nStates shall take all measures to prevent the abduction of, sale of, or traffic in children.\n\nWhy This Matters: The UNCRC is ratified by every UN member state except the US. It can be cited in courts worldwide to support the child's right to maintain contact with both parents.`
        },
        // --- TEMPLATES ---
        { id: 'kb-4', entryType: 'template', name: 'Police Report Filing Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Police', 'Documentation', 'First Steps'], summary: 'Standardized format for filing an international parental child abduction report with local police.',
            fullText: `MISSING CHILD / PARENTAL ABDUCTION — POLICE REPORT TEMPLATE\n\n[Give this document to the officer taking your report]\n\n1. CHILD INFORMATION\nFull Legal Name: _______________\nDate of Birth: _______________\nPassport Number(s): _______________\nNationality/Nationalities: _______________\nLast Known Location: _______________\nPhysical Description: _______________\nRecent Photo Attached: Yes / No\n\n2. TAKING PARENT / ABDUCTOR\nFull Name: _______________\nRelationship to Child: _______________\nNationality: _______________\nPassport Number: _______________\nKnown Addresses Abroad: _______________\nVehicle (if known): _______________\n\n3. CIRCUMSTANCES OF ABDUCTION\nDate/Time of Taking or Last Contact: _______________\nLocation Child Was Taken From: _______________\nDestination Country (known/suspected): _______________\nMethod of Travel (flight, car, etc.): _______________\nFlight Details (if known): _______________\n\n4. CUSTODY STATUS\nCustody Order in Place: Yes / No\nIssuing Court: _______________\nType of Order: Sole / Joint / Other\nCopy of Order Attached: Yes / No\n\n5. REQUEST TO OFFICER\n- Please enter the child into [your country's missing persons database]\n- Please issue a port alert / border alert if available\n- This may constitute an offence under [cite relevant law]\n- Please provide a copy of this report with a case/reference number\n\n6. REPORTING PARENT\nName: _______________\nContact Phone: _______________\nEmail: _______________\nAddress: _______________\nLawyer (if any): _______________`
        },
        { id: 'kb-5', entryType: 'template', name: 'Hague Convention Application Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Hague', 'Legal', 'Application', 'Central Authority'], summary: 'Template for filing a Hague Convention return application through your Central Authority.',
            fullText: `HAGUE CONVENTION APPLICATION FOR RETURN OF CHILD\n\n[Submit to YOUR country's Central Authority]\n\nPART 1 — APPLICANT (LEFT-BEHIND PARENT)\nFull Name: _______________\nDate of Birth: _______________\nNationality: _______________\nCurrent Address: _______________\nPhone: _______________\nEmail: _______________\nPassport Number: _______________\n\nPART 2 — CHILD\nFull Name: _______________\nDate of Birth: _______________\nNationality: _______________\nPassport Number(s): _______________\nHabitual Residence Before Removal: _______________\n\nPART 3 — RESPONDENT (TAKING PARENT)\nFull Name: _______________\nDate of Birth: _______________\nNationality: _______________\nCurrent/Suspected Address Abroad: _______________\nPhone (if known): _______________\n\nPART 4 — FACTS\nDate of Wrongful Removal/Retention: _______________\nCountry Child Taken To: _______________\nCircumstances of Removal: _______________\n[Describe what happened — when, how the child was taken, and how you discovered it]\n\nPART 5 — LEGAL BASIS\nCustody Rights Under Law of: _______________\nBasis of Custody: Court Order / Operation of Law / Agreement\nCustody Order Details: _______________\nWere You Exercising Custody Rights? Yes\nDid You Consent to Removal? No\n\nPART 6 — ATTACHMENTS\n□ Copy of custody order (certified/translated if needed)\n□ Child's birth certificate\n□ Photo of child (recent)\n□ Photo of respondent\n□ Marriage/divorce certificate\n□ Proof of habitual residence\n□ Police report\n□ Any relevant communications (texts, emails)\n\nPART 7 — RELIEF SOUGHT\nI request the return of my child to [Country] under the Hague Convention 1980.\n\nSignature: _______________ Date: _______________`
        },
        { id: 'kb-6', entryType: 'template', name: 'Letter to Central Authority', countryPair: 'Global', resourceType: 'Template',
            tags: ['Central Authority', 'Letter', 'Government'], summary: 'Cover letter template to accompany your Hague application to your Central Authority.',
            fullText: `[Your Name]\n[Your Address]\n[Date]\n\nTo: Central Authority for the Hague Convention\n[Country Name]\n[Address]\n\nRe: Application for Return of [Child's Full Name], DOB [Date]\n\nDear Sir/Madam,\n\nI am writing to request the urgent return of my child, [Child's Name], who was wrongfully [removed from / retained in] [Country] by [Taking Parent's Name] on or about [Date].\n\nMy child's habitual residence was [Country/City] prior to the wrongful removal. I was exercising custody rights at the time of the removal, and I did not consent to the removal or retention.\n\nI am enclosing:\n1. Completed Hague Convention application form\n2. Certified copy of the custody order from [Court Name]\n3. Child's birth certificate\n4. Recent photographs of [Child's Name] and [Taking Parent's Name]\n5. Copy of the police report filed on [Date]\n6. Supporting evidence of habitual residence\n\nI respectfully request that you:\n- Accept and transmit this application to the Central Authority of [Destination Country]\n- Assist in locating my child\n- Take all measures to secure the voluntary return of my child\n- If voluntary return is not possible, initiate judicial proceedings for return\n\nTime is of the essence. Every day that passes makes return more difficult and causes further harm to my child.\n\nI am available at [phone] and [email] at any time.\n\nYours faithfully,\n[Your Name]`
        },
        { id: 'kb-7', entryType: 'template', name: 'Embassy/Consulate Contact Letter', countryPair: 'Global', resourceType: 'Template',
            tags: ['Embassy', 'Consulate', 'Government'], summary: 'Template letter for contacting your country\'s embassy or consulate in the destination country about your child.',
            fullText: `[Your Name]\n[Your Address]\n[Date]\n\nTo: [Your Country] Embassy / Consulate\n[City, Destination Country]\n\nRe: International Parental Child Abduction — [Child's Full Name], DOB [Date]\n\nDear Consul / Consular Officer,\n\nI am a citizen of [Your Country] and I am writing to report the international parental abduction of my child:\n\nChild: [Full Name], DOB [Date], Passport No. [Number]\nTaking Parent: [Name], believed to be residing in [City/Region, Country]\nDate of Abduction: [Date]\n\nI have filed:\n□ Police report in [Country] — Case No. [Number]\n□ Hague Convention application with [Central Authority]\n□ Custody order from [Court] — Case No. [Number]\n\nI am requesting the following consular assistance:\n1. Welfare and whereabouts check on my child\n2. Confirmation that my child has not been issued a passport by [Destination Country]\n3. Flagging my child's passport to prevent further travel\n4. Information about local legal resources and approved attorneys\n5. Any available support under the consular assistance framework\n\nI understand you cannot intervene in legal proceedings, but I am requesting all available consular support.\n\nI am available immediately at [phone] and [email].\n\nYours sincerely,\n[Your Name]\n[Passport Number]`
        },
        { id: 'kb-8', entryType: 'template', name: 'Lawyer Engagement Letter Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Lawyer', 'Legal', 'Engagement'], summary: 'Template for initial contact with a family law attorney specializing in international child abduction.',
            fullText: `INITIAL CONSULTATION REQUEST — INTERNATIONAL CHILD ABDUCTION\n\n[Your Name]\n[Date]\n\nDear [Attorney Name],\n\nI am seeking urgent legal representation regarding the international parental abduction of my child.\n\nCase Summary:\n- Child: [Name], DOB [Date], citizen of [Country/Countries]\n- Taken by: [Name], relationship: [Mother/Father]\n- From: [City, Country] to [City, Country]\n- Date of abduction: [Date]\n- Custody status: [Sole/Joint custody, with details]\n- Hague Convention filed: Yes/No (Date: ___)\n\nKey Questions:\n1. Do you handle Hague Convention cases?\n2. What is your experience with cases involving [Destination Country]?\n3. What are the estimated costs and timeline?\n4. Do you work on a fixed fee, hourly, or contingency basis?\n5. Can you represent me in [Destination Country] or do you work with local counsel there?\n6. What is your assessment of the strength of my case?\n\nDocuments I Can Provide:\n- Custody order\n- Birth certificate\n- Police report\n- Communication evidence (texts, emails)\n- Travel records\n\nI need someone who understands both the legal process and the urgency. Every day matters.\n\nPlease let me know your availability for an initial consultation.\n\nRegards,\n[Your Name]\n[Phone] | [Email]`
        },
        { id: 'kb-9', entryType: 'template', name: 'School Records Request Letter', countryPair: 'Global', resourceType: 'Template',
            tags: ['School', 'Evidence', 'Records'], summary: 'Template to request records from a school where your child may be enrolled in the destination country.',
            fullText: `[Your Name]\n[Your Address]\n[Date]\n\nTo: Principal / Head of School\n[School Name]\n[Address, City, Country]\n\nRe: Records Request for [Child's Full Name], DOB [Date]\n\nDear Principal,\n\nI am the [mother/father] and legal custodian of [Child's Name], DOB [Date]. I am writing to request information regarding my child's enrollment at your school.\n\nI hold a custody order from [Court Name, Country] (copy enclosed) which grants me [sole/joint] custody. My child was removed from [Country] without my consent on [Date] and I believe they may be enrolled at your institution.\n\nI am requesting:\n1. Confirmation of whether [Child's Name] is enrolled\n2. Copies of enrollment documents and who is listed as guardian\n3. Contact information provided by the enrolling parent\n4. School attendance records\n5. Any emergency contacts on file\n\nPlease note that I have parental rights under the enclosed custody order and under [applicable law]. Withholding this information may constitute aiding in the concealment of a child from a lawful custodian.\n\nI would appreciate your cooperation and discretion. I can be reached at [phone/email].\n\nYours sincerely,\n[Your Name]\n\nEnclosures:\n- Custody order (translated if applicable)\n- Child's birth certificate\n- Your identification`
        },
        { id: 'kb-10', entryType: 'template', name: 'Evidence Preservation Checklist', countryPair: 'Global', resourceType: 'Template',
            tags: ['Evidence', 'Documentation', 'Checklist'], summary: 'Comprehensive checklist of evidence to collect and preserve for court proceedings.',
            fullText: `EVIDENCE PRESERVATION CHECKLIST — INTERNATIONAL CHILD ABDUCTION\n\nCollect and secure ALL of the following. Courts rely heavily on documented evidence.\n\nIMMEDIATE PRESERVATION:\n□ Screenshots of ALL text messages with taking parent\n□ Email correspondence (download/export full threads)\n□ Social media posts/messages (screenshot with dates visible)\n□ WhatsApp/Telegram/Signal chat exports\n□ Call logs showing communication patterns\n□ Location data (Google Timeline, Find My, etc.)\n□ Flight booking confirmations\n□ Bank/credit card statements showing travel purchases\n\nLEGAL DOCUMENTS:\n□ Custody order (certified copy)\n□ Marriage certificate\n□ Divorce decree (if applicable)\n□ Child's birth certificate\n□ Both parents' passports (copies)\n□ Child's passport (copy)\n□ Visa documents\n□ Police report (with reference number)\n□ Hague application (stamped copy)\n\nPROOF OF HABITUAL RESIDENCE:\n□ Child's school enrollment records\n□ Medical/dental records\n□ Vaccination records\n□ Lease/mortgage showing family home\n□ Utility bills\n□ Child's extracurricular registrations\n□ Photos of child in home environment\n□ Statements from teachers, doctors, neighbors\n\nPROOF OF PARENTAL INVOLVEMENT:\n□ Photos/videos with child (dated)\n□ Records of school pickups, appointments\n□ Financial records showing child support/expenses\n□ Travel records (holidays together)\n□ Communication records showing co-parenting\n\nSTORAGE:\n- Keep ORIGINAL digital files (not just screenshots)\n- Back up everything to cloud storage\n- Create a timeline document linking evidence to dates\n- Keep physical copies in a safe place\n- Share copies with your lawyer\n\nIMPORTANT: Never delete anything. Even seemingly insignificant messages may prove crucial later.`
        },
        // --- PROCEDURES ---
        { id: 'kb-11', entryType: 'procedure', name: 'First 48 Hours: Critical Steps', countryPair: 'Global', resourceType: 'Procedure',
            tags: ['Urgent', 'First Steps', 'Procedure'], summary: 'The most critical actions to take within the first 48 hours of discovering your child has been abducted.',
            fullText: `FIRST 48 HOURS — CRITICAL ACTION STEPS\n\nThere is no time to waste. Complete these in order:\n\nHOUR 1-4:\n1. CALL POLICE — File a missing child report in your home country immediately\n   - Insist child is entered into the national missing persons database\n   - Request a port alert / border watch if possible\n   - Get the case reference number in writing\n\n2. SECURE PASSPORTS — Contact your passport authority\n   - Request child's passport be flagged or cancelled\n   - If child has dual nationality, contact BOTH countries' passport offices\n   - Report passports as stolen if necessary\n\n3. CALL A LAWYER — You need TWO lawyers:\n   - One in YOUR country (to file Hague application)\n   - One in the DESTINATION country (to handle local proceedings)\n   - Many countries have legal aid for Hague cases\n\nHOUR 4-12:\n4. CONTACT YOUR CENTRAL AUTHORITY\n   - File a Hague Convention application if applicable\n   - If the destination country is NOT a Hague signatory, ask about alternatives\n\n5. CONTACT YOUR EMBASSY/CONSULATE\n   - Request a welfare check on your child\n   - Ask about passport flagging in the destination country\n   - Request list of approved local attorneys\n\n6. PRESERVE ALL EVIDENCE\n   - Screenshot every message, email, social media post\n   - Download call logs\n   - Save any location data\n   - Document everything with dates and times\n\nHOUR 12-48:\n7. ALERT INTERPOL (through your police)\n   - Request a Yellow Notice (missing person) or Diffusion\n\n8. CONTACT NGOs\n   - International Centre for Missing & Exploited Children (ICMEC)\n   - Your country's missing children organization\n   - They can provide guidance and sometimes legal referrals\n\n9. DO NOT POST ON SOCIAL MEDIA (yet)\n   - Public pressure can backfire if timing is wrong\n   - Consult your lawyer first\n   - The taking parent may go into hiding\n\n10. SECURE YOUR FINANCES\n    - This will be expensive — start planning now\n    - Document every expense from day one\n    - Check if legal aid is available`
        },
        { id: 'kb-12', entryType: 'procedure', name: 'Filing a Hague Application: Step by Step', countryPair: 'Global', resourceType: 'Procedure',
            tags: ['Hague', 'Procedure', 'Step-by-Step'], summary: 'Detailed walkthrough of the Hague Convention application process from filing to court hearing.',
            fullText: `HAGUE CONVENTION APPLICATION — STEP-BY-STEP GUIDE\n\nSTEP 1: IDENTIFY YOUR CENTRAL AUTHORITY\n- Every Hague signatory has a Central Authority\n- Find yours at: https://www.hcch.net/en/instruments/specialised-sections/child-abduction\n- This is the government body that processes applications\n\nSTEP 2: GATHER YOUR DOCUMENTS\n- Custody order (translated and apostilled/legalized)\n- Child's birth certificate\n- Your identification/passport\n- Photos of child and taking parent\n- Police report\n- Evidence of habitual residence\n- Any evidence of the wrongful removal\n\nSTEP 3: COMPLETE THE APPLICATION\n- Use the standard Hague application form (available from your CA)\n- Be thorough — incomplete applications cause delays\n- Include all known addresses for the taking parent\n- Attach all supporting documents\n\nSTEP 4: SUBMIT TO YOUR CENTRAL AUTHORITY\n- Submit in person if possible (faster)\n- Keep copies of everything submitted\n- Get a receipt/acknowledgment with reference number\n- Ask for the name of the caseworker assigned\n\nSTEP 5: TRANSMISSION TO DESTINATION COUNTRY\n- Your CA sends the application to the destination country's CA\n- This should happen within days, not weeks\n- Follow up if you don't hear back within 2 weeks\n\nSTEP 6: LOCATION AND VOLUNTARY RETURN\n- Destination CA will try to locate your child\n- They may attempt to negotiate a voluntary return first\n- If voluntary return fails, judicial proceedings begin\n\nSTEP 7: COURT PROCEEDINGS\n- A judge in the destination country hears the case\n- You may need to attend (in person or remotely)\n- The court should decide within 6 weeks\n- The ONLY question: was the removal wrongful? The court does NOT decide custody.\n\nSTEP 8: ENFORCEMENT\n- If return is ordered, it must be enforced\n- Enforcement can be the hardest part in some countries\n- Your lawyer in the destination country handles this\n\nKEY TIMELINES:\n- File within 1 year for strongest case\n- Central Authority should act within 6 weeks\n- Court should decide within 6 weeks\n- Total realistic timeline: 3-12 months (varies hugely by country)`
        },
        { id: 'kb-13', entryType: 'procedure', name: 'Non-Hague Country Strategy', countryPair: 'Global', resourceType: 'Procedure',
            tags: ['Non-Hague', 'Strategy', 'Difficult Cases'], summary: 'What to do when your child has been taken to a country that is NOT a signatory to the Hague Convention.',
            fullText: `STRATEGY FOR NON-HAGUE CONVENTION COUNTRIES\n\nIf the destination country has NOT signed the Hague Convention, the legal path is much harder but NOT impossible.\n\nNon-Hague countries include many nations in the Middle East, North Africa, South/Southeast Asia, and parts of Africa.\n\nSTRATEGY OPTIONS:\n\n1. DIPLOMATIC CHANNELS\n- Contact your Ministry of Foreign Affairs\n- Request consular access to your child\n- Some countries have bilateral agreements outside the Hague\n- Political pressure through elected representatives can help\n\n2. LOCAL LEGAL PROCEEDINGS\n- Hire a lawyer IN the destination country\n- File for custody or visitation under LOCAL law\n- This can be slow, expensive, and unpredictable\n- Cultural and legal biases may exist — be prepared\n\n3. BILATERAL TREATIES\n- Check if your country has a bilateral arrangement with the destination\n- Some countries have consular conventions that address children\n- The EU has agreements with some non-Hague countries\n\n4. CRIMINAL PROSECUTION\n- File criminal charges in your home country\n- This can lead to an Interpol Red Notice\n- The taking parent may be arrested if they travel internationally\n- WARNING: This can make negotiation harder\n\n5. MEDIATION\n- International family mediation (e.g., through MIKK, reunite)\n- Can work when both parties are willing\n- Sometimes faster and less adversarial than courts\n\n6. POLITICAL/PUBLIC PRESSURE\n- Contact your elected representatives\n- Some countries respond to diplomatic pressure\n- Media coverage can help in some situations\n- Be strategic — consult your lawyer first\n\n7. NGO SUPPORT\n- ICMEC, ISS (International Social Service)\n- Country-specific organizations\n- Some offer legal referrals and advocacy\n\nREALITY CHECK:\n- These cases can take years\n- Costs can be very high\n- The legal system in the destination country may not be favorable\n- Maintaining contact with your child is the priority\n- Document EVERYTHING for future proceedings\n- Never give up — the legal landscape changes over time`
        },
        // --- GUIDANCE ---
        { id: 'kb-14', entryType: 'guidance', name: 'Working with Central Authorities', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Central Authority', 'Government', 'Tips'], summary: 'Practical advice on how to effectively work with Central Authority caseworkers.',
            fullText: `WORKING WITH CENTRAL AUTHORITIES — PRACTICAL TIPS\n\nCentral Authorities (CAs) are government bodies that process Hague applications. They vary enormously in quality and speed.\n\nWHAT THEY DO:\n- Receive and transmit applications\n- Help locate the child\n- Attempt to secure voluntary return\n- Arrange for legal proceedings\n- Provide information about local law\n\nWHAT THEY DON'T DO:\n- Represent you in court (you need your own lawyer)\n- Guarantee a timeline\n- Make custody decisions\n- Physically retrieve your child\n\nTIPS FOR EFFECTIVENESS:\n1. BE ORGANIZED — Submit a complete, well-documented application\n2. BE PERSISTENT — Follow up weekly. CAs are often understaffed.\n3. BE POLITE BUT FIRM — Caseworkers handle many cases. Yours needs to stand out.\n4. KEEP A LOG — Record every call, email, and update with dates\n5. ASK FOR THE CASEWORKER'S NAME — Build a relationship\n6. FOLLOW UP IN WRITING — After phone calls, email a summary of what was discussed\n7. KNOW YOUR RIGHTS — CAs are required to act within 6 weeks. If they don't, you can file a complaint.\n8. GET YOUR ELECTED REPRESENTATIVE INVOLVED — A letter from a member of parliament can accelerate things\n9. HIRE A LAWYER IN BOTH COUNTRIES — Don't rely solely on the CA\n10. TRANSLATION — Submit everything pre-translated if possible. This saves weeks.\n\nIF YOUR CA IS SLOW:\n- Request a progress update in writing\n- Set a deadline and follow up\n- Contact the Hague Conference (HCCH) Permanent Bureau\n- Contact your elected representatives\n- Consider going to the destination country directly with your lawyer`
        },
        { id: 'kb-15', entryType: 'guidance', name: 'Article 13(b) Defense: Grave Risk', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Legal', 'Defense', 'Article 13b', 'Grave Risk'], summary: 'Understanding the "grave risk" defense — the most common reason courts refuse to return children.',
            fullText: `ARTICLE 13(b) — THE GRAVE RISK DEFENSE\n\nThis is the most commonly raised defense by taking parents. Understanding it helps you prepare.\n\nWHAT IT SAYS:\nThe court is not bound to order return if there is a "grave risk" that return would expose the child to physical or psychological harm or an intolerable situation.\n\nHOW IT'S USED:\nThe taking parent will typically allege:\n- Domestic violence\n- Child abuse\n- Unsafe conditions in the home country\n- Mental health issues of the left-behind parent\n- The child's strong objections\n\nHOW TO COUNTER IT:\n1. UNDERTAKINGS — Offer protective measures:\n   - Agree to live separately\n   - Agree to supervised contact initially\n   - Offer financial support for return\n   - Propose a safe house arrangement\n\n2. EVIDENCE:\n   - Show there were no prior reports of abuse\n   - Provide character references\n   - Show your involvement as a parent\n   - Counter false allegations with evidence\n\n3. HOME COUNTRY PROTECTIONS:\n   - Show that your home country has adequate domestic violence protections\n   - Provide evidence of available shelters, restraining orders, etc.\n   - Courts must consider whether protective measures exist in the home country\n\n4. LEGAL ARGUMENTS:\n   - 13(b) has a HIGH threshold — it's not about best interests\n   - The risk must be GRAVE, not merely concerning\n   - Courts are increasingly skeptical of unsubstantiated allegations\n   - The taking parent bears the burden of proof\n\nIMPORTANT:\n- False allegations of abuse are common in abduction cases\n- Courts are becoming more aware of this tactic\n- Your lawyer should be experienced in countering 13(b) defenses\n- Evidence preparation is KEY — start gathering evidence immediately`
        },
        { id: 'kb-16', entryType: 'guidance', name: 'Managing Legal Costs', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Costs', 'Financial', 'Legal Aid'], summary: 'Guide to understanding and managing the significant costs of international child abduction cases.',
            fullText: `MANAGING LEGAL COSTS — INTERNATIONAL CHILD ABDUCTION\n\nThese cases are expensive. Plan carefully.\n\nTYPICAL COSTS:\n- Lawyer in home country: Varies by country and complexity\n- Lawyer in destination country: Often the biggest expense\n- Translation of documents: Certified translations are required\n- Apostille/legalization of documents\n- Travel costs (flights, accommodation for hearings)\n- Court filing fees\n- Expert witness fees (if needed)\n- Private investigator (if child's location unknown)\n\nFUNDING OPTIONS:\n\n1. LEGAL AID\n- Many Hague signatory countries provide free legal representation\n- The destination country's CA can inform you about eligibility\n- In the UK: Legal Aid Agency\n- In the EU: Most countries provide legal aid for Hague cases\n- In the US: The Central Authority can provide referrals\n\n2. PRO BONO\n- Some law firms handle Hague cases pro bono\n- International Bar Association has referral programs\n- University law clinics sometimes assist\n\n3. CROWDFUNDING\n- GoFundMe, JustGiving campaigns\n- Share through your support network\n- Be careful about how much case detail you share publicly\n\n4. NGO ASSISTANCE\n- Some NGOs provide financial assistance or legal referrals\n- ICMEC, reunite, MIKK\n- Country-specific organizations\n\n5. COST ORDERS\n- In some jurisdictions, the court can order the taking parent to pay your legal costs\n- Discuss this with your lawyer\n\nCOST-SAVING TIPS:\n- Do as much preparation yourself as possible\n- Organize your evidence clearly (saves lawyer time)\n- Use certified translation services (not your lawyer's rates)\n- Attend hearings remotely where possible\n- Document EVERY expense — you may be able to claim restitution later`
        },
        { id: 'kb-17', entryType: 'guidance', name: 'Maintaining Contact with Your Child', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Contact', 'Communication', 'Child'], summary: 'Strategies for maintaining or re-establishing contact with your child during the recovery process.',
            fullText: `MAINTAINING CONTACT WITH YOUR CHILD\n\nThis is often the hardest part. The taking parent may block all communication.\n\nIMMEDIATE STEPS:\n1. Request contact through the Central Authority\n2. Ask your lawyer to seek a court order for interim contact\n3. Contact through trusted family members/friends\n4. Request welfare check through your embassy/consulate\n\nTYPES OF CONTACT ORDERS:\n- Phone/video calls at scheduled times\n- Monitored communication through a third party\n- In-person supervised visits\n- Letter/email contact\n\nIF CONTACT IS BLOCKED:\n- Document every attempt to make contact\n- Keep a log with dates and times\n- Screenshot any blocked calls or undelivered messages\n- This evidence is valuable in court\n\nWHEN YOU DO GET CONTACT:\n- Stay calm and positive\n- Don't interrogate the child about their situation\n- Don't say negative things about the other parent\n- Tell them you love them and you're working to see them\n- Keep it age-appropriate\n- Note what the child says (for your records, not to use against them)\n\nTECHNOLOGY:\n- WhatsApp, FaceTime, Skype, Zoom for video calls\n- If you can send a device to your child, set up Family Sharing\n- Some parents send letters through trusted intermediaries\n\nPSYCHOLOGICAL IMPACT:\n- Parental alienation is common — the child may seem distant or hostile\n- This is NOT a reflection of your relationship\n- A child psychologist can help you understand and respond\n- Maintain consistency — keep trying even when it hurts\n\nIMPORTANT: Everything you say to your child may be monitored or used against you. Be careful, loving, and appropriate at all times.`
        },
        { id: 'kb-18', entryType: 'guidance', name: 'Mental Health and Self-Care', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Mental Health', 'Self-Care', 'Support'], summary: 'Taking care of yourself during this crisis is not optional — it is essential to your case.',
            fullText: `MENTAL HEALTH AND SELF-CARE DURING CHILD ABDUCTION\n\nThis is one of the most traumatic experiences a parent can face. You MUST take care of yourself.\n\nWHY IT MATTERS:\n- You cannot fight for your child if you collapse\n- Courts notice parents who are stable and capable\n- Your child needs you to be strong when they return\n- Burnout leads to mistakes in legal strategy\n\nIMMEDIATE SUPPORT:\n- Talk to someone — a friend, family member, or professional\n- Contact a parent support group (see below)\n- If you're in crisis, call your local mental health helpline\n- Allow yourself to grieve — this is a loss, even if temporary\n\nONGOING STRATEGIES:\n- Maintain routines (sleep, meals, exercise)\n- Limit time spent doom-scrolling or obsessively researching\n- Set specific times for case work, then step away\n- Accept help from friends and family\n- Consider therapy with someone experienced in trauma/grief\n- Journal your feelings (separate from case documentation)\n\nSUPPORT ORGANIZATIONS:\n- reunite (UK): Support groups for parents\n- National Center for Missing & Exploited Children (US)\n- ICMEC: International resources\n- MIKK: Mediation and support\n- Facebook groups for parents in similar situations\n- Local domestic violence or family crisis services\n\nWHAT TO EXPECT:\n- Grief, anger, helplessness are all normal\n- You may experience PTSD symptoms\n- Sleep disruption is very common\n- Concentration difficulties may affect your work\n- Relationships may be strained\n- Financial stress adds to the burden\n\nREMEMBER:\n- Asking for help is a sign of strength, not weakness\n- You are not alone — thousands of parents face this\n- Your child will need you to be well when this is resolved\n- Taking care of yourself IS fighting for your child`
        },
        // --- OPSEC ---
        { id: 'kb-19', entryType: 'opsec', name: 'Digital Security for Parents', countryPair: 'Global', resourceType: 'Operational Security',
            tags: ['Security', 'Digital', 'Privacy'], summary: 'Protect your digital information and communications during your case.',
            fullText: `DIGITAL SECURITY — PROTECTING YOUR CASE\n\nThe taking parent (or their lawyer) may try to access your communications or use your online activity against you.\n\nIMMEDIATE ACTIONS:\n□ Change ALL passwords (email, social media, banking)\n□ Enable two-factor authentication everywhere\n□ Remove the taking parent from shared accounts\n□ Check your phone for tracking apps or shared location\n□ Update your devices to latest software\n□ Review who has access to your cloud storage\n\nCOMMUNICATION SECURITY:\n- Use encrypted messaging (Signal, WhatsApp) for sensitive discussions\n- Be aware that emails can be subpoenaed\n- Phone calls with your lawyer are privileged — texts may not be\n- Don't discuss strategy on social media or in group chats\n- Assume anything you write may end up in court\n\nSOCIAL MEDIA:\n- Lock down privacy settings\n- Don't post about the case without legal advice\n- Don't post location data or travel plans\n- Be careful about what friends/family share about you\n- The taking parent's lawyer WILL search your social media\n\nSHARED DEVICES/ACCOUNTS:\n- Remove yourself from shared Apple/Google accounts\n- Deauthorize shared devices\n- Check for shared photo libraries\n- Review Find My Friends / Google sharing\n- Change Wi-Fi passwords at home\n\nDOCUMENT SECURITY:\n- Keep legal documents in a secure location\n- Use encrypted cloud storage for digital copies\n- Don't leave case files where others can access them\n- Password-protect sensitive files\n- Keep a backup of everything off-site`
        },
        // --- PREVENTION ---
        { id: 'kb-20', entryType: 'prevention', name: 'Preventing International Child Abduction', countryPair: 'Global', resourceType: 'Prevention Guide',
            tags: ['Prevention', 'Risk Factors', 'Early Warning'], summary: 'Warning signs and preventive measures if you suspect your partner may attempt to take your child abroad.',
            fullText: `PREVENTING INTERNATIONAL CHILD ABDUCTION\n\nIf you suspect your partner may take your child out of the country, act NOW.\n\nRED FLAGS:\n- Talking about moving "back home" permanently\n- Obtaining passport for child without your knowledge\n- Liquidating assets or moving money abroad\n- Quitting their job or ending local commitments\n- Applying for new identity documents\n- Increasing contact with family abroad\n- Making one-way flight bookings\n- Removing important documents from the home\n- Talking negatively about your country\n\nPREVENTIVE MEASURES:\n\n1. PASSPORT CONTROL\n- In many countries, both parents must consent to passport issuance\n- Register an objection with your passport authority\n- Check if child has been issued a second passport by another country\n- Some countries allow a "port alert" on the child\n\n2. COURT ORDERS\n- Seek a Prohibited Steps Order (UK) or equivalent\n- Request the court hold the child's passport\n- Get an order preventing removal from the jurisdiction\n- Register your custody order in the other parent's country\n\n3. DOCUMENTATION\n- Keep copies of all identity documents\n- Photograph your child regularly (for identification)\n- Maintain records of your involvement as a parent\n- Document any threats or suspicious behavior\n\n4. SCHOOL/CHILDCARE\n- Inform school about the risk\n- Ensure school has court orders on file\n- Request that child only be released to authorized persons\n\n5. BORDER MEASURES\n- Contact border authorities about travel restrictions\n- Some countries have departure alert systems\n- Interpol can issue alerts in extreme cases\n\n6. LEGAL PREPARATION\n- Consult a family lawyer experienced in international cases\n- Understand the law in both countries\n- Prepare documentation now, don't wait`
        },
        // --- COUNTRY-SPECIFIC GUIDANCE ---
        { id: 'kb-21', entryType: 'country_matrix', name: 'Central Authority Directory', countryPair: 'Global', resourceType: 'Contact Directory',
            tags: ['Central Authority', 'Directory', 'Contacts'], summary: 'How to find and contact the Central Authority in any Hague Convention signatory country.',
            fullText: `CENTRAL AUTHORITY DIRECTORY\n\nEvery country that has signed the Hague Convention has a designated Central Authority. Here's how to find yours:\n\nOFFICIAL DIRECTORY:\nhttps://www.hcch.net/en/instruments/specialised-sections/child-abduction\n(Click "Authorities" to search by country)\n\nKEY CENTRAL AUTHORITIES:\n\nUNITED STATES:\nOffice of Children's Issues, U.S. Department of State\nPhone: 1-888-407-4747\nEmail: PreventAbduction@state.gov\n\nUNITED KINGDOM:\nInternational Child Abduction and Contact Unit (ICACU)\nPhone: +44 (0)3000 616 222\nEmail: icacu@justice.gov.uk\n\nAUSTRALIA:\nAttorney-General's Department\nPhone: +61 2 6141 6666\nEmail: centralauthority@ag.gov.au\n\nCANADA:\nDepartment of Justice (varies by province)\nPhone: 1-613-957-4969\n\nGERMANY:\nBundesamt für Justiz\nPhone: +49 228 99 410-40\n\nFRANCE:\nMinistère de la Justice\nBureau de l'entraide civile et commerciale internationale\n\nNEW ZEALAND:\nMinistry of Justice\nPhone: +64 4 918 8800\n\nFOR ALL OTHER COUNTRIES:\nVisit the HCCH website above or contact:\nHCCH Permanent Bureau\nChurchillplein 6b\n2517 JW The Hague, Netherlands\nPhone: +31 70 363 3303\n\nTIP: If your CA is slow to respond, you can contact the Permanent Bureau for assistance.`
        },
        { id: 'kb-22', entryType: 'guidance', name: 'International NGOs and Support Organizations', countryPair: 'Global', resourceType: 'Resource Directory',
            tags: ['NGO', 'Support', 'Organizations', 'Help'], summary: 'Directory of international NGOs and organizations that assist with child abduction cases.',
            fullText: `INTERNATIONAL SUPPORT ORGANIZATIONS\n\nThese organizations provide varying levels of support — from information to legal referrals to direct advocacy.\n\nGLOBAL:\n- International Centre for Missing & Exploited Children (ICMEC)\n  www.icmec.org\n  Provides global resources and policy advocacy\n\n- International Social Service (ISS)\n  www.iss-ssi.org\n  Casework across borders, mediation\n\n- MIKK (German Mediation Centre)\n  www.mikk-ev.de\n  International family mediation\n\nUNITED STATES:\n- National Center for Missing & Exploited Children (NCMEC)\n  www.missingkids.org | 1-800-THE-LOST\n\n- Bring Abducted Children Home (BACH)\n  Advocacy and parent support\n\nUNITED KINGDOM:\n- reunite International Child Abduction Centre\n  www.reunite.org | +44 116 255 6234\n  Advice line, mediation, support groups\n\n- International Child Abduction and Contact Unit (ICACU)\n  Part of UK government — handles Hague applications\n\nAUSTRALIA:\n- International Social Service Australia\n  www.iss.org.au\n\nEUROPE:\n- Missing Children Europe\n  www.missingchildreneurope.eu\n  Coordinates national hotlines (116 000 in most EU countries)\n\n- Child Focus (Belgium)\n  www.childfocus.be\n\nMEDIATION SERVICES:\n- reunite mediation scheme (UK)\n- MIKK (Germany/International)\n- Crossroads Family Mediation (various)\n\nLEGAL NETWORKS:\n- International Academy of Family Lawyers (IAFL)\n  Can help find specialized lawyers worldwide\n\n- International Bar Association Family Law Section\n  Referral network for international cases`
        },
        { id: 'kb-23', entryType: 'guidance', name: 'Preparing for Court Hearings', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Court', 'Preparation', 'Hearing'], summary: 'How to prepare for Hague Convention court hearings and what to expect.',
            fullText: `PREPARING FOR COURT HEARINGS\n\nWhether you attend in person or remotely, preparation is critical.\n\nBEFORE THE HEARING:\n\n1. WITH YOUR LAWYER:\n- Review all submitted evidence\n- Prepare your witness statement\n- Anticipate the other side's arguments (especially Article 13b)\n- Prepare responses to allegations\n- Understand the judge's likely questions\n- Practice giving evidence clearly and calmly\n\n2. DOCUMENTATION:\n- Bring organized copies of everything\n- Prepare a chronological timeline of events\n- Have key documents flagged and easily accessible\n- Bring translated copies of foreign documents\n\n3. PRACTICAL:\n- Confirm date, time, and location of hearing\n- Arrange interpreter if needed\n- Plan travel and accommodation\n- If attending remotely, test technology in advance\n- Arrange childcare if you have other children\n\nDURING THE HEARING:\n- Dress formally and respectfully\n- Speak clearly and directly to the judge\n- Stay calm, even when hearing false allegations\n- Don't interrupt the other side\n- Follow your lawyer's guidance\n- Take notes if possible\n- If you don't understand a question, ask for clarification\n\nWHAT THE JUDGE CONSIDERS:\n- Was the removal wrongful under Article 3?\n- Was the child habitually resident in your country?\n- Were you exercising custody rights?\n- Has less than one year passed? (Article 12)\n- Does any exception under Article 13 apply?\n- What is the child's view? (if old enough)\n\nAFTER THE HEARING:\n- The judge may give a decision immediately or reserve it\n- If return is ordered, discuss enforcement timeline\n- If return is refused, discuss appeal options immediately\n- Document the outcome and next steps with your lawyer`
        },
        { id: 'kb-24', entryType: 'template', name: 'Witness Statement Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Court', 'Witness Statement', 'Legal'], summary: 'Template for preparing your witness statement for Hague Convention court proceedings.',
            fullText: `WITNESS STATEMENT — HAGUE CONVENTION PROCEEDINGS\n\n[Adapt this to your jurisdiction and lawyer's advice]\n\nIN THE [COURT NAME]\nCASE NUMBER: [Number]\n\nBETWEEN:\n[Your Name] — Applicant\nand\n[Taking Parent's Name] — Respondent\n\nWITNESS STATEMENT OF [YOUR FULL NAME]\n\nI, [Full Name], of [Address], state as follows:\n\n1. BACKGROUND\nI am the [mother/father] of [Child's Name], born on [Date]. I make this statement in support of my application for the return of [Child's Name] under the Hague Convention 1980.\n\n2. THE FAMILY\n[Describe your family — when you met the other parent, when the child was born, where you lived, etc.]\n\n3. HABITUAL RESIDENCE\n[Describe where the child lived, went to school, had medical care, had friends, etc.]\n[Provide evidence: school records, medical records, address history]\n\n4. CUSTODY RIGHTS\n[Explain your custody rights — by court order, by law, or by agreement]\n[Reference any court orders]\n\n5. THE ABDUCTION\n[Describe in detail what happened — the date, circumstances, how you discovered the child was gone]\n[Be factual and chronological]\n\n6. STEPS TAKEN\n[List every action you took — police report, Central Authority, lawyers, etc., with dates]\n\n7. IMPACT ON THE CHILD\n[Describe how the abduction has affected your child — separation from friends, school disruption, loss of contact with you, etc.]\n\n8. RESPONSE TO ALLEGATIONS\n[If you know the other side's arguments, address them here]\n\n9. UNDERTAKINGS OFFERED\n[List any protective measures you're willing to offer to address concerns]\n\n10. CONCLUSION\nI respectfully request that this Court order the return of [Child's Name] to [Country] pursuant to the Hague Convention 1980.\n\nI believe the facts stated in this witness statement are true.\n\nSigned: _______________\nDate: _______________`
        },
        { id: 'kb-25', entryType: 'template', name: 'Interpol Request Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Interpol', 'Police', 'International'], summary: 'Template to help police file an Interpol notice for your missing child.',
            fullText: `INTERPOL NOTICE REQUEST — GIVE TO YOUR LOCAL POLICE\n\n[Note: Only law enforcement can submit Interpol notices. This template helps them do it.]\n\nTo: [Police Officer/Detective Name]\nRe: Request for Interpol Notice — Missing Child (International Parental Abduction)\n\nOfficer,\n\nI am requesting that you submit a request to your Interpol National Central Bureau for one or more of the following:\n\nYELLOW NOTICE (Missing Person):\n- Purpose: To help locate a missing child\n- Child: [Full Name], DOB [Date]\n- Last seen: [Location, Date]\n- Believed to be in: [Country]\n\nDIFFUSION (Alert):\n- A less formal alert circulated to specific countries\n- Faster to issue than a formal notice\n- Can target specific countries where child may be\n\nInformation for the notice:\n- Child: [Name, DOB, Nationality, Passport No., Physical Description]\n- Abductor: [Name, DOB, Nationality, Passport No., Description]\n- Case reference: [Your police report number]\n- Custody order: [Court, Date, Reference]\n- Central Authority reference: [If Hague application filed]\n\nThis request is supported by:\n□ Police report (attached)\n□ Custody order (attached)\n□ Photos of child and abductor (attached)\n□ Passport details (attached)\n\nThank you for your assistance. Time is critical in these cases.\n\n[Your Name]\n[Contact details]`
        },
        { id: 'kb-26', entryType: 'template', name: 'Expense Documentation Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Expenses', 'Financial', 'Documentation'], summary: 'Template for documenting all case-related expenses for potential restitution claims.',
            fullText: `CASE EXPENSE DOCUMENTATION LOG\n\nKeep this running log updated. In many jurisdictions, you can claim these costs back.\n\nCASE: [Child's Name] — Recovery Expenses\nSTART DATE: [Date]\n\nCATEGORIES:\n\nLEGAL FEES:\nDate | Description | Law Firm/Lawyer | Amount | Currency | Receipt #\n_____|_____________|________________|________|__________|__________\n     |             |                |        |          |\n\nTRAVEL:\nDate | Description | From-To | Amount | Currency | Receipt #\n_____|_____________|_________|________|__________|__________\n     |             |         |        |          |\n\nTRANSLATION/DOCUMENTS:\nDate | Description | Provider | Amount | Currency | Receipt #\n_____|_____________|__________|________|__________|__________\n     |             |          |        |          |\n\nCOMMUNICATION:\nDate | Description | Amount | Currency | Receipt #\n_____|_____________|________|__________|__________\n     |             |        |          |\n\nINVESTIGATION:\nDate | Description | Provider | Amount | Currency | Receipt #\n_____|_____________|__________|________|__________|__________\n     |             |          |        |          |\n\nOTHER:\nDate | Description | Amount | Currency | Receipt #\n_____|_____________|________|__________|__________\n     |             |        |          |\n\nRUNNING TOTAL: _______________\n\nNOTES:\n- Keep ALL receipts (scan/photograph)\n- Convert foreign currency at the rate on the date of expense\n- Include travel costs (flights, hotels, meals)\n- Include lost income if applicable\n- Courts in some jurisdictions can order the abducting parent to reimburse reasonable costs\n- These records also help with tax deductions in some countries`
        },
        { id: 'kb-27', entryType: 'guidance', name: 'Parental Alienation: Recognition and Response', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Alienation', 'Psychology', 'Child'], summary: 'How to recognize parental alienation tactics and respond appropriately.',
            fullText: `PARENTAL ALIENATION IN ABDUCTION CASES\n\nParental alienation is when one parent systematically undermines the child's relationship with the other parent. It is extremely common in abduction cases.\n\nSIGNS OF ALIENATION:\n- Child refuses contact with no clear reason\n- Child repeats adult language about you ("You abandoned us")\n- Child cannot give specific reasons for their hostility\n- Child shows no ambivalence (all negative, no positive memories)\n- Child claims they came to these views independently\n- Child extends hostility to your entire family\n- Child shows guilt about having positive feelings toward you\n\nWHAT THE TAKING PARENT MAY DO:\n- Tell the child you don't love them or have moved on\n- Block communication attempts and say you never called\n- Rewrite history ("Your parent was always absent/abusive")\n- Create a new identity for the child\n- Involve the child in adult conflicts\n- Use the child as a messenger or spy\n- Reward the child for rejecting you\n\nHOW TO RESPOND:\n1. STAY CONSISTENT — Keep trying to make contact\n2. STAY POSITIVE — Never badmouth the other parent to the child\n3. DOCUMENT — Record every blocked call, unreturned message\n4. THERAPY — A child psychologist can help\n5. COURT — Request a psychological evaluation\n6. PATIENCE — Alienation effects can be reversed over time\n\nFOR COURT:\n- Parental alienation is increasingly recognized by courts worldwide\n- Expert evidence from a child psychologist is valuable\n- Your consistent attempts at contact demonstrate your commitment\n- Courts may order therapeutic intervention\n\nREMEMBER: Your child still loves you. What you are seeing is a survival mechanism, not their true feelings.`
        },
        { id: 'kb-28', entryType: 'guidance', name: 'Working with the Media', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Media', 'Press', 'Public Campaign'], summary: 'When and how to use media coverage strategically in your case.',
            fullText: `MEDIA AND PUBLIC CAMPAIGNS — STRATEGIC GUIDE\n\nMedia coverage can be a powerful tool, but it must be used strategically.\n\nWHEN MEDIA HELPS:\n- When diplomatic channels are slow\n- When there's political inaction\n- When the other parent is in hiding\n- When you need public support for funding\n- When your country's government needs pressure to act\n\nWHEN MEDIA CAN HURT:\n- Before you've filed legal proceedings\n- If it could endanger the child\n- If the taking parent might go further into hiding\n- If it violates court orders or proceedings\n- If it could prejudice judicial proceedings\n\nRULES:\n1. CONSULT YOUR LAWYER FIRST — Always\n2. CONTROL THE NARRATIVE — Prepare key messages\n3. PROTECT THE CHILD — Never share info that could harm them\n4. BE CONSISTENT — Same message everywhere\n5. STAY DIGNIFIED — Emotional outbursts hurt your case\n\nPREPARATION:\n- Write a press release (1 page, key facts only)\n- Prepare a media kit (photos, timeline, key facts)\n- Designate one spokesperson\n- Practice your talking points\n- Know what you will and won't discuss\n\nWHAT TO SAY:\n- Focus on the child's welfare\n- Describe your efforts to resolve through legal channels\n- Avoid personal attacks on the other parent\n- Emphasize you want what's best for the child\n- Mention the relevant legal framework (Hague Convention)\n\nCHANNELS:\n- Local/national newspapers\n- TV news (local and national)\n- Online media\n- Social media (controlled, strategic)\n- Parliamentary/congressional representatives\n- Podcasts and radio\n\nTIMING IS EVERYTHING: Coordinate with your lawyer and any ongoing legal proceedings.`
        },
        { id: 'kb-29', entryType: 'template', name: 'Timeline of Events Template', countryPair: 'Global', resourceType: 'Template',
            tags: ['Timeline', 'Documentation', 'Court'], summary: 'Structured template for creating a detailed chronological timeline of your case.',
            fullText: `CASE TIMELINE TEMPLATE\n\nA clear timeline is essential for court proceedings, lawyer consultations, and your own reference.\n\nINSTRUCTIONS:\n- Fill in every date you can remember\n- Include source/evidence for each entry\n- Keep this updated as events unfold\n- Share with your lawyer\n\nDate | Event | Evidence/Source | Notes\n_____|_______|________________|______\n\nSECTION 1: BACKGROUND\n[Date] | Met [other parent] | — | Location, circumstances\n[Date] | Child born | Birth certificate | Hospital, country\n[Date] | Marriage/partnership | Marriage cert | Location\n[Date] | Custody order obtained | Court order | Court name, case #\n[Date] | First signs of risk | [describe] | Messages, behavior\n\nSECTION 2: THE ABDUCTION\n[Date] | Last saw child | — | Location, circumstances\n[Date] | Discovered child was gone | [describe] | How you found out\n[Date] | Last communication with taking parent | Screenshot | What was said\n\nSECTION 3: RESPONSE\n[Date] | Filed police report | Report # | Station, officer\n[Date] | Contacted lawyer | — | Lawyer name, firm\n[Date] | Filed Hague application | Reference # | Central Authority\n[Date] | Contacted embassy | — | Response received\n[Date] | [Other actions taken] | | \n\nSECTION 4: ONGOING\n[Date] | Central Authority update | Email/letter | Status\n[Date] | Court hearing | Court records | Outcome\n[Date] | Contact with child | Log | Duration, method\n[Date] | [Continuing events] | | \n\nTIPS:\n- Be precise with dates (not "around March")\n- Attach evidence to each entry where possible\n- Note any missed deadlines by authorities\n- Record emotional state only in personal notes, not this timeline`
        },
        { id: 'kb-30', entryType: 'guidance', name: 'Understanding Habitual Residence', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Legal', 'Habitual Residence', 'Key Concept'], summary: 'The concept of habitual residence is the foundation of every Hague case. Understanding it is critical.',
            fullText: `HABITUAL RESIDENCE — THE KEY LEGAL CONCEPT\n\nThe entire Hague Convention revolves around one question: where was the child habitually resident before the abduction?\n\nWHAT IT MEANS:\n- Where the child had their settled, regular life\n- Not just where they were physically present\n- Considers: duration, stability, family ties, schooling, social connections\n- It's about the CHILD's connection, not just the parents'\n\nHOW COURTS DETERMINE IT:\n1. Duration of residence (usually several months minimum)\n2. Child's integration into the community\n3. School enrollment and attendance\n4. Medical/dental care received there\n5. Social connections (friends, activities)\n6. Parents' intentions when they moved there\n7. Housing stability\n8. Both parents' connections to the place\n\nSTRONG EVIDENCE OF HABITUAL RESIDENCE:\n- School records\n- Medical/dental records\n- Lease or mortgage documents\n- Utility bills\n- Tax returns\n- Employment records\n- Child's activity registrations (sports, music, etc.)\n- Statements from school staff, neighbors, family doctor\n- Photos and videos showing daily life\n- Social media posts showing settled life\n\nCOMMON DISPUTES:\n- "We were only visiting" vs. "We had moved there"\n- Dual habitual residence (courts generally reject this)\n- "Habitual residence had already changed" (the taking parent's argument)\n- Short periods of residence (can still establish habitual residence)\n\nWHY IT MATTERS:\n- If the child was NOT habitually resident in your country, the Hague Convention may not apply\n- The taking parent will often argue the child's habitual residence had shifted\n- Strong evidence of habitual residence is your best weapon\n\nPREPARE THIS EVIDENCE EARLY — it's the foundation of your entire case.`
        },
        { id: 'kb-31', entryType: 'template', name: 'MP/Congressional Representative Letter', countryPair: 'Global', resourceType: 'Template',
            tags: ['Government', 'Political', 'Advocacy'], summary: 'Template for writing to your elected representative about your international child abduction case.',
            fullText: `LETTER TO ELECTED REPRESENTATIVE\n\n[Your Name]\n[Your Address]\n[Your Constituency/District]\n[Date]\n\nDear [Title] [Name],\n\nI am writing as your constituent to request your urgent assistance with an international child abduction case.\n\nMY SITUATION:\nMy [son/daughter], [Child's Name], aged [age], was wrongfully [taken to / retained in] [Country] by [their mother/father] on [Date]. [He/She] has been there for [duration] and I have been unable to [see them / speak with them] since [date].\n\nWHAT I HAVE DONE:\n- Filed a police report (Case No. [Number])\n- Applied under the Hague Convention through [Central Authority] (Ref: [Number])\n- Engaged lawyers in both [Your Country] and [Destination Country]\n- Contacted the [Embassy/Consulate] in [City]\n\nTHE PROBLEM:\n[Describe the specific obstacle — slow Central Authority, uncooperative foreign government, lack of enforcement, etc.]\n\nWHAT I AM ASKING:\n1. A letter from your office to [the Central Authority / Foreign Ministry / Embassy] expressing concern about the pace of action\n2. A question raised in [Parliament / Congress] about the government's response to international child abduction\n3. Assistance in arranging a meeting with the relevant Minister or department\n4. Your office's support in communicating with the [Destination Country] government\n\nWHY THIS MATTERS:\n[Brief, emotional but controlled paragraph about impact on you and your child]\n\nI have enclosed a summary of my case with key documents. I am available to meet or discuss this at your earliest convenience.\n\nThank you for your attention to this matter.\n\nYours sincerely,\n[Your Name]\n[Contact details]\n\nEnclosures:\n- Case summary (1 page)\n- Timeline of events\n- Photos of [Child's Name]`
        },
        { id: 'kb-32', entryType: 'guidance', name: 'After the Return: What to Expect', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Return', 'Recovery', 'After'], summary: 'What happens after your child is returned — the legal and emotional journey continues.',
            fullText: `AFTER THE RETURN — WHAT TO EXPECT\n\nGetting your child back is not the end. It's a new chapter.\n\nIMMEDIATE PRIORITIES:\n\n1. SAFETY AND STABILITY\n- Establish a safe, calm environment\n- Return to familiar routines as much as possible\n- Don't overwhelm the child with questions\n- Let them adjust at their own pace\n\n2. LEGAL NEXT STEPS\n- A Hague return is NOT a custody order\n- You need to apply for custody in your home courts\n- The other parent may still have rights\n- Ensure passport security measures remain in place\n- Consider whether criminal charges are appropriate\n\n3. PSYCHOLOGICAL SUPPORT\n- Arrange therapy for your child immediately\n- A child psychologist experienced in abduction/reunification\n- You also need support — consider therapy for yourself\n- Family therapy may be appropriate later\n\nWHAT YOUR CHILD MAY EXPERIENCE:\n- Confusion and mixed loyalty\n- Anger (at you, at the other parent, at the situation)\n- Grief for the life they left behind\n- Fear about the future\n- Difficulty trusting either parent\n- Language or cultural readjustment\n- Academic challenges\n- Sleep disruption, behavioral changes\n\nWHAT NOT TO DO:\n- Don't badmouth the other parent\n- Don't interrogate about what happened\n- Don't celebrate their return as a "victory"\n- Don't deny the child's feelings about the other parent\n- Don't assume everything will immediately be normal\n\nRE-ABDUCTION PREVENTION:\n- Secure passports\n- Update court orders\n- Inform school and childcare\n- Consider supervised contact initially\n- Maintain vigilance\n\nREMEMBER:\n- Recovery takes time — months, sometimes years\n- Your child needs both parents (in most cases)\n- Professional help is essential, not optional\n- You've fought incredibly hard — now focus on healing`
        },
        { id: 'kb-33', entryType: 'guidance', name: 'Understanding Hague Convention Exceptions', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Legal', 'Hague', 'Exceptions', 'Defenses'], summary: 'Complete guide to all exceptions under which a Hague Convention return can be refused.',
            fullText: `HAGUE CONVENTION EXCEPTIONS — COMPLETE GUIDE\n\nThese are the ONLY reasons a court can refuse to order return:\n\n1. ARTICLE 12 — CHILD IS SETTLED\n- If more than 1 year has passed since the abduction AND\n- The child is now settled in their new environment\n- This is why SPEED is critical — file within 1 year\n- "Settled" means integrated into school, community, social life\n- Courts look at this strictly — mere presence is not enough\n\n2. ARTICLE 13(a) — NO CUSTODY RIGHTS OR CONSENT\n- You were not actually exercising custody rights at the time\n- OR you consented to the removal\n- OR you acquiesced after the removal\n- DEFENSE: Show you were actively parenting\n- DEFENSE: Show you never consented (or withdrew consent)\n- WARNING: Delayed action can look like acquiescence\n\n3. ARTICLE 13(b) — GRAVE RISK\n- Return would expose child to physical/psychological harm\n- OR place child in an intolerable situation\n- This is the MOST common defense raised\n- The threshold is HIGH — not just \"better off\" staying\n- Courts increasingly expect \"undertakings\" to address concerns\n- See the separate guide on Article 13(b) defenses\n\n4. ARTICLE 13 — CHILD'S OBJECTIONS\n- The child objects to return AND\n- The child has attained an age and degree of maturity\n- No fixed age — varies by jurisdiction (often 10-12+)\n- The child must have genuine, independent views\n- Courts are cautious about coaching/alienation\n\n5. ARTICLE 20 — FUNDAMENTAL RIGHTS\n- Return would violate fundamental human rights principles\n- Extremely rarely invoked\n- Not about best interests — about fundamental principles\n\nKEY POINTS:\n- The burden of proof is on the person opposing return\n- Exceptions are to be interpreted NARROWLY\n- Best interests of the child is NOT a ground for refusal\n- Return is the DEFAULT — exceptions are exactly that`
        },
        { id: 'kb-34', entryType: 'template', name: 'Emergency Passport Block Request', countryPair: 'Global', resourceType: 'Template',
            tags: ['Passport', 'Emergency', 'Prevention'], summary: 'Template for requesting emergency measures to prevent a child\'s passport being used for travel.',
            fullText: `EMERGENCY PASSPORT BLOCK REQUEST\n\n[Adapt to your country's passport authority]\n\n[Your Name]\n[Your Address]\n[Date]\n\nTo: [Passport Authority Name]\n[Address]\n\nURGENT — REQUEST FOR PASSPORT ALERT / BLOCK\n\nRe: [Child's Full Name], DOB [Date]\nPassport Number: [Number] (if known)\nNationality: [Nationality]\n\nDear Sir/Madam,\n\nI am the [mother/father] of the above-named child and I am requesting URGENT action to prevent this passport from being used for international travel.\n\nSITUATION:\nMy child has been wrongfully [taken abroad / I believe they are about to be taken abroad] by [Taking Parent's Name] without my consent.\n\nI REQUEST:\n1. An immediate alert/flag on my child's passport\n2. Prevention of any new passport being issued to my child without my written consent\n3. Notification if any attempt is made to use or renew this passport\n4. If possible, revocation of the current passport\n\nSUPPORTING DOCUMENTS:\n□ Custody order (attached)\n□ Police report (attached)\n□ My identification (attached)\n□ Child's birth certificate (attached)\n\nLEGAL BASIS:\n[Cite relevant law in your country — e.g., in many countries both parents must consent to passport issuance for a minor]\n\nIF THE CHILD HAS DUAL NATIONALITY:\nPlease note my child may also hold a [Country] passport. I am making a separate request to [that country's passport authority].\n\nThis matter is urgent. Every hour matters.\n\nContact me immediately at [phone] and [email].\n\nYours urgently,\n[Your Name]\n[Signature]`
        },
        { id: 'kb-35', entryType: 'guidance', name: 'Hague vs Non-Hague: Know Your Situation', countryPair: 'Global', resourceType: 'Guidance',
            tags: ['Hague', 'Non-Hague', 'Decision Tree'], summary: 'Quick guide to determine whether the Hague Convention applies to your situation.',
            fullText: `IS THE HAGUE CONVENTION APPLICABLE TO YOUR CASE?\n\nAnswer these questions:\n\n1. Is the destination country a Hague Convention signatory?\n   → Check: https://www.hcch.net/en/instruments/conventions/status-table/?cid=24\n   → If NO → Non-Hague strategy needed (see Non-Hague Country Strategy guide)\n   → If YES → Continue\n\n2. Is YOUR country also a signatory?\n   → If NO → The Convention doesn't apply between your two countries\n   → If YES → Continue\n\n3. Has the destination country accepted YOUR country's accession?\n   → Some countries have signed but don't accept all other signatories\n   → Check the status table above\n   → If NO → The Convention doesn't apply between your two countries\n   → If YES → Continue\n\n4. Was the child habitually resident in YOUR country before the abduction?\n   → If NO → You may not have standing under the Convention\n   → If YES → Continue\n\n5. Did you have custody rights under the law of your country?\n   → This can be by court order, by operation of law, or by agreement\n   → If NO → You may not have standing\n   → If YES → Continue\n\n6. Were you exercising those custody rights?\n   → Active parenting, not just legal rights on paper\n   → If YES → You likely have a strong Hague case\n\n7. Has more than one year passed since the abduction?\n   → If NO → File immediately, strongest position\n   → If YES → You can still file, but the \"settled\" defense becomes available\n\nIF THE HAGUE APPLIES:\n→ File immediately through your Central Authority\n→ Get lawyers in both countries\n→ Time is your enemy\n\nIF THE HAGUE DOESN'T APPLY:\n→ See Non-Hague Country Strategy guide\n→ Diplomatic, criminal, and local legal options\n→ More complex but not hopeless`
        },
    // --- ADVANCED TEMPLATES & PROCEDURES (from knowledgeBaseTemplates) ---
    {
        id: 'template-comprehensive-fbi-ipkca-report', entryType: 'template',
        name: 'US: FBI IPKCA Criminal Complaint Dossier',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['FBI', 'IPKCA', 'Criminal', 'US Law', 'Warrant'],
        summary: 'A complete, legally structured dossier to request a federal investigation under the International Parental Kidnapping Crime Act (18 U.S.C. § 1204).',
        phone: '1-800-CALL-FBI',
        url: 'https://www.fbi.gov/investigate/violent-crime/crimes-against-children',
        fullText: `TO: Special Agent in Charge, Violent Crimes Against Children Unit
FBI Field Office: [CITY, STATE]
CC: United States Attorney's Office, District of [DISTRICT]

SUBJECT: OFFICIAL REFERRAL: Violation of 18 U.S.C. § 1204 (International Parental Kidnapping)

I. EXECUTIVE SUMMARY
I, [YOUR NAME], am reporting the international abduction of my minor child, [CHILD'S NAME], by [ABDUCTOR'S NAME]. The child was removed from the United States on [DATE] with the intent to obstruct my lawful exercise of parental rights. I request the immediate opening of a federal investigation, the issuance of a UFAP warrant, and the involvement of the FBI Legal Attaché in [DESTINATION COUNTRY].

II. JURISDICTIONAL ELEMENTS (18 U.S.C. § 1204)
1. The child was in the United States immediately prior to the offense.
2. The Defendant, [ABDUCTOR'S NAME], is a [US CITIZEN / ALIEN ADMITTED FOR PERMANENT RESIDENCE].
3. The Defendant removed the child from the United States / retained the child outside the United States with the intent to obstruct my parental rights.

III. VICTIM & SUBJECT PROFILES

VICTIM (CHILD):
- Name: [FULL NAME]
- DOB: [DATE] (Age: [AGE])
- US Passport: [NUMBER] (Issued: [DATE])
- Foreign Passport: [NUMBER] (Country: [COUNTRY])
- Habitual Residence: [CITY, STATE] (Evidence: School records attached)

SUBJECT (ABDUCTOR):
- Name: [FULL NAME]
- Relationship: [MOTHER/FATHER]
- DOB: [DATE]
- Citizenship: [COUNTRIES]
- Last Known Address in US: [ADDRESS]
- Current Location: [ADDRESS IN FOREIGN COUNTRY OR 'UNKNOWN']

IV. EVIDENCE OF INTENT (PREMEDITATION)
- Flight: The Subject purchased one-way tickets on [AIRLINE] Flight [NUMBER] departing [DATE].
- Employment: The Subject resigned from their job on [DATE] (Evidence attached).
- Assets: The Subject liquidated [BANK ACCOUNTS / ASSETS] totaling $[AMOUNT] on [DATE].
- Communication: The Subject sent a text/email on [DATE] stating "[QUOTE]."

V. CUSTODY STATUS
At the time of removal, I held [SOLE / JOINT] legal custody pursuant to:
- Court Order: [CASE NUMBER] issued by [COURT NAME] on [DATE].
(A certified copy of the custody order/statute is attached as Exhibit A).

VI. REQUESTED LAW ENFORCEMENT ACTION
1. NCIC Entry: Enter the child and subject into NCIC immediately as Missing/Endangered.
2. Federal Warrant: Seek a criminal complaint and warrant for arrest under 18 U.S.C. § 1204.
3. Interpol: Request the issuance of a Red Notice (Subject) and Yellow Notice (Child).
4. Border Alerts: Notify CBP and foreign counterparts to prevent transit to a third country.

I declare under penalty of perjury that the foregoing is true and correct.

[YOUR SIGNATURE]
[DATE]
[PHONE NUMBER]`
    },
    {
        id: 'template-hague-undertakings', entryType: 'template',
        name: "Legal: 'Safe Harbor' Undertakings (To Win Return)",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Hague', 'Legal', 'Undertakings', 'Defense', 'Strategy'],
        summary: "When an abductor claims returning the child puts them at risk (Article 13b), you must offer 'Undertakings' — enforceable promises to the court that ensure safety. This template wins cases.",
        fullText: `PROPOSED UNDERTAKINGS (SAFE HARBOR MEASURES)

IN THE MATTER OF: [CHILD'S NAME]

To facilitate the immediate return of the child to [HOME COUNTRY] and to ameliorate any alleged risk under Article 13(b) of the Hague Convention, the Applicant, [YOUR NAME], hereby freely and voluntarily undertakes to this Court and the Courts of [HOME COUNTRY] as follows:

1. NON-PROSECUTION (CRIMINAL):
The Applicant agrees not to initiate or pursue criminal charges for parental kidnapping against the Respondent upon their return, subject to the discretion of the District Attorney/Crown Prosecution Service. The Applicant will request that any outstanding arrest warrants be recalled or suspended to allow the Respondent to travel.

2. HOUSING & ACCOMMODATION:
The Applicant shall vacate the former marital residence located at [ADDRESS] effectively immediately upon the Respondent's return, granting the Respondent and Child exclusive possession of the property until a court of competent jurisdiction in [HOME COUNTRY] orders otherwise.

3. INTERIM FINANCIAL SUPPORT:
The Applicant shall pay the Respondent the sum of [AMOUNT] per month for spousal/child maintenance, beginning on the date of return, until a financial order is made by the [HOME COUNTRY] court.

4. TRAVEL COSTS:
The Applicant shall purchase economy class airfare for the Respondent and the Child to travel from [CURRENT COUNTRY] to [HOME COUNTRY].

5. NO VIOLENCE / HARASSMENT:
The Applicant shall not harass, threaten, or approach the Respondent within [DISTANCE] meters, except for agreed-upon custodial exchanges.

6. JURISDICTION:
The Applicant agrees to submit to the jurisdiction of the [HOME COUNTRY] Family Court immediately upon return to determine long-term custody and visitation.

These undertakings are made to ensure the 'soft landing' of the child and are legally binding upon the Applicant.`
    },
    {
        id: 'guide-us-mexico-strategy', entryType: 'country_matrix',
        name: "Country Strategy: US to Mexico (The Amparo Nightmare)",
        countryPair: 'US-Mexico', resourceType: 'Country Strategy',
        tags: ['Mexico', 'Amparo', 'Hague', 'LATAM', 'Strategy'],
        summary: "Detailed strategy for Mexico, the most common destination for US abductions. Explains how to navigate the 'Amparo' appeal system which causes years of delay.",
        fullText: `STRATEGIC ANALYSIS: US -> MEXICO ABDUCTION

Mexico is a Hague partner, but enforcement is complicated by the 'Amparo' system (Constitutional Protection appeals). Without a specific strategy, cases can drag for 3-5 years.

PHASE 1: THE HAGUE FILING (First 30 Days)
- Authority: Application goes to the SRE (Secretaría de Relaciones Exteriores).
- Venue: You must file in the Federal Court (Juzgado de Distrito), NOT the local family court. Local judges are often biased. Federal judges are better trained.
- Precautionary Measures (Medidas Precautorias): Your initial filing MUST request an immediate border alert (Alerta Migratoria) to stop the abductor from taking the child further.

PHASE 2: THE RESTITUTION HEARING
- Mexico has a 'concentrated' hearing phase. You will likely testify via video.
- The Judge will interview the child. In Mexico, children as young as 4 or 5 are often interviewed.

PHASE 3: THE AMPARO (The Trap)
- If you win the return order, the abductor will file an 'Amparo Indirecto' claiming their human rights were violated.
- Effect: This automatically stays (pauses) the return of the child.
- Counter-Strategy: Your lawyer must immediately file a 'Recurso de Revisión' requesting an expedited review. Do not let the file sit. Petition the appellate court every week.

CRITICAL ERROR TO AVOID:
Do NOT attempt 'Self-Help' (re-kidnapping) in Mexico. Kidnapping is a severe federal crime. You will be imprisoned, and you will lose all standing in the Hague case.

CONTACTS:
- SRE Family Law Division: dgdpic@sre.gob.mx
- US Embassy Mexico City (ACS): MexicoCityACS@state.gov`
    },
    {
        id: 'template-digital-forensics-affidavit', entryType: 'procedure',
        name: 'Digital Forensics & Preservation Protocol',
        countryPair: 'General', resourceType: 'Procedure',
        tags: ['Digital', 'Forensics', 'Evidence', 'Tracing', 'Technology'],
        summary: 'How to legally capture and present digital evidence (social media, cloud data) to prove flight risk or location without violating privacy laws.',
        fullText: `DIGITAL EVIDENCE COLLECTION & PRESERVATION PROTOCOL

OBJECTIVE: To secure proof of (A) Location and (B) Premeditation (Intent) before the abductor deletes it.

STEP 1: PRESERVATION (The 'Do Not Delete' Phase)
If you have shared access to accounts (iCloud, Google, Amazon, Bank), DO NOT CHANGE THE PASSWORDS yet. Changing passwords alerts them, causing them to go dark.
- Log in quietly.
- Export data: Use 'Google Takeout' or 'Download Your Information' on Facebook to pull a full archive.

STEP 2: LOCATION TRIANGULATION
Look for these specific metadata markers:
1. Google Photos: Open recent photos -> Click 'Info' (i) -> View Map Location.
2. IP Addresses: Check Gmail 'Last Account Activity' or Facebook 'Security and Login' settings.
3. Uber/Lyft/Grab: Check 'Past Trips'. This gives you exact drop-off addresses.

STEP 3: PROVING PREMEDITATION (Crucial for Court)
Courts grant immediate custody if you prove 'Flight Risk'. Look for:
- Search History: "Non-extradition countries," "How to get a passport for a minor," "Jobs in [COUNTRY]."
- Commerce: Purchases of luggage, translation services, or liquidation of assets.

STEP 4: THE AFFIDAVIT TEMPLATE (For your Lawyer)
"I, [NAME], attest that on [DATE], I accessed the shared computer located in the marital home. I observed the following:
- On [DATE], the Respondent searched for 'Schools in [FOREIGN CITY]'.
- On [DATE], the Respondent emailed a realtor in [FOREIGN COUNTRY].
Attached are screenshots labeled Exhibit A-C. These searches occurred 3 weeks prior to the alleged 'vacation', demonstrating a premeditated plan to permanently relocate."`
    },
    {
        id: 'template-article13b-rebuttal', entryType: 'template',
        name: "Legal: Rebuttal to Article 13(b) 'Grave Risk'",
        countryPair: 'General', resourceType: 'Legal Filing',
        tags: ['Hague', 'Article 13b', 'Legal', 'Defense', 'Rebuttal'],
        summary: "The 'Grave Risk' defense is the #1 tool used by abductors to stop a return. This is the legal script your lawyer needs to defeat it.",
        fullText: `LEGAL ARGUMENT: REBUTTAL TO ARTICLE 13(b) DEFENSE

1. THE THRESHOLD IS 'GRAVE', NOT 'UNCOMFORTABLE':
The Article 13(b) exception requires a 'grave' risk — meaning immediate physical danger or war-zone conditions. It is not a vehicle for litigating the 'best interests' of the child. That is for the home court to decide.

2. HOME COUNTRY PROTECTIONS ARE ADEQUATE:
The Courts of [HOME COUNTRY] have robust child protection laws, restraining orders, and emergency shelters. The Hague Convention operates on the presumption that the courts of the signatory state are capable of protecting the child. The Respondent has failed to show that the legal system is effectively broken or unavailable.

3. SOLIPSISTIC RISK (CREATED BY ABDUCTOR):
The Respondent argues that if they are arrested upon return, the child will suffer. This is a risk of the abductor's own making. A parent cannot create a risk (by kidnapping) and then use that risk as a defense against return. Furthermore, the Applicant has offered Undertakings to neutralize this risk.

4. SEPARATION OF CHILD AND PRIMARY CARER:
The Respondent argues they are the 'primary attachment figure' and cannot return. Case law establishes that if the abducting parent refuses to return with the child, they cannot rely on the psychological harm of separation as a defense, provided the Left-Behind Parent pays for their ticket. The refusal to return is a choice, not a necessity.

CONCLUSION:
The Article 13(b) defense must fail because the risk is not 'grave' and can be mitigated by the specific protective measures available in [HOME COUNTRY].`
    },
    {
        id: 'guide-non-hague-litigation', entryType: 'guidance',
        name: 'Strategy: Non-Hague Countries (Litigation vs. Negotiation)',
        countryPair: 'General', resourceType: 'Strategy Guide',
        tags: ['Non-Hague', 'Strategy', 'India', 'Middle East', 'China', 'Negotiation'],
        summary: "If there is no treaty (e.g., India, China, UAE), you have two paths: The 'Hard Way' (Criminal/Leverage) or the 'Soft Way' (Foreign Custody Filing). You usually need both.",
        fullText: `STRATEGIC PLAYBOOK: NON-HAGUE COUNTRIES

When a child is taken to a country with no treaty, there is no mechanism to force a return. You must choose a strategy based on LEVERAGE.

PATH A: THE 'HARD' LEVERAGE (Criminal Pressure)
Goal: Make the abductor's life so difficult they negotiate a return.
1. Federal Warrant/Criminal Warrant: Obtain a felony warrant for kidnapping immediately.
2. Interpol Red Notice: Traps the abductor in the destination country.
3. Passport Cancellation: Revoke the abductor's visa or passport if possible.
4. Financial Freeze: Cut off all money. Sue family members who funded the flight.

PATH B: THE 'SOFT' LITIGATION (Foreign Court)
Goal: Win custody under the foreign country's laws.
1. Submit to Jurisdiction: File for custody in their court.
2. The 'Forum Conveniens' Argument: Argue the child is a foreigner.
3. Cultural/Religious Law: In Sharia courts, argue custodial violations. In India, argue 'Parens Patriae'.

THE HYBRID STRATEGY (RECOMMENDED):
Start with Path A (Hard Leverage). When the abductor realizes they are trapped and broke, offer Path B (Settlement). "I will drop the Interpol notice and the criminal charges IF you return the child."`
    },
    {
        id: 'template-emergency-custody-motion', entryType: 'template',
        name: 'Legal: Emergency Ex Parte Motion for Sole Custody',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['Legal', 'Custody', 'Emergency', 'Motion', 'UCCJEA'],
        summary: "The immediate motion you file in your home court the moment you discover the abduction. This gives you the 'Rights of Custody' needed for the Hague case.",
        fullText: `EMERGENCY MOTION FOR TEMPORARY SOLE CUSTODY & WRIT OF ASSISTANCE

1. JURISDICTION:
The child, [CHILD'S NAME], has resided in [STATE/COUNTY] for the last [NUMBER] months/years, establishing this Court as the 'Home State' under the UCCJEA.

2. EMERGENCY CIRCUMSTANCES:
On [DATE], the Respondent removed the child from the jurisdiction without the Petitioner's consent.

3. RELIEF REQUESTED:
a. Sole Legal and Physical Custody of the minor child to the Petitioner.
b. Suspension of the Respondent's visitation rights until further hearing.
c. A directive that the child be immediately returned to [STATE].
d. A 'Writ of Assistance' authorizing all law enforcement officers to take the child into protective custody.
e. A specific finding that the removal was wrongful and a violation of custody rights (required for Hague Article 3).

4. NOTICE:
Notice should be waived due to the risk that alerting the Respondent will cause them to flee further into hiding.`
    },
    {
        id: 'matrix-japan-enforcement-detail', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to Japan (Enforcement Nuances)',
        countryPair: 'US-Japan', resourceType: 'Country Strategy',
        tags: ['Japan', 'Hague', 'Asia', 'Enforcement', 'Strategy'],
        summary: "Detailed look at the Japan enforcement reforms (2020). Returns are legally possible but operationally difficult.",
        fullText: `STRATEGIC ANALYSIS: US -> JAPAN ABDUCTION

Historically, Japan was a 'black hole' for abduction. Since signing the Hague in 2014 and the Civil Execution Act amendments in 2020, returns are legally possible but operationally difficult.

THE CRITICAL HURDLE: 'DIRECT ENFORCEMENT'
Under the new law, if a parent refuses to return the child after a court order, an 'Execution Officer' can physically retrieve the child. HOWEVER:
1. The execution officer must be present.
2. The child must not strictly refuse (difficult with alienated teens).
3. The Left-Behind Parent MUST be present in Japan to receive the child immediately.

STRATEGY:
1. VISITATION IS A TRAP: If you agree to a visitation schedule while the Hague case is pending, the judge may deny the return. Argue visitation is insufficient.
2. HABEAS CORPUS: Consider filing in the Japanese High Court if the abductor is hiding the child.
3. CRIMINAL CHARGES: Japan generally refuses to extradite its own citizens. Use warrants as leverage, not as a recovery tool.

CONTACT:
Ministry of Foreign Affairs (MOFA) - Hague Convention Division: +81-3-5501-8466`
    },
    {
        id: 'checklist-reunification-safety', entryType: 'procedure',
        name: 'Protocol: The Physical Handover (Safety & Logistics)',
        countryPair: 'General', resourceType: 'Procedure',
        tags: ['Reunification', 'Safety', 'Logistics', 'Handover'],
        summary: 'The moment of handover is dangerous. The abductor is volatile. This is the safety protocol for the day you get your child back.',
        fullText: `PROTOCOL FOR PHYSICAL REUNIFICATION (HANDOVER DAY)

1. LOCATION:
NEVER do the handover at the abductor's home. Request a neutral, secure location:
- A Police Station Lobby
- The Embassy or Consulate
- A Court designated exchange center

2. THE 'GRAB BAG':
Have a bag ready:
- Certified Copy of the Return Order (translated)
- The Child's Passport (do not let the abductor hold it)
- Snacks/Toys (distraction)
- A new phone for the child if older

3. THE INTERACTION:
- Do not engage with the abductor. Do not gloat. Do not apologize.
- If the child is crying (common due to alienation), remain calm.
- "I love you, you are safe, we are going home." Repeat this.

4. IMMEDIATE DEPARTURE:
- Go directly to the airport.
- Have your lawyer alert Airport Immigration that you are passing through with a valid court order.`
    },
    {
        id: 'template-state-dept-welfare-robust', entryType: 'template',
        name: 'US: Dept of State Welfare & Whereabouts Request',
        countryPair: 'US', resourceType: 'Letter Template',
        tags: ['State Dept', 'Welfare Check', 'Consular', 'US'],
        summary: "A detailed request to the Office of Children's Issues for a welfare visit with specific concerns and messages to deliver.",
        fullText: `SUBJECT: URGENT ACTION REQUEST: Welfare & Whereabouts Visit - [CHILD'S NAME] - [CASE NUMBER]

TO: AskCI@state.gov (US Dept of State)

To the Country Officer,

I request that the US Embassy in [CITY, COUNTRY] conduct a physical welfare visit to my US Citizen child, [CHILD'S NAME], immediately.

1. LOCATION INTELLIGENCE:
The child is believed to be at: [ADDRESS].

2. SPECIFIC CONCERNS TO INVESTIGATE:
- Medical: The child suffers from [CONDITION]. Please visually confirm medication.
- Schooling: Is the child enrolled?
- Alienation: Is the child being allowed to speak English? Are they being told I am dead/in prison?

3. MESSAGES TO DELIVER:
- To the Child: "Your [father/mother] loves you and is fighting to bring you home."
- To the Abductor: Please hand-deliver the attached amnesty offer.

4. PRIVACY WAIVER:
I have attached a signed Privacy Act Waiver.

Please provide a written report within 48 hours.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-uk-tipstaff-order', entryType: 'template',
        name: 'UK: Application for Tipstaff Location Order',
        countryPair: 'UK', resourceType: 'Legal Filing',
        tags: ['UK', 'Legal', 'Tipstaff', 'High Court', 'Enforcement'],
        summary: "In the UK, the 'Tipstaff' is the High Court's enforcement officer with power to track abductors using tax/benefit records.",
        fullText: `IN THE HIGH COURT OF JUSTICE
FAMILY DIVISION

APPLICATION FOR A COLLECTION ORDER / LOCATION ORDER

1. THE APPLICANT applies for an order directing the Tipstaff to:
A. Locate the child, [CHILD'S NAME], and the Respondent.
B. Seize the passports and travel documents.
C. Take the child into protective custody.

2. GROUNDS:
- The child was wrongfully removed/retained on [DATE].
- The Respondent has concealed their whereabouts.
- There is an imminent risk of further flight.

3. DIRECTION TO THIRD PARTIES:
Include a 'Port Alert' to all UK exit points and a direction to HMRC/DWP to disclose the Respondent's address immediately.

4. CERTIFICATE OF URGENCY:
Delay would defeat the purpose of the application.`
    },
    {
        id: 'resource-eu-certificate-return', entryType: 'resource',
        name: "EU: Brussels IIb 'Certificate of Return' (Trumping Order)",
        countryPair: 'EU', resourceType: 'Legal Filing',
        tags: ['EU', 'Brussels II', 'Legal', 'Trumping Order', 'Strategy'],
        summary: "The most powerful tool in Europe. If a foreign court refuses return under Article 13(b), your home court can 'Trump' them under Brussels IIb.",
        fullText: `GUIDE TO THE BRUSSELS IIb 'CERTIFICATE OF RETURN' (TRUMPING MECHANISM)

Applicable: Between all EU Member States (except Denmark).

THE SCENARIO:
You filed for return in France. The French court refused, citing Article 13(b). In a normal Hague case, you'd be stuck.

THE BRUSSELS IIb SOLUTION:
Under Brussels IIb, you have a second chance in your HOME court.

STEP 1: The French court transmits the refusal file to your Home Court within 1 month.
STEP 2: Your Home Court invites submissions.
STEP 3: Your Home Court examines the custody question and issues a judgment.
STEP 4: The Home Court issues the 'CERTIFICATE OF RETURN'.

THE POWER OF THE CERTIFICATE:
- It is automatically enforceable in France.
- The French courts CANNOT oppose it.
- There is NO appeal against enforcement.
- The child must be returned immediately.

ACTION:
If you lose in the foreign EU court, instruct your Home Attorney immediately: "File for a decision on custody and a Certificate of Return under Brussels IIb."`
    },
    {
        id: 'template-interpol-yellow-notice-full', entryType: 'template',
        name: 'Global: Interpol Yellow Notice Application Data',
        countryPair: 'General', resourceType: 'Form Instructions',
        tags: ['Interpol', 'Yellow Notice', 'Police', 'Tracing'],
        summary: 'Interpol does not take requests from individuals. Provide this data to your local police (NCB) to submit on your behalf.',
        fullText: `DATA REQUIRED FOR INTERPOL YELLOW NOTICE (MISSING PERSON)

Provide this dossier to your local Police Detective or National Central Bureau (NCB).

1. SUBJECT (MISSING CHILD):
- Family Name, Forenames
- Sex, Date of Birth, Place of Birth
- Nationality
- Identity Documents: Passport #

2. PHYSICAL DESCRIPTION:
- Height/Weight, Hair/Eyes
- Distinguishing Marks
- Photo: High-resolution headshot, less than 6 months old

3. CIRCUMSTANCES OF DISAPPEARANCE:
- Date, Place, Probable Destination
- Linked Individual (Abductor)

4. REQUEST FOR ACTION:
[ ] Publish on Interpol Public Website
[ ] Restricted to Law Enforcement Only

5. AUTHORITY:
- Case Reference Number
- Magistrate/Judge Issuing Warrant
- Relevant Law`
    },
    {
        id: 'template-financial-freeze', entryType: 'template',
        name: 'Financial: Asset Freeze & Trace Request',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Financial', 'Bank', 'Freeze', 'Investigation', 'Tracing'],
        summary: 'A dual-purpose letter to banks: (1) Stop the money, (2) Preserve the evidence of where the money went.',
        fullText: `TO: [BANK NAME] Security & Fraud Department

RE: FRAUD ALERT & ASSET PRESERVATION - Acct [NUMBER]

URGENT: KIDNAPPING INVESTIGATION IN PROGRESS

1. IMMEDIATE FREEZE:
I am the joint owner. Effective immediately, I revoke all authorization for [ABDUCTOR'S NAME] to withdraw funds, use debit cards, or initiate transfers. Please place a 'Hard Hold' on all assets.

2. PRESERVATION OF RECORDS:
Pursuant to an active police investigation (Report #[NUMBER]), you are legally required to preserve all data regarding:
- Wire transfers (SWIFT/IBAN data)
- ATM withdrawal locations (including IP addresses)
- Credit card transaction details

3. FOREIGN TRANSACTION ALERT:
If any attempt is made to access these funds from [SUSPECTED COUNTRY], deny the transaction and log the location data immediately.

I attach my ID and a copy of the police report.`
    },
    {
        id: 'template-custody-affidavit', entryType: 'template',
        name: "Legal: 'Left-Behind Parent' Affidavit",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Legal', 'Affidavit', 'Testimony', 'Court Document', 'Hague'],
        summary: 'Your main testimony. It must be factual, chronological, and devoid of emotional ranting to be taken seriously by a foreign judge.',
        fullText: `AFFIDAVIT OF [YOUR NAME] IN SUPPORT OF RETURN APPLICATION

I, [YOUR NAME], being duly sworn, depose and state:

1. I am the biological [MOTHER/FATHER] of [CHILD'S NAME] and the Petitioner in this matter.

2. HABITUAL RESIDENCE:
Until [DATE OF REMOVAL], the child lived exclusively in [CITY, STATE]. The child attended [SCHOOL], saw Dr. [DOCTOR] for medical care, and participated in [ACTIVITY]. Evidence attached as Exhibit A.

3. CUSTODY RIGHTS:
I hold Rights of Custody pursuant to [COURT ORDER / STATUTE]. I was actively exercising these rights.

4. THE WRONGFUL REMOVAL:
On [DATE], the Respondent removed the child. I did NOT consent.

5. REBUTTAL TO ALLEGATIONS:
The Respondent claims I am 'abusive'. This is a fabrication designed to manipulate the Article 13(b) defense. I have no criminal record. (Police Clearance Certificate attached as Exhibit C).

6. PRAYER FOR RELIEF:
I respectfully request this Court order the summary return of the child.

[SIGNATURE]`
    },
    {
        id: 'guide-middle-east-custody', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to Middle East (Sharia/Hadanah)',
        countryPair: 'General', resourceType: 'Country Strategy',
        tags: ['Middle East', 'Sharia', 'Non-Hague', 'Custody', 'Islamic Law'],
        summary: "Understanding 'Hadanah' (Custody) vs 'Walaya' (Guardianship) is vital for cases in Saudi Arabia, UAE, Qatar, Egypt, etc.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO MENA (Middle East/North Africa)

Most MENA countries are Non-Hague. Family law is based on Sharia principles. You cannot use Western legal arguments here.

KEY CONCEPTS:
1. HADANAH (Physical Custody): Usually goes to the mother until the child reaches a certain age (often 7-9 for boys, 9-11 for girls).
2. WALAYA (Guardianship): Almost always remains with the father. Covers decision-making, travel, and finances.

STRATEGY FOR FATHERS:
- You have the upper hand on 'Walaya'. You can place a 'Travel Ban' on the child to prevent further movement.
- Argument: If the mother is obstructing your role as Guardian, you can petition to transfer Hadanah.

STRATEGY FOR MOTHERS:
- If you are a Western mother, you are at a disadvantage. You must not leave the country without the child.
- Argument: Prove the father is 'Unfit' to strip him of guardianship.
- Settlement: Often the best bet is a cash settlement in exchange for permission to take the child home.

WARNING:
Adultery is a crime in many of these jurisdictions. Keep your private life completely scrubbed from social media.`
    },
    {
        id: 'template-chins-petition', entryType: 'template',
        name: 'Legal: CHINS Petition (Post-Return Protection)',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['CHINS', 'Protection', 'Legal', 'US', 'Post-Return'],
        summary: "A 'Child In Need of Services' petition puts the child under state protection after return, making it much harder for the parent to re-abduct.",
        fullText: `PETITION ALLEGING CHILD IN NEED OF SERVICES (CHINS)

1. The Child, [NAME], is a child in need of services because:
a. The child's condition is seriously endangered as a result of the Respondent's inability to supply necessary supervision.
b. Specifically, the Respondent abducted the child internationally on [DATE], causing severe emotional trauma.

2. RISK OF RE-ABDUCTION:
The Respondent has demonstrated a willingness to violate court orders and flee.

3. REQUEST FOR INTERVENTION:
a. Adjudicate the child as a CHINS.
b. Place the child in the temporary custody of the Petitioner.
c. Order the Respondent to surrender all travel documents.
d. Order Supervised Visitation only.

This creates a state-level safety net. If the Respondent takes the child now, it is kidnapping from the State, not just a civil dispute.`
    },
    {
        id: 'template-school-records-alert', entryType: 'prevention',
        name: "Prevention: School Records 'Red Flag' Request",
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['School', 'Records', 'Tracing', 'Prevention'],
        summary: 'Abductors eventually need to enroll the child in school. This letter ensures you get alerted when they request records.',
        fullText: `TO: [SCHOOL PRINCIPAL] and [REGISTRAR]

RE: STUDENT RECORDS FLAG - [CHILD'S NAME] - MISSING CHILD

Please place an immediate ADMINISTRATIVE FLAG on the cumulative file and digital records of [CHILD'S NAME] (DOB: [DATE]).

The child has been abducted by [ABDUCTOR'S NAME]. A police investigation is active (Case #[NUMBER]).

INSTRUCTIONS:
1. If you receive a request for transcripts/records from a new school (especially from [COUNTRY]), DO NOT transfer the records immediately.
2. Notify the local police and myself immediately upon receipt of such a request.
3. Call me immediately at [PHONE]. This is often the only lead we have to locate the child.

I have attached the Custody Order which grants me the right to access records.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-media-strategy-matrix', entryType: 'procedure',
        name: 'Media: To Publish or Not? (Risk Assessment)',
        countryPair: 'General', resourceType: 'Strategy Guide',
        tags: ['Media', 'Strategy', 'Publicity', 'Risk Assessment'],
        summary: 'Going to the media is irreversible. Use this matrix to decide if it will help or hurt your case.',
        fullText: `MEDIA STRATEGY DECISION MATRIX

WHEN TO GO PUBLIC:
- The Abductor is narcissistic and cares about their reputation
- The Police are doing nothing and need pressure
- You have no leads on location and need 'eyes on the ground'
- The child is in a Western democracy where public opinion matters

WHEN TO STAY QUIET:
- The Abductor is paranoid/mentally unstable
- The Abductor is in a country where 'Honor' is paramount
- A sensitive negotiation is happening
- The child is older (teens)

IF YOU GO PUBLIC — THE RULES:
1. Focus on the Child, not the Hate. "We love them, we miss them."
2. Use a dedicated email/phone, never your personal one.
3. One main photo. Use the same photo everywhere.

WARNING: Once it's on the internet, you cannot take it back.`
    },
    {
        id: 'template-airline-gdpr-bypass', entryType: 'template',
        name: 'Logistics: Airline Info Request (Privacy Bypass)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Airline', 'Privacy', 'GDPR', 'Tracing'],
        summary: "Airlines refuse info due to privacy laws. This frames the request as a 'Vital Interest' emergency to bypass GDPR/Privacy blocks.",
        fullText: `TO: Data Protection Officer / Emergency Response Team
AIRLINE: [AIRLINE NAME]

SUBJECT: URGENT - VITAL INTEREST REQUEST - MISSING CHILD [NAME]

Reference: GDPR Article 6(1)(d) "Vital Interests"

I am requesting confirmation of travel for a MINOR CHILD, [CHILD'S NAME], on Flight [NUMBER] dated [DATE].

Under GDPR Article 6(1)(d), processing is lawful when "necessary to protect the vital interests of the data subject."

I am not asking for the adult's contact info. I am asking: DID THE CHILD BOARD THE PLANE?

If you refuse to release this to me, you are legally obligated to release it immediately to the investigating officer:
Detective [NAME], Email: [EMAIL], Phone: [PHONE].

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-mirror-order', entryType: 'template',
        name: "Legal: 'Mirror Order' / Safe Harbor Request",
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Legal', 'Mirror Order', 'Safe Harbor', 'Strategy', 'Hague'],
        summary: "CRITICAL: Foreign courts refuse return because they fear the abducting parent will be arrested. Obtain this order in your HOME court to show the foreign judge that return is safe.",
        fullText: `ORDER FOR SAFE HARBOR AND MIRRORING OF FOREIGN RETURN ORDER

This Court, acknowledging proceedings pending in [FOREIGN COUNTRY] under the Hague Convention, hereby ORDERS:

1. NON-ENFORCEMENT OF ARREST WARRANTS:
Upon the Respondent's voluntary return with the child, this Court recalls any civil warrants for a period of [NUMBER] days.

2. INTERIM CUSTODY UPON RETURN:
The Respondent shall have temporary physical possession of the child at the former residence for the first [NUMBER] days to minimize transition trauma.

3. NO PROSECUTION REQUEST:
The Petitioner does not desire criminal prosecution, provided the child is returned by [DATE].

4. FINANCIAL SUPPORT:
The Petitioner shall deposit $[AMOUNT] into the Registry of the Court for the Respondent upon arrival.

5. JURISDICTION:
This Court affirms exclusive continuing jurisdiction under the UCCJEA to determine custody once the child is returned.

IT IS SO ORDERED.`
    },
    {
        id: 'guide-civil-conspiracy', entryType: 'guidance',
        name: "Strategy: Suing the Abductor's Family (Civil Conspiracy)",
        countryPair: 'US', resourceType: 'Strategy Guide',
        tags: ['Civil Litigation', 'Tort', 'Funding', 'Strategy', 'Pressure'],
        summary: "How to cut off the abductor's funding. If grandparents or friends helped fund the kidnapping, sue them for Civil Conspiracy.",
        fullText: `STRATEGY: CIVIL TORT LITIGATION (THE 'NUCLEAR OPTION')

Most abductors cannot survive abroad without financial help from family back home. Cutting off this supply line is often more effective than a police warrant.

KEY CLAIMS TO FILE:
1. Civil Conspiracy to Interfere with Custodial Relations
2. Intentional Infliction of Emotional Distress (IIED)
3. Aiding and Abetting

THE GOAL:
- Force the Co-Conspirators to spend money on their own lawyers.
- Force them to testify under oath (Deposition). If they lie about where the child is, they commit Perjury.
- Force a settlement where they agree to stop funding the abductor.

WARNING:
This is aggressive. It will destroy family relationships permanently. Use only when the abductor is fully non-compliant.`
    },
    {
        id: 'template-uae-travel-ban', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to UAE (Travel Bans)',
        countryPair: 'General', resourceType: 'Country Strategy',
        tags: ['UAE', 'Dubai', 'Middle East', 'Travel Ban', 'Non-Hague'],
        summary: "The UAE is Non-Hague. The most effective tool is the 'Travel Ban'. Here is how to use it.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO UAE (DUBAI/ABU DHABI)

The UAE is not a Hague signatory. US/UK court orders are generally NOT recognized.

CRITICAL TOOL: THE TRAVEL BAN (MAN'A AL SAFAR)

SCENARIO A: YOU ARE THE FATHER (LEFT BEHIND)
- You retain 'Guardianship' (Walaya).
- File an urgent Travel Ban on the child to prevent further movement.
- Strategy: File the ban, then negotiate.

SCENARIO B: YOU ARE THE MOTHER (LEFT BEHIND)
- File for 'Hadanah' (Custody) under UAE law.
- Danger: If you enter the UAE, the father may place a travel ban on YOU.

WARNING: Do not attempt to smuggle the child out. UAE border biometrics are advanced. You will be caught and imprisoned.`
    },
    {
        id: 'template-narcissist-comms', entryType: 'guidance',
        name: 'Communication: BIFF Response Script (High-Conflict)',
        countryPair: 'General', resourceType: 'Communication Guide',
        tags: ['Communication', 'Psychology', 'Negotiation', 'BIFF', 'Evidence'],
        summary: "Abductors often have high-conflict personalities. Use the BIFF method (Brief, Informative, Friendly, Firm) so they can't use your words against you.",
        fullText: `THE 'BIFF' METHOD FOR HIGH-CONFLICT ABDUCTORS

(Brief, Informative, Friendly, Firm)

SCENARIO: Abductor emails you: "You are a terrible parent, you never cared, I had to save [CHILD]. Stop harassing me."

DO NOT REPLY: "You are the kidnapper! I will put you in jail!"
(This will be used against you in court.)

USE THIS TEMPLATE INSTEAD:

"Dear [NAME],

Thank you for letting me know you are with [CHILD]. (Friendly)

I am writing to confirm that [CHILD] has not attended school in [HOME CITY] since [DATE]. The court hearing is scheduled for [DATE]. (Informative)

I am willing to discuss a parenting plan provided [CHILD] is returned by [DATE]. (Firm)

Please arrange a FaceTime call for me and [CHILD] on [DAY] at [TIME].

Sincerely,
[YOUR NAME]"

WHY THIS WORKS:
1. Brief: No emotional fuel for them.
2. Informative: Creates a paper trail that you are reasonable.
3. Friendly: Destroys their 'Abuse' defense in court.
4. Firm: Sets a boundary without a threat.`
    },
    {
        id: 'template-ne-exeat', entryType: 'template',
        name: "Prevention: 'Ne Exeat' Bundle (Before They Leave)",
        countryPair: 'US', resourceType: 'Court Document',
        tags: ['Prevention', 'Ne Exeat', 'Legal', 'Court Order', 'UCAPA'],
        summary: "If you suspect an abduction is IMMINENT. This is the 'gold standard' prevention order to file immediately.",
        fullText: `EMERGENCY PETITION FOR PREVENTION OF INTERNATIONAL ABDUCTION
(Pursuant to UCAPA - Uniform Child Abduction Prevention Act)

1. RISK FACTORS (Section 7 UCAPA):
[ ] Abandoned employment
[ ] Liquidated assets
[ ] Obtained passport applications without consent
[ ] Threatened to remove child to a Non-Hague signatory
[ ] Used abusive language indicating refusal to follow Court Orders

2. REQUESTED RELIEF:
A. NE EXEAT: Respondent is prohibited from removing the child from the jurisdiction.
B. PASSPORT SURRENDER: All passports to the Clerk of Court within 24 hours.
C. TRAVEL ALERT: Enter child into the Children's Passport Issuance Alert Program.
D. SUPERVISED VISITATION: No overnights.
E. BOND: Post a bond sufficient to cover international legal fees.`
    },
    {
        id: 'guide-india-habeas-corpus', entryType: 'country_matrix',
        name: 'Country Strategy: US/UK to India (Habeas Corpus)',
        countryPair: 'US-India', resourceType: 'Country Strategy',
        tags: ['India', 'Habeas Corpus', 'Non-Hague', 'Legal', 'Strategy'],
        summary: 'India is the hardest jurisdiction for return. You must file a Writ of Habeas Corpus in the Indian High Court.',
        fullText: `STRATEGY: WRIT OF HABEAS CORPUS IN INDIA

Since India is not a Hague signatory, you cannot file for 'Return'. You must file a Writ of Habeas Corpus.

YOUR REQUIRED ARGUMENTS:
1. 'Rootedness': File IMMEDIATELY. If you wait 6 months, the court will say the child is 'rooted' in India.
2. 'Doctrine of Comity': Argue the US/UK court has already exercised jurisdiction. (Weak in India, but necessary.)
3. 'Soft Landing' Offer (CRITICAL): Indian judges will NOT send a child back if the mother will be arrested or destitute. Submit an affidavit promising separate housing, no criminal charges, and withdrawal of Interpol Red Notices.
4. 'Intimate Contact' Principle: If the child is under 5, the court almost always keeps them with the mother.

TIMELINE:
Expect 6-12 months. If you lose, appeal to the Supreme Court of India immediately.`
    },
    {
        id: 'template-letter-congress', entryType: 'template',
        name: 'Advocacy: Letter to Elected Representative',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Political', 'Advocacy', 'Congress', 'Pressure'],
        summary: 'When the legal system fails, you need political pressure. Use this to ask your Representative/Senator/MP to inquire on your behalf.',
        fullText: `TO: The Honorable [REPRESENTATIVE/SENATOR NAME]

RE: CONSTITUENT CRISIS - International Kidnapping of [CHILD'S NAME]

I am a constituent requesting your urgent assistance regarding the international abduction of my child.

CASE STATUS:
- Date Abducted: [DATE]
- Destination: [COUNTRY]
- Current Status: STALLED due to [REASON]

THE ASK:
Please submit a formal inquiry to the Department of State asking:
1. Why has the Central Authority failed to meet the 6-week deadline?
2. What diplomatic pressure is being applied?
3. Can the Ambassador raise this case with the Ministry of Foreign Affairs?

Attached is a Privacy Release Form to allow you to access my file.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'checklist-recovery-logistics', entryType: 'procedure',
        name: "Logistics: The 'Go-Bag' for International Recovery",
        countryPair: 'General', resourceType: 'Checklist',
        tags: ['Recovery', 'Logistics', 'Checklist', 'Travel', 'Safety'],
        summary: 'You won the court order. You are flying to get your child. What do you physically need to bring?',
        fullText: `THE RECOVERY DEPLOYMENT CHECKLIST

DOCUMENTS (The 'Red Folder'):
[ ] Certified Copy of the Return Order (Translated and Apostilled)
[ ] Child's Birth Certificate (Original)
[ ] Your Custody Order (Home Country)
[ ] Letter from Central Authority
[ ] Police Report from Home Country

COMMUNICATIONS:
[ ] Burner Phone or Local SIM
[ ] Printed contact list (Lawyer, Embassy, Police)
[ ] Power Bank (20,000mAh)

CHILD CARE:
[ ] Photos of you and the child together
[ ] A letter from grandparents
[ ] Snacks/Comfort Object from home

SAFETY:
[ ] Door Stop Alarm (for your hotel room)
[ ] AirTags: Place in the child's jacket immediately

FLIGHT:
[ ] Direct Flight home if possible
[ ] Notify the airline 'Special Assistance' desk`
    },
    {
        id: 'template-interpol-red-withdrawal', entryType: 'template',
        name: 'Legal: Offer to Withdraw Interpol Red Notice (Leverage)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Negotiation', 'Leverage', 'Criminal', 'Interpol', 'Settlement'],
        summary: 'The Red Notice is your biggest bargaining chip. This letter uses it to negotiate a voluntary return.',
        fullText: `CONFIDENTIAL SETTLEMENT COMMUNICATION

TO: Counsel for [ABDUCTOR]

RE: PROPOSAL FOR VOLUNTARY RETURN AND WARRANT RECALL

A Federal Warrant has been issued and an INTERPOL Red Notice is active. Your client is effectively trapped in [COUNTRY].

WE OFFER THE FOLLOWING:
If [ABDUCTOR] voluntarily returns [CHILD] to [HOME AIRPORT] by [DATE]:
1. Jointly petition to recall the Federal Warrant.
2. Request deletion of the Interpol Red Notice immediately upon arrival.
3. Consent to a 'No Arrest' order for civil contempt proceedings.

IF REJECTED:
Full extradition requests and damages for civil conspiracy against all funding parties.

This offer expires in 72 hours.

Sincerely,
[YOUR NAME/LAWYER]`
    },
    {
        id: 'guide-germany-enforcement', entryType: 'country_matrix',
        name: 'Country Strategy: Germany (Section 170 Enforcement)',
        countryPair: 'Germany', resourceType: 'Country Strategy',
        tags: ['Germany', 'Enforcement', 'Legal', 'Europe', 'Strategy'],
        summary: "Germany has a specific enforcement mechanism (FamFG). Understanding 'Ordnungsgeld' vs 'Zwangsgeld' is key.",
        fullText: `STRATEGIC OVERVIEW: ENFORCEMENT IN GERMANY

Winning the Hague case in Germany is Step 1. Getting the child is Step 2.

THE LEGAL MECHANISM (FamFG Section 88-90):

1. ORDNUNGSGELD (Administrative Fine):
Court fines them. Often ineffective if the abductor has no money.

2. ZWANGSHAFT (Coercive Detention):
The court puts the parent in jail until they reveal the child's location or hand them over. The most effective tool.

3. UNMITTELBARER ZWANG (Direct Force - Section 90):
Authorizes the Jugendamt and Police to take the child by force.
CRITICAL: You must ask the judge to include permission to enter the residence and search for the child in the original return order.

TIMING:
Enforcement is stayed if an appeal is filed unless you ask for 'Sofortige Wirksamkeit' (Immediate Effectiveness). ALWAYS ask for this.`
    },
    {
        id: 'template-victim-impact', entryType: 'template',
        name: 'Legal: Victim Impact Statement (For Sentencing)',
        countryPair: 'General', resourceType: 'Court Document',
        tags: ['Criminal', 'Sentencing', 'Court', 'Victim Rights'],
        summary: 'If the abductor is caught and prosecuted, you will write a statement for the judge.',
        fullText: `VICTIM IMPACT STATEMENT

Your Honor,

I am the parent of [CHILD]. The defendant's decision to kidnap our child was not an act of love; it was an act of cruelty.

FINANCIAL IMPACT:
I have spent $[AMOUNT] on legal fees, investigators, and travel — money meant for [CHILD]'s college education.

EMOTIONAL IMPACT ON CHILD:
Since returning, [CHILD] suffers from separation anxiety, nightmares, and trusts no one. They were told I was dead.

EMOTIONAL IMPACT ON ME:
For [NUMBER] days, I did not know if my child was alive. I lost my job. I lost years of memories.

SENTENCING REQUEST:
I ask the Court to impose the maximum sentence to send a message that children are not property to be stolen. I also request full Restitution.

Respectfully,
[YOUR NAME]`
    },
    {
        id: 'guide-philippines-custody', entryType: 'country_matrix',
        name: 'Country Strategy: US to Philippines (Article 213)',
        countryPair: 'US-Philippines', resourceType: 'Country Strategy',
        tags: ['Philippines', 'Hague', 'Asia', 'Strategy'],
        summary: "Philippines is a Hague partner but returns are rare due to the 'Tender Years' doctrine.",
        fullText: `STRATEGIC OVERVIEW: ABDUCTION TO PHILIPPINES

THE MAJOR OBSTACLE: ARTICLE 213 (FAMILY CODE)
"No child under seven shall be separated from the mother unless the court finds compelling reasons."

This domestic law often clashes with the Hague Convention.

STRATEGY:
1. ARGUE TREATY SUPREMACY: The Hague Convention supersedes the Family Code based on 'Pacta Sunt Servanda'.
2. PROVE 'COMPELLING REASONS' if child is under 7.
3. IMMIGRATION LEVERAGE: Report the child's visa overstay to the Bureau of Immigration.

CONTACT:
- DOJ Philippines: oca@doj.gov.ph`
    },
    {
        id: 'template-demarche', entryType: 'template',
        name: "Diplomacy: Request for Embassy 'Demarche'",
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['Diplomacy', 'Politics', 'Demarche', 'State Dept'],
        summary: "When the legal system is stalled, ask your State Department to issue a 'Demarche' (Diplomatic Note) to the foreign government.",
        fullText: `TO: The Ambassador of [YOUR COUNTRY] to [DESTINATION COUNTRY]

SUBJECT: REQUEST FOR DIPLOMATIC DEMARCHE - Case of [CHILD'S NAME]

Despite a Hague Convention filing on [DATE], the [DESTINATION] Central Authority/Court has failed to comply with the treaty timeline.

Current delay: [NUMBER] months.

I respectfully request that the Embassy issue a Diplomatic Demarche (Note Verbale) to the Ministry of Foreign Affairs of [DESTINATION].

Please express concern regarding the systemic delays and remind the host government of their obligations under Article 11 of the Hague Convention.

This is not a private legal matter; it is a failure of treaty compliance between our two nations.

Sincerely,
[YOUR NAME]`
    },
    {
        id: 'template-pro-se-filing', entryType: 'template',
        name: 'Legal: Notice of Pro Se Appearance (Self-Representation)',
        countryPair: 'US', resourceType: 'Court Document',
        tags: ['Legal', 'Pro Se', 'Court Document', 'Financial'],
        summary: 'If you run out of money and must represent yourself, file this immediately.',
        fullText: `NOTICE OF PRO SE APPEARANCE

CASE NO: [NUMBER]

TO THE CLERK OF THE COURT AND ALL PARTIES:

PLEASE TAKE NOTICE that the Petitioner, [YOUR NAME], will appear Pro Se (representing themselves) in this matter effective immediately.

Please direct all future notices to:
Address: [FULL ADDRESS]
Email: [EMAIL]
Phone: [PHONE]

(Note: While Pro Se is hard, it is better than having no voice. Judges often give leeway to parents fighting for their children. Be respectful, be organized, and cite the 'Best Interests of the Child'.)

[YOUR SIGNATURE]
[DATE]`
    },
    {
        id: 'template-digital-service-edr', entryType: 'template',
        name: 'Digital: Emergency Disclosure Request (Google/Meta)',
        countryPair: 'US', resourceType: 'Legal Filing',
        tags: ['Digital', 'Tracing', 'Google', 'Meta', 'Police', 'Investigation'],
        summary: 'How to get IP addresses from Google/Facebook using the Emergency Disclosure Request. Must come from Law Enforcement.',
        fullText: `EMERGENCY DISCLOSURE REQUEST (EDR) GUIDE

Tech companies can use an EDR in cases involving danger to a child.

WHO SENDS THIS:
It must come from Law Enforcement. Print this and give it to your Detective.

THE REQUEST FORMAT:
To: LERS (Law Enforcement Response System) - Google/Meta

"I, [DETECTIVE NAME], certify that this request regards an emergency involving danger of death or serious physical injury to a minor child, [NAME].

TARGET ACCOUNT: [EMAIL/URL]

DATA REQUESTED:
1. Recent Login IP Addresses (Last 30 days).
2. Associated Recovery Phone Numbers.
3. Location History / GPS coordinates.

JUSTIFICATION:
The subject has abducted a child to a foreign jurisdiction. The child's location is unknown."

NOTE: If the detective is slow, have your lawyer subpoena the data (takes 30+ days). The EDR takes 24 hours.`
    },
    {
        id: 'guide-article12-settled', entryType: 'guidance',
        name: "Legal: Article 12 'Settled' Defense (Detailed Analysis)",
        countryPair: 'General', resourceType: 'Legal Filing',
        tags: ['Hague', 'Article 12', 'Settled', 'Legal', 'Defense'],
        summary: "If the child has been gone >1 year, the court can refuse return if the child is 'settled'. You must attack the quality of that settlement.",
        fullText: `DEFEATING THE ARTICLE 12 'SETTLED' DEFENSE

The Burden of Proof: The Abductor must prove the child is settled.

KEY ARGUMENTS:

1. EMOTIONAL vs PHYSICAL SETTLEMENT:
Mere physical presence is not enough. If the abductor has alienated the child from you, the child is living in psychological distress and cannot be considered 'settled'.

2. IMMIGRATION STATUS AS UNCERTAINTY:
If the abductor is on a tourist visa or illegally present, the child faces constant threat of deportation. One cannot be 'settled' on quicksand.

3. CONCEALMENT STOPS THE CLOCK:
Argue that the 1-year clock should be paused for periods where the abductor actively hid the child.

4. TRANSIENCE:
Show the court that the abductor has moved homes multiple times. This is not settlement; this is fugitive behavior.`
    },

    // ═══════════════════════════════════════════════════════
    //  SECTION 4: EXPANDED ACTION TEMPLATES & PROCEDURES
    // ═══════════════════════════════════════════════════════
    {
        id: 'kb_us_fbi_initial_report_email_v1', entryType: 'template',
        name: 'FBI Initial Report Email (International Parental Kidnapping / IPKCA)',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'fbi', 'ipkca', 'law_enforcement', 'urgent', 'missing_child', 'parental_abduction'],
        summary: 'Use this email to start a paper trail with your local FBI field office after you have filed a local police report. It requests case intake, preservation of evidence, and coordination with federal partners when a child has been wrongfully removed from or retained outside the U.S.',
        fullText: `Subject: URGENT — International Parental Kidnapping Report: [CHILD'S FULL NAME] (DOB [DOB]) — [CITY/STATE]

To: [FBI FIELD OFFICE PUBLIC EMAIL or TIP EMAIL] | CC: [LOCAL DETECTIVE EMAIL], [YOUR ATTORNEY EMAIL]
Attachments: (1) Photo of [CHILD] (2) Photo of [TAKING PARENT] (3) Court orders (4) Police report / incident number (5) Passport/ID info (6) Timeline (7) Contact/locator info

Hello,

I am reporting an international parental kidnapping / wrongful removal or retention involving my child, [CHILD'S FULL NAME], DOB [DOB]. I am the [LEFT-BEHIND PARENT / LEGAL GUARDIAN]. The taking parent/individual is [TAKING PARENT FULL NAME], DOB [DOB if known], passport/ID [# if known].

Summary of incident:
• Date/time last lawful custody/contact: [DATE/TIME]
• Type: [WRONGFUL REMOVAL / WRONGFUL RETENTION / ABDUCTION IN PROGRESS]
• Location last seen: [ADDRESS/CITY/STATE]
• Suspected destination country/city: [COUNTRY/CITY] (basis: [FLIGHT INFO / STATEMENTS / DIGITAL EVIDENCE])
• Local police report filed: [AGENCY], incident/case #[NUMBER], officer/detective [NAME], phone [PHONE]

Court / custody status:
• Current custody order (attached): [COURT], case #[CASE], dated [DATE]
• If no order: child's habitual residence is [CITY/STATE], and I have rights of custody under [STATE LAW / PARENTING PLAN / BIRTH CERTIFICATE]

Immediate requests:
1) Please open an FBI intake and advise next steps for federal involvement (including IPKCA evaluation where applicable).
2) Please coordinate with local law enforcement, DOJ (if appropriate), and relevant partners for international location efforts.
3) Please advise what evidence you need and how to transfer it securely. I can provide: phone records, iCloud/Google data exports, social media posts, banking/transaction logs, travel records, and witness statements.
4) If you cannot open a federal case at this time, please confirm the correct unit/point of contact and what additional facts are needed.

Child safety:
• Known risk factors: [THREATS / DV HISTORY / MENTAL HEALTH / SUBSTANCE / PRIOR ABDUCTION ATTEMPTS]
• Medical needs: [MEDS/CONDITIONS]
• Current passport status: [HAS U.S. PASSPORT / HAS FOREIGN PASSPORT / UNKNOWN]

My contact details:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
Current location/time zone: [CITY/COUNTRY]

Thank you for urgent assistance. This is time-sensitive, and I am available immediately for a call.

Respectfully,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_us_state_oci_inquiry_v1', entryType: 'template',
        name: 'U.S. State Department — Office of Children\'s Issues (OCI) Initial Inquiry Email',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'state_department', 'oci', 'hague', 'embassy', 'prevention', 'parental_abduction', 'urgent'],
        url: 'https://travel.state.gov/content/travel/en/contact-us/International-Parental-Child-Abduction.html',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747 / +1-202-501-4444',
        summary: 'Use this to initiate a case with the U.S. State Department Office of Children\'s Issues for prevention or active abduction/retention cases. It requests a case number, Hague guidance, and consular coordination.',
        fullText: `Subject: URGENT — International Parental Child Abduction Assistance Request: [CHILD'S FULL NAME] (DOB [DOB])

To: PreventAbduction1@state.gov
CC: [YOUR ATTORNEY EMAIL], [LOCAL DETECTIVE EMAIL]
Attachments: Court orders, birth certificate, passports (if available), photos, timeline, police report

Office of Children's Issues,

I am requesting immediate assistance regarding an international parental child abduction / wrongful retention involving my child, [CHILD'S FULL NAME], DOB [DOB]. Child's habitual residence is [CITY/STATE]. The taking parent/individual is [TAKING PARENT FULL NAME], DOB [DOB if known].

Case basics:
• Date of removal/retention: [DATE]
• Type: [WRONGFUL REMOVAL / WRONGFUL RETENTION / ABDUCTION IN PROGRESS / PREVENTION]
• Suspected destination: [COUNTRY/CITY]
• Current custody order: [YES/NO] (attached if yes)
• Local law enforcement report: [AGENCY], case #[NUMBER]

What I need from OCI:
1) Please open a case and provide a case number and assigned case officer.
2) Please advise whether the destination country is a Hague Abduction Convention partner with the U.S., and which process applies (Hague application vs non-Hague options).
3) If a Hague return application is appropriate, please confirm required forms/documents and where to submit them.
4) If prevention is still possible, please advise on immediate prevention actions (passport lookout, border alerts, consular notifications).
5) If the child is already abroad, please advise what consular welfare/whereabouts checks are feasible and how OCI coordinates with the U.S. Embassy/Consulate.

Key identifiers (if known):
• Child passport(s): [U.S. #] / [FOREIGN #] / [UNKNOWN]
• Taking parent passport(s): [#] / [UNKNOWN]
• Travel info: [AIRLINE/FLIGHT/PNR], [DATE/TIME], [ENTRY POINT]

Safety concerns:
• [LIST CONCERNS CLEARLY — threats, medical needs, prior attempts, DV allegations, etc.]
• Requested confidentiality: Please do not share my location/contact info with the taking parent without my written consent.

My contact information:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[MAILING ADDRESS]
Best times to call: [WINDOWS], time zone [TZ]

Thank you for your urgent help. Please confirm receipt and next steps.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_hague_central_authority_cover_letter_v1', entryType: 'template',
        name: 'Hague Convention Return Application — Central Authority Cover Letter',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['hague', 'central_authority', 'return_application', 'international', 'urgent', 'legal'],
        summary: 'Use this cover letter when submitting a Hague 1980 Child Abduction Convention return application to your home country\'s Central Authority. It frames the request, lists attachments, and demands time-sensitive action.',
        fullText: `COVER LETTER — HAGUE CONVENTION 1980 RETURN APPLICATION

To: [YOUR COUNTRY'S CENTRAL AUTHORITY NAME AND ADDRESS]
From: [YOUR FULL NAME], Applicant / Left-Behind Parent
Date: [DATE]
Re: Application for Return of [CHILD'S FULL NAME], DOB [DOB]

Dear Central Authority,

I am submitting a formal application under the Hague Convention on the Civil Aspects of International Child Abduction (1980) for the return of my child, [CHILD'S FULL NAME], who was wrongfully [REMOVED FROM / RETAINED OUTSIDE] [HOME COUNTRY] by [TAKING PARENT FULL NAME] on or about [DATE].

1. SUMMARY OF FACTS:
• Child's habitual residence immediately before the wrongful removal/retention: [CITY, STATE/PROVINCE, COUNTRY]
• Destination country where child is now believed to be: [COUNTRY, CITY if known]
• Basis for my rights of custody: [COURT ORDER dated [DATE], case #[NUMBER] / OPERATION OF LAW under [STATUTE] / PARENTING AGREEMENT dated [DATE]]
• I was exercising my custody rights at the time of the removal/retention.
• I did NOT consent to the removal/retention.

2. ATTACHMENTS (enclosed):
□ Completed Hague Application Form (if your Central Authority provides one)
□ Certified copy of custody order (with certified translation if not in official language)
□ Child's birth certificate
□ Recent photograph of the child (within 6 months)
□ Recent photograph of the taking parent
□ Copy of relevant passport pages (child and taking parent, if available)
□ Police report / incident number from [AGENCY], case #[NUMBER]
□ Evidence of habitual residence (school enrollment, medical records, lease/mortgage, utility bills)
□ Evidence of the wrongful removal/retention (flight records, communications, witness statements)
□ Declaration / affidavit of the applicant (attached separately)
□ Any known address or location information for the taking parent abroad
□ Marriage certificate / divorce decree (if applicable)
□ Proof of nationality of the child

3. URGENCY:
This matter is extremely time-sensitive. Under Article 11 of the Convention, judicial or administrative authorities must act expeditiously, and Article 12 provides the strongest basis for return if proceedings commence within one year of the wrongful removal or retention. The one-year date in this case is [DATE]. I respectfully request that the Central Authority transmit this application to the Requested State's Central Authority without delay.

4. REQUESTS:
a) Please acknowledge receipt of this application in writing and provide a case/reference number.
b) Please transmit the application to the Central Authority of [DESTINATION COUNTRY] as soon as possible.
c) Please advise me of any additional documents or information required.
d) Please inform me of estimated processing times and any steps I can take to accelerate the process.
e) If there are concerns about the completeness of this application, please contact me immediately so I can remedy any deficiency.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[ADDRESS]
[PHONE — include country code]
[EMAIL]
Attorney (if any): [NAME], [FIRM], [PHONE], [EMAIL]

I am available at any time to provide additional information or attend any hearing. Thank you for your urgent attention to this matter.

Respectfully submitted,
[YOUR FULL NAME]
[SIGNATURE]
[DATE]`
    },
    {
        id: 'kb_embassy_welfare_check_request_email_v1', entryType: 'template',
        name: 'Embassy / Consulate Welfare and Whereabouts Check Request (Child Abroad)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['embassy', 'consulate', 'welfare_check', 'whereabouts', 'urgent', 'international', 'hague'],
        summary: 'Use this email to request a welfare and whereabouts check through your embassy/consulate when your child is believed to be in a foreign country. It asks for consular limitations to be stated clearly and requests written confirmation of actions taken.',
        fullText: `Subject: URGENT — Welfare and Whereabouts Check Request: [CHILD'S FULL NAME] (DOB [DOB]) — [YOUR COUNTRY] Citizen

To: [EMBASSY/CONSULATE EMAIL — e.g., AmCitCity@state.gov or consular.cityname@fco.gov.uk]
CC: [CENTRAL AUTHORITY / OCI EMAIL], [YOUR ATTORNEY EMAIL]
Attachments: (1) Photo of child (2) Photo of taking parent (3) Court orders (4) Birth certificate (5) Police report (6) Privacy waiver (if required)

Dear Consular Officer,

I am the [MOTHER/FATHER/LEGAL GUARDIAN] of [CHILD'S FULL NAME], a [YOUR COUNTRY] citizen, DOB [DOB], passport #[NUMBER if known]. I am requesting an urgent welfare and whereabouts check.

1. SITUATION:
My child was [WRONGFULLY REMOVED / WRONGFULLY RETAINED] by [TAKING PARENT FULL NAME] on [DATE]. The child is believed to be located at or near: [ADDRESS / CITY / REGION, COUNTRY]. Basis for this belief: [EXPLAIN — e.g., phone records, social media, family contacts, flight records].

2. CONCERNS:
• Physical safety: [DESCRIBE — e.g., history of domestic violence, substance abuse, mental health, threats made]
• Medical needs: [DESCRIBE — e.g., child requires medication for asthma, ADHD, allergies; prescription attached]
• Psychological welfare: [DESCRIBE — e.g., child may be told the left-behind parent is dead/does not care; parental alienation suspected]
• Education: [DESCRIBE — e.g., child has not been enrolled in school; child was removed mid-term]

3. WHAT I AM REQUESTING:
a) Please attempt to locate the child and confirm the child's physical safety and living conditions.
b) If the child is located, please observe and report on the child's apparent health, emotional state, and environment.
c) Please deliver the following message to the child (if age-appropriate): "Your [mother/father] loves you very much and is working to [bring you home / see you soon]."
d) Please provide a written report of the visit, including date, time, location, persons present, observations, and any statements made by the taking parent.
e) Please advise me in writing of any limitations on what the consulate can and cannot do in this situation.
f) If the taking parent refuses access or is not found at the address, please document the attempt and advise on next steps.

4. LEGAL STATUS:
• Custody order: [YES — attached / NO — rights arise by operation of law under [STATUTE/COUNTRY]]
• Hague application filed: [YES — case #[NUMBER] with [CENTRAL AUTHORITY] / NO — in preparation]
• Police report: [AGENCY], case #[NUMBER]
• NCIC/missing persons entry: [YES/NO]

5. CONFIDENTIALITY:
Please do NOT share my current address, phone number, or location with the taking parent without my written consent. I have attached a signed privacy waiver authorizing the consulate to access my case file.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code and best times to reach]
[EMAIL]
[MAILING ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your urgent attention. I understand consular officers cannot enforce custody orders or compel access, but I am requesting every action within consular authority. Please confirm receipt and advise on expected timeline.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_attorney_engagement_request_email_v1', entryType: 'template',
        name: 'Attorney Engagement Email (International Child Abduction / Hague / Cross-Border Custody)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['legal', 'attorney', 'hague', 'retainer', 'urgent', 'cross_border', 'custody'],
        summary: 'Use this to rapidly retain counsel. It requests conflict check, fee structure, emergency hearing readiness, and deliverables in the first 72 hours.',
        fullText: `Subject: URGENT RETAINER INQUIRY — International Child Abduction / Hague Convention Matter

To: [ATTORNEY NAME / FIRM INTAKE EMAIL]
From: [YOUR FULL NAME]
Date: [DATE]

Dear [ATTORNEY NAME / Intake Team],

I am seeking immediate legal representation in an international parental child abduction matter. Time is critical. I am writing to request a conflict check, confirm availability, and understand your fee structure so we can proceed as quickly as possible.

1. CASE SUMMARY:
• My child, [CHILD'S FULL NAME], DOB [DOB], was [WRONGFULLY REMOVED FROM / WRONGFULLY RETAINED OUTSIDE] [HOME COUNTRY/STATE] by [TAKING PARENT FULL NAME] on [DATE].
• The child is believed to be in [DESTINATION COUNTRY/CITY].
• Hague Convention status of destination country: [HAGUE PARTNER / NON-HAGUE / UNKNOWN]
• Existing custody order: [YES — from [COURT], case #[NUMBER], dated [DATE] / NO — rights by operation of law]
• Police report filed: [YES — [AGENCY], case #[NUMBER] / NO — filing today]
• Central Authority application filed: [YES — case #[NUMBER] / NO — need help preparing]

2. WHAT I NEED IN THE FIRST 72 HOURS:
a) Conflict check clearance — please confirm no conflict with [TAKING PARENT FULL NAME] or their known counsel [NAME if known].
b) Emergency custody motion / ex parte filing in [HOME COURT] to establish or confirm sole custody and travel restrictions.
c) Guidance on Hague Convention return application (if applicable) or alternative legal strategy for non-Hague country.
d) Coordination with foreign counsel in [DESTINATION COUNTRY] — do you have contacts, or should I retain separately?
e) Advice on evidence preservation (digital, financial, travel records).
f) Advice on passport revocation / issuance prevention and border alerts.

3. FEE STRUCTURE:
Please provide:
• Retainer amount and hourly rate
• Estimated cost range for the first phase (emergency filings + Hague application)
• Whether you offer payment plans or accept legal aid referrals
• Whether fees include foreign counsel coordination or if that is billed separately

4. MY AVAILABILITY:
I am available immediately for a phone or video consultation. I can provide all documents (court orders, birth certificate, police report, evidence of habitual residence, communications) within 24 hours of engagement.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code]
[EMAIL]
[CITY/STATE/COUNTRY and TIME ZONE]

If you are unable to take this case, I would appreciate a referral to another attorney experienced in international child abduction / Hague Convention matters in this jurisdiction.

Thank you for your urgent attention.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_school_records_hold_request_v1', entryType: 'template',
        name: 'School / Childcare Records Hold + Release Restriction Request',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['school', 'records', 'privacy', 'custody', 'abduction_prevention', 'evidence'],
        summary: 'Use this to stop a taking parent from obtaining school records or changing enrollment, and to request immediate copies for your legal case. Adapt for daycare, pediatric office, sports clubs, and tutoring centers.',
        fullText: `Subject: URGENT — Records Hold and Release Restriction: [CHILD'S FULL NAME] (DOB [DOB])

To: [SCHOOL PRINCIPAL NAME], [SCHOOL REGISTRAR / RECORDS OFFICE]
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Custody order (2) Photo ID of requesting parent (3) Police report (if filed) (4) Court order restricting release (if available)

Dear [PRINCIPAL / REGISTRAR],

I am writing regarding my child, [CHILD'S FULL NAME], DOB [DOB], currently [enrolled in / formerly enrolled in] [SCHOOL NAME], grade [GRADE].

I am the child's [MOTHER / FATHER / LEGAL GUARDIAN]. I hold [SOLE / JOINT] legal custody pursuant to the attached court order from [COURT], case #[NUMBER], dated [DATE]. [If no order: I have parental rights under [STATE/COUNTRY] law as the child's [biological/adoptive] parent, as evidenced by the attached birth certificate.]

1. RECORDS HOLD — IMMEDIATE ACTION REQUESTED:
Please place an immediate administrative hold on all records for [CHILD'S FULL NAME]. Specifically:
a) Do NOT release transcripts, immunization records, or any educational records to any person or institution without my prior written consent.
b) Do NOT process any enrollment withdrawal or school transfer request without my prior written consent and verification against the attached custody order.
c) If any person (including [TAKING PARENT FULL NAME]) requests records or attempts to withdraw the child, please:
   - Deny the request pending verification
   - Record the name, contact information, and stated reason of the requesting party
   - Notify me immediately at [PHONE] and [EMAIL]
   - Notify the police if a police report has been filed (case #[NUMBER], [AGENCY], detective [NAME])

2. COPIES FOR MY LEGAL CASE:
Please provide me with certified copies of the following as soon as possible:
a) Complete cumulative file / educational records
b) Attendance records for the current and prior school year
c) Emergency contact cards (showing who is listed and when changes were made)
d) Any records of communication from [TAKING PARENT FULL NAME] regarding the child's enrollment, pickup authorization, or address changes
e) Any records requests received from other schools (domestic or international)

3. LEGAL BASIS:
Under [FERPA (US) / equivalent local privacy law], I am entitled to access my child's educational records as a parent with legal custody. The attached court order [does / does not] restrict the other parent's access. [If restricted: The other parent, [TAKING PARENT FULL NAME], is NOT authorized to receive records under the terms of the attached order.]

4. ONGOING NOTIFICATION:
If at any future date a records request is received from any school — especially from [SUSPECTED DESTINATION COUNTRY/CITY] — please treat this as an urgent lead and notify me and the police immediately. This may be the only way to locate my child.

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your cooperation. This is a child safety matter, and I appreciate your prompt attention.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_us_passport_prevent_issuance_email_v1', entryType: 'template',
        name: 'U.S. Passport Lookout / Prevent Issuance Request Email (CPIAP)',
        countryPair: 'US', resourceType: 'Email Template',
        tags: ['us', 'passport', 'cpiap', 'prevention', 'state_department', 'hague', 'urgent'],
        url: 'https://www.cbp.gov/travel/international-child-abduction-prevention-and-return-act',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747',
        summary: 'Use this to request abduction prevention actions related to U.S. passports and travel. It pairs with DS-3077 (Children\'s Passport Issuance Alert Program) and requests confirmation of receipt and instructions.',
        fullText: `Subject: URGENT — Passport Lookout / Prevent Issuance Request: [CHILD'S FULL NAME] (DOB [DOB])

To: PreventAbduction1@state.gov
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Completed DS-3077 form (if available) (2) Custody order (3) Child's birth certificate (4) Photo of child (5) Police report (if filed) (6) Your photo ID

Office of Children's Issues / Passport Services,

I am requesting immediate action to prevent the issuance of a U.S. passport to my minor child and/or to place a lookout on any existing passport. This is an abduction prevention matter.

1. CHILD INFORMATION:
• Full legal name: [CHILD'S FULL NAME]
• Date of birth: [DOB]
• Place of birth: [CITY, STATE]
• Social Security Number (last 4): [XXXX] (full number available upon secure request)
• Current U.S. passport: [YES — #[NUMBER], issued [DATE], expires [DATE] / NO / UNKNOWN]
• Foreign passport: [YES — [COUNTRY], #[NUMBER] / NO / UNKNOWN]

2. TAKING PARENT / PERSON OF CONCERN:
• Full name: [TAKING PARENT FULL NAME]
• DOB: [DOB if known]
• Relationship to child: [MOTHER / FATHER / OTHER]
• Citizenship(s): [LIST]
• Current location: [IF KNOWN]

3. WHAT I AM REQUESTING:
a) CPIAP Enrollment: Please enroll [CHILD'S FULL NAME] in the Children's Passport Issuance Alert Program (CPIAP) so that I am notified before any passport is issued or renewed.
b) Prevent Issuance: If a passport application is currently pending or is submitted for [CHILD], please deny or hold the application and notify me immediately.
c) Passport Lookout: If the child already has a U.S. passport, please place a lookout so that any attempt to use it at a port of entry triggers an alert.
d) Revocation Guidance: If circumstances warrant revocation of the child's existing U.S. passport, please advise on the process and what court orders or documentation are needed.

4. LEGAL BASIS:
• I hold [SOLE / JOINT] legal custody pursuant to [COURT ORDER from [COURT], case #[NUMBER], dated [DATE]].
• Under 22 CFR 51.28, both parents must consent to passport issuance for a minor under 16. I have NOT consented and do NOT consent to passport issuance.
• [If applicable: The custody order specifically prohibits international travel without my consent / requires passport surrender to the court.]

5. URGENCY:
[Explain why this is urgent — e.g., "The other parent has stated an intent to leave the country," "The other parent has purchased tickets," "A foreign passport has already been obtained," "I have reason to believe the other parent is at or traveling to a passport agency."]

6. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[MAILING ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt of this request, confirm enrollment in CPIAP, and advise on any additional steps. I am available immediately.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_interpol_yellow_notice_request_via_police_v1', entryType: 'template',
        name: 'INTERPOL Yellow Notice Request Template (To Your Police / National Central Bureau)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['interpol', 'yellow_notice', 'law_enforcement', 'missing_child', 'parental_abduction', 'international'],
        url: 'https://www.interpol.int/en/How-we-work/Notices/Yellow-Notices',
        summary: 'Use this to ask your local detective/prosecutor to pursue an INTERPOL Yellow Notice. Individuals typically cannot request notices directly; law enforcement submits through the country\'s National Central Bureau.',
        fullText: `Subject: REQUEST — INTERPOL Yellow Notice for Missing/Abducted Child: [CHILD'S FULL NAME] (DOB [DOB])

To: [DETECTIVE NAME / INVESTIGATING OFFICER], [POLICE DEPARTMENT / AGENCY]
CC: [YOUR ATTORNEY EMAIL], [NATIONAL CENTRAL BUREAU EMAIL if known]
Attachments: (1) High-resolution photo of child (within 6 months) (2) Photo of taking parent (3) Police report / case number (4) Custody order (5) Passport copies (6) Flight/travel info (7) Timeline of events

Dear [DETECTIVE / OFFICER NAME],

I am writing in connection with the active investigation into the international parental abduction of my child, [CHILD'S FULL NAME], DOB [DOB], your case/incident #[NUMBER].

I am requesting that your department submit a request for an INTERPOL Yellow Notice (Missing Person — Minor) through [YOUR COUNTRY]'s National Central Bureau (NCB). The purpose of a Yellow Notice is to alert law enforcement agencies worldwide to help locate a missing person, in this case a child believed to have been wrongfully removed to or retained in a foreign country.

1. WHY A YELLOW NOTICE IS APPROPRIATE:
• The child's location is unknown or unconfirmed, believed to be in [COUNTRY/REGION].
• The child was wrongfully [REMOVED / RETAINED] on [DATE] by [TAKING PARENT FULL NAME].
• Domestic missing person entries (e.g., NCIC in the US, PNC in the UK) do not reach law enforcement in the destination country.
• A Yellow Notice would enable border checks, local police awareness, and coordination with INTERPOL member countries.

2. DATA I CAN PROVIDE FOR THE NOTICE:
• Child's full name, DOB, nationality, passport number(s), physical description, recent photo
• Taking parent's full name, DOB, nationality, passport number(s), photo
• Circumstances of disappearance: date, location, suspected destination, method of travel
• Case reference numbers (police, court, Central Authority)
• Any known aliases, addresses, or contacts abroad

3. WHAT I AM ASKING YOU TO DO:
a) Please submit the Yellow Notice request to the NCB ([NCB name/agency in your country]) with the supporting data and documentation I have provided.
b) If a Red Notice (for the taking parent) is also warranted based on an outstanding arrest warrant, please advise whether that can be submitted concurrently.
c) Please confirm the timeline for submission and expected processing time.
d) If there are any barriers to submission (e.g., no arrest warrant, jurisdictional issues), please advise what is needed so I can work with my attorney to address them.

4. LEGAL CONTEXT:
• Custody order: [COURT], case #[NUMBER], dated [DATE] — attached
• [Hague application filed: YES/NO — case #[NUMBER]]
• [Arrest warrant issued: YES/NO — if yes, warrant #[NUMBER] from [COURT/JURISDICTION]]

5. URGENCY:
Every day that passes without international law enforcement awareness increases the risk that the child will be moved to a third country, enrolled under a different name, or otherwise become harder to locate. I respectfully ask that this be treated as a priority.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
Attorney: [NAME], [PHONE], [EMAIL]

Thank you for your continued work on this case. I am available at any time to provide additional information.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_foreign_attorney_outreach_email_v1', entryType: 'template',
        name: 'Foreign Attorney Outreach Email (Destination Country Counsel)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['foreign_counsel', 'destination_country', 'hague', 'non_hague', 'injunction', 'urgent'],
        summary: 'Use this to contact attorneys in the destination country for Hague filings, local custody motions, injunctions, or enforcement. It requests rapid intake, translator support, and a concrete first-week plan.',
        fullText: `Subject: URGENT — International Child Abduction / Hague Convention — Seeking Immediate Representation in [DESTINATION COUNTRY]

To: [FOREIGN ATTORNEY NAME / FIRM EMAIL]
From: [YOUR FULL NAME]
Date: [DATE]

Dear [ATTORNEY NAME / Firm],

I am a [YOUR COUNTRY] national seeking urgent legal representation in [DESTINATION COUNTRY] in connection with the international parental abduction of my child.

1. CASE SUMMARY:
• Child: [CHILD'S FULL NAME], DOB [DOB], nationality [NATIONALITY/IES]
• Taking parent: [TAKING PARENT FULL NAME], DOB [DOB if known], nationality [NATIONALITY/IES]
• Date of wrongful removal/retention: [DATE]
• Believed location: [CITY/REGION, DESTINATION COUNTRY]
• Hague Convention status: [DESTINATION COUNTRY is / is not a Hague partner with [YOUR COUNTRY]]
• Current legal proceedings: [Hague application filed with [CENTRAL AUTHORITY], case #[NUMBER] / Custody order from [HOME COURT], case #[NUMBER] / None yet]

2. WHAT I NEED FROM YOU:
a) Conflict check — please confirm no conflict with [TAKING PARENT FULL NAME] or their known counsel.
b) If Hague applies: Representation in the Hague return proceedings before [COURT TYPE in DESTINATION COUNTRY]. Please advise on local procedure, expected timeline, and whether legal aid is available.
c) If non-Hague: Advice on the best legal mechanism to seek return or custody (e.g., habeas corpus, local custody filing, wardship application, injunction against removal to a third country).
d) Emergency injunctive relief: Can we obtain an immediate order preventing the taking parent from moving the child out of [CITY/COUNTRY] or changing the child's name/passport?
e) Translator/interpreter: I [DO / DO NOT] speak [LANGUAGE]. Please confirm whether your firm can conduct business in English or provide translation support.
f) Coordination with my home-country attorney: My attorney in [HOME COUNTRY] is [NAME], [FIRM], [EMAIL], [PHONE]. Please coordinate directly as needed.

3. FIRST-WEEK DELIVERABLES I AM HOPING FOR:
• Day 1-2: Conflict check, engagement letter, initial case assessment
• Day 2-3: Emergency filing (injunction, travel ban, border alert) if warranted
• Day 3-5: Begin Hague return application locally or file custody/habeas petition
• Ongoing: Regular updates (at least 2x/week) by email with copies to my home attorney

4. FEE STRUCTURE:
Please provide:
• Retainer amount and hourly/flat fee structure
• Estimated total cost for the first phase (emergency + return hearing)
• Accepted payment methods (wire, credit card, escrow)
• Whether legal aid or pro bono referral is available for international abduction cases

5. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE — include country code]
[EMAIL]
[TIME ZONE]

I can provide all supporting documents (custody order, birth certificate, police report, Hague application, evidence of habitual residence, communications) within 24 hours of engagement.

Thank you for your urgent consideration. If you are unable to take this case, I would be grateful for a referral to a colleague experienced in child abduction / Hague Convention matters.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_court_expedite_hearing_letter_v1', entryType: 'template',
        name: 'Judge/Court Letter Requesting Expedited Hearing (Emergency Custody / Travel Restriction)',
        countryPair: 'General', resourceType: 'Letter Template',
        tags: ['court', 'expedite', 'emergency', 'ne_exeat', 'custody', 'abduction_prevention', 'legal'],
        summary: 'Use this as a cover letter when filing an emergency motion to expedite a hearing due to credible international flight risk or active abduction. It focuses on urgency and procedural requests rather than arguing the full case.',
        fullText: `[YOUR NAME or ATTORNEY NAME]
[ADDRESS]
[PHONE] | [EMAIL]
[DATE]

The Honorable [JUDGE NAME]
[COURT NAME]
[COURT ADDRESS]

Re: [CASE NAME], Case No. [NUMBER]
LETTER REQUESTING EXPEDITED HEARING — EMERGENCY CUSTODY / TRAVEL RESTRICTION

Dear Judge [NAME],

I am writing on behalf of [PETITIONER NAME] to respectfully request that this Court schedule an expedited hearing on the Emergency Motion for [TEMPORARY SOLE CUSTODY / TRAVEL RESTRICTION / NE EXEAT ORDER / PASSPORT SURRENDER] filed [TODAY / on DATE].

1. REASON FOR URGENCY:
There is a credible and imminent risk that the Respondent, [RESPONDENT NAME], will [REMOVE THE CHILD FROM THE JURISDICTION / FLEE TO A FOREIGN COUNTRY / FAIL TO RETURN THE CHILD FROM TRAVEL]. The basis for this belief includes:
• [SPECIFIC FACTS — e.g., one-way tickets purchased, employment terminated, assets liquidated, explicit threats, prior abduction attempts, foreign passport obtained without consent]
• [ADDITIONAL FACTS — e.g., family in [COUNTRY] prepared to receive, child's school records requested for transfer, social media posts indicating relocation]

2. CURRENT STATUS:
• The child, [CHILD'S FULL NAME], DOB [DOB], currently resides in this jurisdiction.
• [Existing custody order: YES / NO — if yes, describe. If no, describe custody rights.]
• [Police report filed: YES — [AGENCY], case #[NUMBER] / NO]
• [Other agencies involved: e.g., State Department, Central Authority, FBI]

3. WHAT WE ARE REQUESTING AT THE HEARING:
a) Temporary sole legal and physical custody to the Petitioner pending a full hearing.
b) An order prohibiting the Respondent from removing the child from [STATE / COUNTRY].
c) Surrender of all passports (child's and Respondent's) to the Clerk of Court or Petitioner's counsel within 24 hours.
d) Entry of the child into relevant alert systems (e.g., NCIC, CPIAP, port alerts).
e) A finding that removal would be wrongful under [APPLICABLE LAW — e.g., Hague Convention, UCCJEA, UCAPA, state statute].
f) Authorization for law enforcement to assist with enforcement of this order.

4. PROPOSED SCHEDULE:
We respectfully request a hearing within [24-72 HOURS / AS SOON AS PRACTICABLE]. We are prepared to proceed on any date and time convenient to the Court. We can appear [IN PERSON / BY VIDEO / BY PHONE].

5. SERVICE:
[We have served / will serve the Respondent by [METHOD] on [DATE].] [If ex parte is requested: We request that notice be waived due to the risk that alerting the Respondent will cause immediate flight.]

Thank you for the Court's urgent attention to this matter. The safety of a child is at stake, and every day of delay increases the risk of irreversible harm.

Respectfully submitted,
[YOUR NAME / ATTORNEY NAME]
[BAR NUMBER if applicable]
[FIRM NAME if applicable]`
    },
    {
        id: 'kb_bank_asset_freeze_request_v1', entryType: 'template',
        name: 'Bank / Financial Institution Notification + Account Freeze Request',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['bank', 'fraud', 'asset_freeze', 'evidence_preservation', 'legal', 'urgent'],
        summary: 'Use this to notify a bank of suspected fraud/theft related to an abduction (unauthorized withdrawals, joint account draining) and to request an immediate hold pending investigation and court orders.',
        fullText: `Subject: URGENT — Fraud Alert / Account Freeze Request — Account #[LAST 4 DIGITS] — Active Criminal Investigation

To: [BANK NAME] — Fraud Department / Security Department
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Your photo ID (2) Police report (3) Custody/court order (if available) (4) Proof of account ownership/joint holder status

Dear Fraud/Security Team,

I am a [JOINT ACCOUNT HOLDER / AUTHORIZED SIGNER / ACCOUNT HOLDER] on account(s) ending in [LAST 4 DIGITS]. I am writing to report suspected unauthorized activity and to request an immediate freeze on the account(s) pending investigation.

1. WHAT HAPPENED:
On or about [DATE], [TAKING PARENT FULL NAME], who is [JOINT HOLDER / AUTHORIZED USER / HAS NO AUTHORIZATION], [WITHDREW / TRANSFERRED / LIQUIDATED] approximately $[AMOUNT] from the account without my knowledge or consent. I believe these funds are being used to facilitate the international abduction of our child, [CHILD'S FULL NAME].

2. ACTIVE INVESTIGATION:
A police report has been filed: [AGENCY], case/incident #[NUMBER], officer/detective [NAME], phone [PHONE]. [If applicable: An FBI investigation has also been opened, reference #[NUMBER].]

3. IMMEDIATE ACTIONS REQUESTED:
a) FREEZE: Place an immediate hard hold on all accounts where [TAKING PARENT FULL NAME] is listed as a joint holder, authorized signer, or beneficiary. No withdrawals, transfers, or card transactions should be permitted until further notice or court order.
b) EVIDENCE PRESERVATION: Preserve all records for the past [6-12] months, including:
   - Wire transfer details (SWIFT codes, IBAN numbers, recipient bank/country)
   - ATM withdrawal locations (including international locations and IP addresses for online banking)
   - Credit/debit card transaction details (merchant names, locations, dates, amounts)
   - Online banking login records (IP addresses, device identifiers, timestamps)
   - Any new accounts opened, beneficiary changes, or address changes
c) FOREIGN TRANSACTION ALERT: If any attempt is made to access these funds from [SUSPECTED COUNTRY] or any international location, please deny the transaction and log all location data.
d) STATEMENTS: Please provide me with certified copies of all account statements for the past [6-12] months.

4. LEGAL BASIS:
As a joint account holder, I have the right to restrict access to the account. [If court order exists: I have attached a court order from [COURT], case #[NUMBER], dated [DATE], which [FREEZES ASSETS / RESTRICTS THE OTHER PARTY'S ACCESS / ORDERS DISCLOSURE].] [If no court order yet: A court order is being sought and will be provided as soon as it is issued.]

5. CONTACT FOR LAW ENFORCEMENT:
Investigating officer: [DETECTIVE NAME], [AGENCY], [PHONE], [EMAIL]
Please cooperate fully with any subpoenas or preservation requests from this officer.

6. MY CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt of this request and the actions taken. I am available immediately for identity verification or to provide additional documentation.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_insurance_notification_template_v1', entryType: 'template',
        name: 'Insurance Company Notification (Coverage, Travel, Dependent, Legal Assistance Add-ons)',
        countryPair: 'General', resourceType: 'Email Template',
        tags: ['insurance', 'case_management', 'dependent', 'documentation', 'international', 'urgent'],
        summary: 'Use this to notify insurers (health, travel, life, legal assistance riders) that a dependent is missing/abducted and to trigger any benefits, case management, or documentation preservation.',
        fullText: `Subject: URGENT — Notification of Missing/Abducted Dependent: [CHILD'S FULL NAME] (DOB [DOB]) — Policy #[NUMBER]

To: [INSURANCE COMPANY] — Claims / Customer Service / Case Management
CC: [YOUR ATTORNEY EMAIL]
Attachments: (1) Policy documents (2) Police report (3) Custody order (if available) (4) Child's birth certificate (5) Photo of child

Dear Claims/Case Management Team,

I am writing to notify you that my dependent child, [CHILD'S FULL NAME], DOB [DOB], covered under policy #[NUMBER], has been [ABDUCTED / IS MISSING / HAS BEEN WRONGFULLY REMOVED TO A FOREIGN COUNTRY] as of [DATE].

1. POLICY INFORMATION:
• Policyholder: [YOUR FULL NAME]
• Policy number: [NUMBER]
• Type of coverage: [HEALTH / TRAVEL / LIFE / LEGAL EXPENSES / HOME / OTHER]
• Dependent covered: [CHILD'S FULL NAME], DOB [DOB]

2. WHAT HAPPENED:
On [DATE], [TAKING PARENT FULL NAME] [REMOVED THE CHILD FROM / FAILED TO RETURN THE CHILD TO] [HOME COUNTRY/STATE]. The child is believed to be in [DESTINATION COUNTRY/CITY]. A police report has been filed ([AGENCY], case #[NUMBER]).

3. WHAT I AM REQUESTING:
a) COVERAGE CONFIRMATION: Please confirm what coverage applies to this situation, including:
   - Medical coverage for the child while abroad (emergency treatment, ongoing prescriptions)
   - Travel insurance benefits (trip interruption, emergency travel for recovery)
   - Legal expense coverage or legal assistance rider (attorney fees, court costs, Hague Convention proceedings)
   - Kidnap and ransom coverage (if applicable under the policy)
   - Counseling/therapy coverage for the child upon return and for the left-behind parent
b) CASE MANAGEMENT: If your policy includes case management or crisis assistance services, please activate them immediately and assign a case manager.
c) DOCUMENTATION PRESERVATION: Please preserve all records related to claims, communications, and policy changes involving [TAKING PARENT FULL NAME] for the past [12-24] months.
d) BENEFICIARY/POLICY CHANGE FREEZE: Please do NOT process any policy changes (beneficiary changes, cancellations, coverage modifications) requested by [TAKING PARENT FULL NAME] without my written consent.
e) CLAIMS HISTORY: Please provide me with a complete claims history for the child for the past [12-24] months, including any claims filed from foreign medical providers.

4. MEDICAL NEEDS:
The child has the following medical conditions/needs that may require urgent attention:
• [CONDITION — e.g., asthma, allergies, ADHD, diabetes]
• Current medications: [LIST]
• Prescribing physician: [NAME, PHONE]
• [If applicable: The child's medication supply would have run out approximately [DATE].]

5. CONTACT INFORMATION:
[YOUR FULL NAME]
[PHONE] | [EMAIL]
[ADDRESS]
Attorney: [NAME], [PHONE], [EMAIL]

Please confirm receipt and advise on next steps, required forms, and any applicable benefits or services. I am available immediately.

Sincerely,
[YOUR FULL NAME]`
    },
    {
        id: 'kb_hague_return_application_step_by_step_v1', entryType: 'procedure',
        name: 'How to File a Hague 1980 Return Application (Step-by-Step)',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['hague', 'legal', 'return_application', 'central_authority', 'habitual_residence', 'procedure'],
        url: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=24',
        summary: 'A step-by-step guide for filing a Hague Convention return application through your home country Central Authority, including what documents to gather, how to frame habitual residence, and how to avoid common delays.',
        fullText: `HOW TO FILE A HAGUE 1980 RETURN APPLICATION — STEP-BY-STEP GUIDE

This guide walks you through the process of filing a Hague Convention return application when your child has been wrongfully removed to or retained in another country that is a Hague partner.

STEP 1: CONFIRM HAGUE APPLICABILITY
• Is the destination country a Hague Convention partner with your country? Check the HCCH status table: https://www.hcch.net/en/instruments/conventions/status-table/?cid=24
• Was the child under 16 at the time of removal/retention? (The Convention only applies to children under 16.)
• Did the removal/retention breach your custody rights under the law of the child's habitual residence?
• Were you actually exercising those custody rights at the time? (Even if you were away for work, that counts.)
• If YES to all: proceed. If NO to any: you may need a non-Hague strategy (local custody filing, habeas corpus, diplomatic channels).

STEP 2: IDENTIFY YOUR CENTRAL AUTHORITY
• Every Hague signatory has a "Central Authority" — the government agency responsible for processing applications.
• In the US: Office of Children's Issues (OCI), U.S. Department of State.
• In the UK: International Child Abduction and Contact Unit (ICACU).
• In Australia: Attorney-General's Department, Commonwealth Central Authority.
• Find yours: https://www.hcch.net/en/states/authorities
• You file with YOUR country's Central Authority (the "Requesting State"). They transmit it to the destination country's Central Authority (the "Requested State").

STEP 3: GATHER YOUR DOCUMENTS
Essential documents (provide originals or certified copies where possible):
□ Completed application form (your Central Authority may have a specific form, or use the model Hague application)
□ Custody order — certified copy, with certified translation if not in the language of the destination country
□ If no custody order: evidence of custody rights by operation of law (birth certificate showing parentage, proof of habitual residence, relevant statute citations)
□ Child's birth certificate
□ Recent photograph of the child (within 6 months, clear face)
□ Recent photograph of the taking parent
□ Passport copies — child and taking parent (if available)
□ Police report — with case/incident number
□ Evidence of habitual residence: school enrollment, medical records, lease/mortgage, utility bills, tax filings, daycare contracts, extracurricular registrations
□ Evidence of the wrongful removal/retention: flight records, communications (texts, emails, voicemails), witness statements, social media posts
□ Marriage certificate / divorce decree (if applicable)
□ Any previous court orders (protection orders, visitation orders, travel restriction orders)
□ Affidavit / declaration of the applicant (a sworn statement of facts)
□ If applicable: evidence of domestic violence, substance abuse, or safety concerns (this helps you prepare for a 13(b) defense)

STEP 4: ESTABLISH HABITUAL RESIDENCE
This is the single most important legal concept. "Habitual residence" means where the child was actually living and integrated before the removal.
• Strong evidence: school enrollment, medical provider visits, social activities, duration of residence (usually 6+ months), parental intent to remain
• Weak arguments to avoid: "The child has my country's passport" (not enough), "I wanted to move there eventually" (intent without action), "The child visited once" (visits are not habitual residence)
• If you recently moved countries together: this is complex. Courts look at shared parental intent and the child's degree of acclimatization.

STEP 5: FRAME YOUR APPLICATION
Your application should clearly state:
a) WHO: Applicant (you), child, respondent (taking parent)
b) WHAT: The wrongful removal or retention
c) WHEN: The date it occurred
d) WHERE: From the child's habitual residence to the destination country
e) WHY IT IS WRONGFUL: It breaches your custody rights under the law of the habitual residence, and you did not consent
f) WHAT YOU WANT: The return of the child to the country of habitual residence

STEP 6: SUBMIT AND FOLLOW UP
• Submit to your Central Authority by the method they require (some accept email, some require physical mail, some have online portals).
• Request written confirmation of receipt and a case/reference number.
• Ask for the name and contact details of your assigned case officer.
• Ask for the estimated timeline for transmission to the destination country.
• Mark your calendar: Under Article 11, if no decision has been made within 6 weeks, you (or your Central Authority) can request a statement of reasons for the delay.

STEP 7: AVOID COMMON DELAYS
• Missing translations: Get all documents translated and certified BEFORE submitting. This is the #1 cause of delay.
• Incomplete application: Fill in every field. If you do not know something, write "unknown" rather than leaving it blank.
• No evidence of habitual residence: Gather this proactively. Do not assume the court will take your word for it.
• Waiting too long: The one-year clock under Article 12 starts on the date of wrongful removal/retention. File as soon as possible — ideally within weeks, not months.
• Not retaining local counsel in the destination country: Your Central Authority transmits the application, but you may need a lawyer in the destination country to represent you in court. Start looking immediately.

STEP 8: PREPARE FOR DEFENSES
The taking parent will likely raise one or more of these defenses:
• Article 13(a): You consented or acquiesced to the removal. Counter: gather evidence showing you did NOT consent (texts, emails, police report).
• Article 13(b): Return would expose the child to grave risk. Counter: prepare "undertakings" (enforceable promises) and evidence that your home country can protect the child.
• Article 13 (child's objection): The child objects to return and is mature enough to be heard. Counter: argue the child has been coached/alienated; request independent psychological evaluation.
• Article 12 (settled): If more than one year has passed, the child is settled. Counter: argue the abductor concealed the child (tolling the clock) and the settlement is precarious (immigration status, frequent moves).

TIMELINE EXPECTATIONS:
• Central Authority processing: 1-4 weeks (varies widely by country)
• Transmission to destination country: 1-2 weeks after processing
• Court proceedings in destination country: 4-12 weeks (should be 6 weeks per Article 11, but many countries are slower)
• Total from filing to decision: 2-6 months in efficient countries; 6-18 months in slower ones
• If return is ordered: enforcement may take additional weeks depending on the country`
    },
    {
        id: 'kb_police_report_international_abduction_guide_v1', entryType: 'procedure',
        name: 'How to File a Police Report for International Parental Abduction',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['police_report', 'law_enforcement', 'missing_child', 'interpol', 'evidence', 'procedure'],
        summary: 'A practical guide for creating a high-quality police report that supports cross-border actions (alerts, border checks, INTERPOL, Hague filings). Includes what to bring, what to insist on, and exact language to request.',
        fullText: `HOW TO FILE A POLICE REPORT FOR INTERNATIONAL PARENTAL ABDUCTION — PRACTICAL GUIDE

Filing a police report is often the first official step. A well-documented report supports every subsequent action: border alerts, NCIC entry, INTERPOL notices, Hague applications, and court filings. A poor report can set you back weeks.

BEFORE YOU GO TO THE STATION — PREPARE THESE:
□ Child's birth certificate (original or certified copy)
□ Custody order (if you have one) — certified copy
□ Recent photo of the child (clear face, within 6 months) — printed and digital
□ Recent photo of the taking parent — printed and digital
□ Child's passport information (number, issuing country, expiration) — or a note that the passport is missing/unknown
□ Taking parent's passport information (if known)
□ Travel information: airline, flight number, date, time, departure/arrival cities, PNR/booking reference
□ Timeline: a written, chronological summary of events (when you last saw the child, when you realized they were gone, what you have done since)
□ Evidence of premeditation (if any): screenshots of texts/emails, records of asset liquidation, employment resignation, passport applications
□ List of addresses where the taking parent might be found abroad (family, friends, former addresses)
□ Your identification (driver's license, passport)

AT THE STATION — WHAT TO SAY:
1. State clearly: "I am here to report an international parental child abduction. My child has been taken out of the country without my consent."
2. If the officer says "This is a civil matter" or "We cannot help with custody disputes":
   - Respond: "Under [APPLICABLE LAW — e.g., 18 U.S.C. § 1204 (IPKCA) in the US, Child Abduction Act 1984 in the UK, relevant state/national statute], taking a child across international borders in violation of custody rights is a criminal offense. I am requesting that a report be taken and the child be entered into [NCIC / the national missing persons database]."
   - If they still refuse: ask for the watch commander or duty sergeant. You have a right to file a report.
3. Use the word "ABDUCTION" not "custody dispute." Use "MISSING CHILD" not "taken by the other parent."
4. Provide all documents. Ask the officer to note each document in the report.

WHAT TO INSIST ON:
a) A written report with a case/incident number — do not leave without this number.
b) Entry into the national missing persons database:
   - US: NCIC (National Crime Information Center) — specifically the Missing Person File. Under Suzanne's Law (if child is under 21) and the PROTECT Act, law enforcement MUST enter the child into NCIC within 2 hours.
   - UK: PNC (Police National Computer)
   - Other countries: the equivalent national database
c) A port alert / border alert: Request that the child and taking parent be flagged at all ports of exit. In the US, this means CBP (Customs and Border Protection) notification.
d) Assignment of a detective/investigator: Ask who the assigned detective will be and get their direct phone number and email.
e) Classification: Insist the report be classified as a MISSING CHILD / PARENTAL ABDUCTION, not as a "civil dispute" or "family matter."

AFTER FILING — IMMEDIATE FOLLOW-UP:
1. Get a certified copy of the report (you will need it for court, Central Authority, embassy, FBI, etc.)
2. Confirm the NCIC/database entry was actually made (some officers say they will do it and forget — call back within 24 hours to verify).
3. Provide the case number to:
   - Your attorney
   - The Central Authority (if filing a Hague application)
   - The embassy/consulate
   - The school, pediatrician, and any other relevant institution
4. If the child may still be in transit or has just left: call the airport police and CBP (US) / Border Force (UK) / equivalent agency directly. Do not wait for the local police to relay the information.

COMMON MISTAKES TO AVOID:
• Waiting "a few days to see if they come back" — file IMMEDIATELY. Every hour matters for border alerts and flight interception.
• Accepting "we'll call you" — get a case number and detective assignment before you leave.
• Not bringing documents — the more you bring, the more seriously you are taken.
• Being emotional instead of factual — write your timeline in advance so you can present facts clearly.
• Not asking for NCIC entry (US) — this is your RIGHT, not a favor. Cite Suzanne's Law if needed.
• Filing only in the city where you live — if the child was taken from a different jurisdiction (e.g., from school in another city), file there too.`
    },
    {
        id: 'kb_us_ncic_entry_request_guide_v1', entryType: 'procedure',
        name: 'US: How to Request an NCIC Entry for a Missing/Abducted Child',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'ncic', 'law_enforcement', 'ncmec', 'state_department', 'missing_child', 'procedure'],
        url: 'https://www.missingkids.org/footer/contactus',
        phone: '1-800-843-5678',
        summary: 'Explains how NCIC entry works, who can request it, and how to press for it through local law enforcement when a child is at risk of leaving the U.S. or already missing.',
        fullText: `US: HOW TO REQUEST AN NCIC ENTRY FOR A MISSING/ABDUCTED CHILD

WHAT IS NCIC?
The National Crime Information Center (NCIC) is the FBI's centralized database used by law enforcement agencies nationwide (and internationally through INTERPOL). When a child is entered into NCIC as a missing person, any law enforcement officer in the US (and many abroad) who encounters the child or the taking parent during a traffic stop, border crossing, or other interaction will receive an alert.

WHY IT MATTERS:
• NCIC is the backbone of US missing persons alerts. Without an entry, your child is invisible to law enforcement systems.
• CBP (Customs and Border Protection) uses NCIC to flag travelers at airports and land borders.
• NCIC entries are shared with INTERPOL, enabling international alerts.
• NCMEC (National Center for Missing & Exploited Children) receives NCIC data and can activate additional resources.

WHO CAN REQUEST AN NCIC ENTRY?
• Only law enforcement can enter a person into NCIC. You (as a parent) cannot do it directly.
• You request it through the police officer or detective handling your case.
• Under Suzanne's Law (42 U.S.C. § 5779) and the PROTECT Act, law enforcement MUST enter a missing child (under 21) into NCIC within 2 HOURS of receiving the report. There is NO waiting period.

HOW TO REQUEST IT — STEP BY STEP:

STEP 1: FILE A POLICE REPORT
• Go to your local police department (or the department with jurisdiction where the child was last seen).
• State: "My child has been abducted / is missing. I need to file a report and have the child entered into NCIC immediately."
• Provide: child's full name, DOB, physical description, photo, passport info, custody order, and all details about the taking parent and suspected destination.

STEP 2: SPECIFICALLY REQUEST NCIC ENTRY
• Say: "I am requesting that [CHILD'S NAME] be entered into the NCIC Missing Person File as a missing child — category: Involuntary (parental abduction)."
• NCIC categories for missing children:
  - Endangered Missing (EMC)
  - Involuntary Missing (parental abduction falls here)
  - Disabled Missing
  - Catastrophe Missing
• For parental abduction, request the "Involuntary" category, but if there are safety concerns (threats, DV, medical needs), also argue for "Endangered" to trigger a higher alert level.

STEP 3: VERIFY THE ENTRY WAS MADE
• Ask the officer: "Can you confirm the NCIC entry number and the date/time it was entered?"
• If they say they will "do it later," cite Suzanne's Law: under federal law, the entry must be made within 2 hours.
• Call back within 24 hours and ask to speak with the records division to confirm the entry is active.

STEP 4: REQUEST ADDITIONAL FLAGS
Once the NCIC entry is made, request:
a) TECS/CBP Alert: Ask the officer to also notify CBP (Customs and Border Protection) to flag the child and taking parent at all US ports of entry/exit. NCIC alone may not immediately trigger a CBP stop — a separate TECS entry may be needed.
b) State Department Notification: Notify the Office of Children's Issues (OCI) at 1-888-407-4747 and ask them to coordinate with CBP and passport services.
c) NCMEC Report: Call NCMEC at 1-800-843-5678 (1-800-THE-LOST) to file a report. NCMEC works with NCIC data and can provide additional support including posters, tip lines, and international outreach.

IF LAW ENFORCEMENT REFUSES OR DELAYS:
• Cite the law: "Under 42 U.S.C. § 5779 (Suzanne's Law), you are required to enter a missing child into NCIC within 2 hours. There is no waiting period for children."
• Ask for the watch commander, duty sergeant, or shift supervisor.
• If still refused: contact the FBI field office directly and report the abduction. The FBI can initiate its own NCIC entry and investigation.
• Contact NCMEC (1-800-843-5678) — they can also intervene and pressure local law enforcement to make the entry.
• Contact your state's Attorney General office if local police are uncooperative.

AFTER THE NCIC ENTRY:
• Provide the NCIC case number to your attorney, the Central Authority (if filing Hague), and the State Department.
• Update the entry if you get new information (new address, new travel plans, sightings).
• The entry must be renewed periodically — confirm with the entering agency how long the entry remains active and when it needs to be refreshed.`
    },
    {
        id: 'kb_emergency_custody_order_guide_v1', entryType: 'procedure',
        name: 'How to Get an Emergency Custody Order After Abduction (Quick Court Path)',
        countryPair: 'General', resourceType: 'Legal Filing Guide',
        tags: ['emergency_order', 'custody', 'travel_ban', 'ne_exeat', 'court', 'procedure', 'international'],
        summary: 'A jurisdiction-neutral guide to obtaining emergency custody and enforcement language that helps across borders, including passport surrender, travel bans, and law enforcement assistance.',
        fullText: `HOW TO GET AN EMERGENCY CUSTODY ORDER AFTER ABDUCTION — QUICK COURT PATH

When your child has been abducted or is at imminent risk of being taken, you need a court order FAST. This guide explains the general process across jurisdictions.

WHY YOU NEED THIS ORDER:
1. It establishes your custody rights on paper — critical for Hague applications, police enforcement, and embassy requests.
2. It can include travel restrictions, passport surrender, and law enforcement authorization.
3. It creates a "wrongful removal" finding that strengthens your Hague case (Article 3/15).
4. Without it, many agencies (police, border control, embassies) will say "this is a civil matter" and refuse to help.

STEP 1: DETERMINE THE RIGHT COURT
• File in the court that has jurisdiction over the child's habitual residence (where the child was living before the abduction).
• In the US: this is typically the Family Court or Superior Court in the county where the child lived. Under the UCCJEA, "home state" is the state where the child lived for at least 6 consecutive months before the abduction.
• In the UK: the Family Court or, for urgent international matters, the High Court (Family Division).
• In other countries: consult a local family law attorney. The key principle is the same — file where the child was living.

STEP 2: FILE AN EMERGENCY MOTION (EX PARTE IF NECESSARY)
• An "ex parte" motion is heard without the other parent present. Courts allow this when giving notice would cause the other parent to flee or hide the child.
• Your motion should request:
  a) TEMPORARY SOLE LEGAL AND PHYSICAL CUSTODY — to you, pending a full hearing.
  b) TRAVEL RESTRICTION / NE EXEAT ORDER — prohibiting the taking parent from removing the child from [STATE/COUNTRY].
  c) PASSPORT SURRENDER — all passports (child's and taking parent's) to be surrendered to the court clerk, your attorney, or a designated third party within 24 hours.
  d) LAW ENFORCEMENT ASSISTANCE — authorization for police to locate, recover, and return the child to you (sometimes called a "writ of assistance" or "collection order").
  e) BORDER ALERT — direction that the child be entered into relevant alert databases (NCIC, CPIAP, port alerts).
  f) FINDING OF WRONGFUL REMOVAL — a specific judicial finding that the removal was wrongful and in violation of your custody rights. This is critical for Hague Article 3 and Article 15 purposes.

STEP 3: WHAT YOUR MOTION MUST INCLUDE
• A sworn affidavit or declaration setting out the facts: who, what, when, where, and why it is an emergency.
• Evidence of habitual residence (school records, medical records, lease, utilities).
• Evidence of the abduction or flight risk (travel records, communications, witness statements, premeditation evidence).
• The custody order (if one exists) or a citation to the law that gives you custody rights.
• A statement explaining why notice to the other parent should be waived (if seeking ex parte relief).

STEP 4: GET IT HEARD FAST
• Call the court clerk and ask for the procedure for emergency/ex parte filings. Many courts have a specific "emergency motion" process or a duty judge available same-day.
• If the clerk says the next available hearing is weeks away, file a "letter to the judge" requesting expedited scheduling (see the Expedited Hearing Letter template in this knowledge base).
• In many jurisdictions, emergency custody motions in abduction cases can be heard within 24-72 hours.

STEP 5: SERVE THE ORDER
• Once the order is signed, it must be served on the taking parent (unless the judge waives service for ex parte orders).
• If the taking parent is abroad, service may be accomplished through:
  - The Hague Service Convention (if the destination country is a partner)
  - The embassy/consulate
  - Alternative service (email, social media) if the court permits
• Get certified copies of the signed order immediately — you will need multiple copies for police, embassy, airline, Central Authority, and your own records.

STEP 6: ENFORCE THE ORDER
• Provide certified copies to local police and border agencies.
• If the child is still in your country: law enforcement can execute the writ of assistance to recover the child.
• If the child is already abroad: the order supports your Hague application, embassy welfare checks, and INTERPOL requests.
• Consider getting the order "apostilled" (authenticated for international use) — many foreign courts and agencies require this.

KEY LANGUAGE TO INCLUDE IN YOUR ORDER:
• "The Court finds that the removal/retention of [CHILD] by [TAKING PARENT] was wrongful within the meaning of the Hague Convention on the Civil Aspects of International Child Abduction."
• "All law enforcement agencies are directed to assist in the recovery and return of the child."
• "All passports and travel documents for [CHILD] and [TAKING PARENT] shall be surrendered to [RECIPIENT] within 24 hours."
• "Neither parent shall remove the child from the jurisdiction of [STATE/COUNTRY] without prior written consent of the other parent or further order of this Court."`
    },
    {
        id: 'kb_us_ne_exeat_order_guide_v1', entryType: 'procedure',
        name: 'US: Ne Exeat / Travel Restriction Order Guide (Prevent Removal)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'ne_exeat', 'travel_restriction', 'court', 'passport', 'abduction_prevention', 'legal'],
        summary: 'Explains how to request a ne exeat-style order (or equivalent) in U.S. family court to restrict international travel, require passport surrender, and create enforceable consequences for attempted removal.',
        fullText: `US: NE EXEAT / TRAVEL RESTRICTION ORDER GUIDE — PREVENT REMOVAL

WHAT IS A NE EXEAT ORDER?
"Ne exeat" is Latin for "let them not leave." It is a court order that prohibits a person (typically a parent) from removing a child from the jurisdiction. In the US, while the term "ne exeat" is used in some states, the functional equivalent exists in every state through emergency travel restriction orders, UCAPA (Uniform Child Abduction Prevention Act) petitions, and standard custody orders with travel provisions.

WHEN TO SEEK THIS ORDER:
• You have credible evidence that the other parent is planning to take the child out of the country.
• The other parent has a history of non-compliance with court orders.
• The other parent has strong ties to a foreign country (citizenship, family, property) and weak ties to the US.
• The other parent has made threats to take the child.
• The other parent has obtained or applied for a foreign passport for the child without your consent.
• The other parent has liquidated assets, resigned from employment, or terminated a lease.
• Any UCAPA risk factors are present (see below).

UCAPA RISK FACTORS (Section 7):
The Uniform Child Abduction Prevention Act provides a specific framework. Many states have adopted it. Key risk factors include:
□ The parent has previously abducted or attempted to abduct the child
□ The parent has threatened to abduct the child
□ The parent has recently engaged in activities that may indicate a planned abduction (abandoned employment, sold home, terminated lease, liquidated assets, obtained travel documents, applied for passport)
□ The parent has a history of domestic violence, stalking, or child abuse
□ The parent has strong familial, emotional, or cultural ties to another country
□ The parent has no financial reason to stay in the US
□ The parent is not a US citizen and has no immigration status tying them here
□ The parent has a foreign custody order or proceeding pending
□ The destination country is not a Hague Convention partner, or has a poor enforcement record

WHAT YOUR PETITION SHOULD REQUEST:
a) TRAVEL RESTRICTION: An order prohibiting the respondent from removing the child from [STATE] and/or the United States without prior written consent of the petitioner or court order.
b) PASSPORT SURRENDER: All passports (US and foreign) for the child and the respondent to be surrendered to the court clerk, petitioner's attorney, or other designated custodian within [24-48] hours.
c) CPIAP ENROLLMENT: An order directing enrollment of the child in the Children's Passport Issuance Alert Program (CPIAP) through the U.S. Department of State, so that the petitioner is notified before any new passport is issued.
d) NCIC / BORDER ALERT: An order directing law enforcement to enter the child into NCIC and notify CBP of the travel restriction.
e) BOND: An order requiring the respondent to post a bond (cash or surety) in an amount sufficient to cover the petitioner's anticipated costs of international legal proceedings if the child is removed ($[AMOUNT — typically $25,000-$100,000+]).
f) SUPERVISED VISITATION: If the risk is high, restrict the respondent's visitation to supervised settings only, with no overnight stays.
g) GEOGRAPHIC RESTRICTION ON RESIDENCE: An order prohibiting the respondent from relocating beyond [DISTANCE] miles without court approval.
h) LAW ENFORCEMENT AUTHORIZATION: An order authorizing all law enforcement officers to enforce the travel restriction and recover the child if found in violation.

HOW TO FILE:
1. Consult an attorney experienced in international custody / abduction prevention. If you cannot afford one, contact your local legal aid society or the ABA's family law resources.
2. File the petition in the family court with jurisdiction (typically where the child currently resides).
3. If this is an emergency, file an ex parte motion (without notice to the other parent) explaining that giving notice would cause the other parent to flee.
4. Attach all supporting evidence: affidavit, custody order, evidence of risk factors, communications, travel records, etc.
5. Request an expedited hearing (see the Expedited Hearing Letter template in this knowledge base).

AFTER THE ORDER IS GRANTED:
• Serve the respondent immediately (personal service preferred).
• Provide certified copies to:
  - Local police
  - CBP (Customs and Border Protection)
  - The child's school and daycare
  - The child's pediatrician
  - Your attorney
  - OCI / State Department (for CPIAP enrollment)
• Collect all passports as directed by the order.
• If the respondent violates the order: call police immediately, file a motion for contempt, and consider requesting criminal charges.

IMPORTANT NOTES:
• A travel restriction order is only as good as its enforcement. Make sure every relevant agency has a copy.
• Foreign passports are the biggest gap. If the other parent has obtained a foreign passport for the child, the US court order does not bind the foreign government. You may need to contact that country's embassy to request cancellation or a lookout.
• If the child is a dual national, both passports must be addressed in the order.`
    },
    {
        id: 'kb_us_passport_revocation_guide_v1', entryType: 'procedure',
        name: 'US: Passport Revocation / Cancellation vs Prevention (What Actually Works)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'passport', 'prevention', 'state_department', 'cpiap', 'legal', 'urgent'],
        url: 'https://travel.state.gov/content/travel/en/International-Parental-Child-Abduction.html',
        email: 'PreventAbduction1@state.gov',
        phone: '1-888-407-4747',
        summary: 'Clarifies the difference between preventing issuance, revoking an existing passport, and requesting alerts. Includes the practical path most parents can execute quickly.',
        fullText: `US: PASSPORT REVOCATION / CANCELLATION vs PREVENTION — WHAT ACTUALLY WORKS

Understanding the difference between these tools is critical. Many parents waste time pursuing the wrong action.

TOOL 1: PREVENT ISSUANCE (BEFORE A PASSPORT EXISTS)
What it does: Stops a new US passport from being issued to your child.
How it works:
• Under 22 CFR 51.28, BOTH parents must consent to passport issuance for a child under 16.
• If the other parent applies for a passport without your consent, the application should be denied — but ONLY if the State Department knows to look for it.
• Enroll in CPIAP (Children's Passport Issuance Alert Program) by submitting Form DS-3077 to the Office of Children's Issues.
Action steps:
1. Download and complete Form DS-3077 from travel.state.gov.
2. Submit it to: PreventAbduction1@state.gov or by mail/fax to OCI.
3. Include: your ID, child's birth certificate, custody order (if any).
4. Request written confirmation of enrollment.
Limitations:
• CPIAP only covers US passports. It does NOT prevent a foreign passport from being issued by another country's embassy.
• CPIAP is a NOTIFICATION system — it alerts you that an application has been received. In theory, the passport should not be issued without your consent, but processing errors can occur. Follow up aggressively.

TOOL 2: REVOKE / CANCEL AN EXISTING US PASSPORT (AFTER IT HAS BEEN ISSUED)
What it does: Makes an existing US passport invalid, so it cannot be used for travel.
How it works:
• The State Department CAN revoke a child's passport, but this is rare and typically requires a court order specifically directing revocation.
• A family court judge can order the passport surrendered to the court, but the physical passport may still scan as "valid" at a border if the State Department has not flagged it in its system.
Action steps:
1. Obtain a court order that SPECIFICALLY directs the US Department of State to revoke or cancel the child's passport. Generic language like "surrender passports" is not enough for State Department action.
2. Send the court order to OCI (PreventAbduction1@state.gov) and request that they flag the passport number in the State Department system.
3. If you physically possess the passport, surrender it to the court clerk as directed by the order. If you do not possess it, the court order should direct the other parent to surrender it and authorize law enforcement to seize it.
4. Request written confirmation from OCI that the passport has been flagged/revoked.
Limitations:
• Revocation does not physically retrieve the passport. If the taking parent has it, they may attempt to use it at a border where systems are not updated.
• Some countries accept expired or revoked US passports for entry if the traveler also holds that country's nationality.

TOOL 3: PASSPORT LOOKOUT (ALERT AT PORTS OF ENTRY/EXIT)
What it does: Flags the child and/or taking parent so that CBP (Customs and Border Protection) is alerted when the passport is scanned at a US port of entry or exit.
How it works:
• This is separate from CPIAP (which covers new issuance).
• A lookout can be placed through law enforcement (police, FBI) or through OCI coordination with CBP.
Action steps:
1. Ask your detective to request a CBP lookout for the child and taking parent.
2. Contact OCI and request they coordinate a lookout with CBP.
3. If you have a court order with a travel restriction, provide it to CBP through your detective or OCI.
Limitations:
• A lookout is only effective at US ports. If the child has already left the US, the lookout will only trigger if they attempt to re-enter or transit through the US.
• Private charter flights, land border crossings to Mexico/Canada, and boat departures may not be covered by standard lookouts.

TOOL 4: FOREIGN PASSPORT PREVENTION
What it does: Prevents the other country from issuing a passport to your child.
How it works:
• This is the HARDEST to achieve, because the US has no authority over foreign governments.
• You must contact the foreign country's embassy or consulate directly and request that no passport be issued to your child without your consent.
• Some countries will honor a US court order; many will not.
Action steps:
1. Send a letter (with certified translation if needed) to the foreign embassy/consulate in the US, attaching your custody order and requesting a hold on passport issuance.
2. Ask your attorney to contact the foreign Central Authority or Ministry of Foreign Affairs.
3. If the other parent has dual nationality and the child is entitled to that country's passport, this is your biggest vulnerability. Address it proactively.
Limitations:
• Many countries consider the child a national regardless of the US court order and will issue a passport to any parent who requests one.
• Some countries have no mechanism for a "hold" on passport issuance.

THE PRACTICAL PATH (WHAT TO DO RIGHT NOW):
1. IMMEDIATELY: Enroll in CPIAP (Form DS-3077) — takes 10 minutes to submit.
2. IMMEDIATELY: Request your detective place a CBP lookout.
3. WITHIN 24 HOURS: File for a court order requiring passport surrender and directing State Department revocation.
4. WITHIN 48 HOURS: Contact the foreign embassy to request a hold on foreign passport issuance.
5. ONGOING: Follow up with OCI weekly until you have written confirmation of all actions taken.

CONTACT:
• OCI: PreventAbduction1@state.gov | 1-888-407-4747 (US) | +1-202-501-4444 (overseas)
• CPIAP Form DS-3077: https://travel.state.gov
• CBP: Contact through your local FBI field office or detective`
    },
    {
        id: 'kb_us_uccjea_jurisdiction_motion_guide_v1', entryType: 'procedure',
        name: 'US: UCCJEA Jurisdiction Motion Guide (Protect Home-State Jurisdiction)',
        countryPair: 'US', resourceType: 'Legal Filing Guide',
        tags: ['us', 'uccjea', 'jurisdiction', 'custody', 'court', 'legal', 'abduction'],
        summary: 'Shows how to use the UCCJEA to confirm home-state jurisdiction, stop competing filings, and support cross-border enforcement. Focuses on what your filing should seek and what facts matter most.',
        fullText: `US: UCCJEA JURISDICTION MOTION GUIDE — PROTECT HOME-STATE JURISDICTION

WHAT IS THE UCCJEA?
The Uniform Child Custody Jurisdiction and Enforcement Act (UCCJEA) is adopted in all 50 US states plus DC. It determines which state (and in international cases, which country) has jurisdiction to make custody decisions. Securing jurisdiction in YOUR home state is critical — it prevents the taking parent from filing in a more favorable forum (whether another US state or a foreign country).

WHY THIS MATTERS IN ABDUCTION CASES:
• If you do not assert jurisdiction quickly, the taking parent may file for custody in the destination country, creating a competing proceeding.
• Under the UCCJEA, the "home state" has priority jurisdiction. But if you wait too long without filing, you risk losing home-state status.
• A UCCJEA jurisdiction finding from your home court supports Hague applications, international enforcement, and prevents "forum shopping."

KEY UCCJEA CONCEPTS:

1. HOME STATE (Section 201(a)(1)):
The state where the child lived with a parent for at least 6 consecutive months immediately before the abduction. This is the PRIMARY basis for jurisdiction.
• If the child was taken 3 months ago and lived in California for 2 years before that: California is the home state.
• Temporary absences (vacations, visits to the other parent) do not change the home state.

2. SIGNIFICANT CONNECTION (Section 201(a)(2)):
If no state qualifies as the home state, jurisdiction goes to a state with a significant connection to the child AND where substantial evidence is available.

3. EXCLUSIVE CONTINUING JURISDICTION (Section 202):
Once a court makes a custody determination, that court retains exclusive jurisdiction UNTIL:
• The court determines that neither the child nor any parent has a significant connection with the state, OR
• All parties have moved away.
• This means: if you already have a custody order from State X, State X retains jurisdiction even if the child has been taken elsewhere.

4. UCCJEA AND INTERNATIONAL APPLICATION (Section 105):
The UCCJEA treats a foreign country as if it were a US state for jurisdictional purposes. This means:
• A foreign custody order can be recognized — but so can your US order.
• If your US court has home-state jurisdiction, it takes priority over a foreign filing (in the eyes of US courts).
• This section is your tool to argue that the foreign court should defer to the US court.

WHAT YOUR MOTION SHOULD REQUEST:
a) A judicial finding that [STATE] is the child's home state under UCCJEA Section 201(a)(1) or that this Court has exclusive continuing jurisdiction under Section 202.
b) A declaration that any custody proceeding initiated by the taking parent in [FOREIGN COUNTRY / OTHER STATE] should not be recognized because this Court has prior and proper jurisdiction.
c) An order communicating with the foreign court (under Section 110 — interstate/international communication between courts) to inform them that this Court asserts jurisdiction.
d) Emergency temporary jurisdiction (Section 204) if immediate protection is needed (this is a backup if home-state jurisdiction is debatable).
e) All relief from the emergency custody motion (sole custody, travel restriction, passport surrender — see the Emergency Custody Order guide in this knowledge base).

WHAT FACTS TO EMPHASIZE:
• Duration of the child's residence in your state (the longer, the stronger).
• The child's connections: school, doctor, dentist, therapist, friends, extracurriculars, church/community.
• YOUR connections: employment, home, extended family, community ties.
• That the child's absence is due to the wrongful removal/retention — not a voluntary relocation.
• Any existing court orders from this jurisdiction.
• That the taking parent's filing abroad (if any) was made AFTER the wrongful removal and should not be given effect under the UCCJEA.

COMMON MISTAKES:
• Waiting too long to file: If you delay months without asserting jurisdiction, the taking parent may argue the child has acquired a new habitual residence. File IMMEDIATELY.
• Filing in the wrong state: File where the child lived, not where you live now (if different).
• Not addressing the foreign proceeding: If you know the taking parent has filed abroad, you must address it in your motion and ask the court to assert priority jurisdiction.
• Not requesting court-to-court communication: Section 110 allows (and encourages) your judge to communicate directly with the foreign judge. This can be powerful — request it.

INTERNATIONAL ENFORCEMENT:
• A UCCJEA custody order from your home state is the foundation for everything else: Hague applications, embassy requests, INTERPOL coordination, and foreign court recognition.
• Get it apostilled (authenticated for international use) as soon as it is entered.
• Provide certified copies to every agency involved in your case.`
    },
    {
        id: 'kb_uk_icacu_hague_application_guide_v1', entryType: 'procedure',
        name: 'UK: How to Apply Through ICACU (Hague Return / Contact / Enforcement)',
        countryPair: 'UK', resourceType: 'Legal Filing Guide',
        tags: ['uk', 'icacu', 'hague', 'central_authority', 'reunite', 'legal', 'procedure'],
        url: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=24',
        email: 'ICACU@ospt.gov.uk',
        phone: '+44 (203) 681 2756',
        summary: 'Step-by-step guide for UK (England & Wales) parents to apply through the International Child Abduction and Contact Unit (ICACU), including what to prepare and how to coordinate with police and Reunite.',
        fullText: `UK: HOW TO APPLY THROUGH ICACU — HAGUE RETURN / CONTACT / ENFORCEMENT

WHAT IS ICACU?
The International Child Abduction and Contact Unit (ICACU) is the Central Authority for England and Wales under the Hague Convention on International Child Abduction (1980). It processes applications from left-behind parents seeking the return of children wrongfully removed from or retained outside England and Wales, and also handles incoming applications where a child has been brought TO England and Wales.

For Scotland: the Central Authority is the Scottish Government (Justice Directorate).
For Northern Ireland: the Central Authority is the Northern Ireland Courts and Tribunals Service.

CONTACT DETAILS:
• ICACU Email: ICACU@ospt.gov.uk
• ICACU Phone: +44 (203) 681 2756
• Address: International Child Abduction and Contact Unit, Official Solicitor and Public Trustee, Victory House, 30-34 Kingsway, London WC2B 6EX

STEP 1: CONFIRM ELIGIBILITY
• Is the destination country a Hague Convention partner with the UK? Check the HCCH status table.
• Was the child under 16 at the time of removal/retention?
• Was the child habitually resident in England and Wales (or Scotland/NI) immediately before the removal?
• Do you have rights of custody (by court order or by operation of law)?
• Were you exercising those rights at the time?

STEP 2: CONTACT ICACU
• Call or email ICACU as soon as possible. They will guide you through the process and send you the application form.
• You can also contact Reunite International (a UK charity specializing in international child abduction) for free advice and support: https://www.reunite.org | Advice line: +44 (0)116 255 6234.

STEP 3: GATHER YOUR DOCUMENTS
□ Completed ICACU application form
□ Certified copy of any court order relating to custody, residence, or contact
□ Child's birth certificate
□ Recent photograph of the child (within 6 months)
□ Photograph of the taking parent
□ Passport copies (child and taking parent)
□ Marriage certificate / divorce decree (if applicable)
□ Police report (if filed — include crime reference number)
□ Evidence of habitual residence: school records, GP registration, council tax records, tenancy/mortgage, benefit records, nursery enrollment
□ Evidence of the abduction: flight records, communications (texts, WhatsApp, emails), witness statements, social media posts
□ Proof of your custody rights (if no court order: a letter from a solicitor confirming your rights under the Children Act 1989, where both parents with parental responsibility have equal custody rights unless a court orders otherwise)
□ Any evidence of the taking parent's current address or location abroad

STEP 4: SUBMIT YOUR APPLICATION
• Send the completed application and all supporting documents to ICACU by email (ICACU@ospt.gov.uk) and/or post.
• ICACU will review the application for completeness and may request additional information.
• Once satisfied, ICACU will transmit the application to the Central Authority in the destination country.

STEP 5: WHAT HAPPENS NEXT
• The destination country's Central Authority receives the application and initiates proceedings.
• In many countries, the Central Authority will attempt to locate the child and the taking parent, and may attempt mediation before court proceedings begin.
• Court proceedings will be conducted in the destination country. You may need a lawyer there — ICACU or Reunite can help you find one. Legal aid may be available in some countries for Hague cases.
• You may be asked to testify (often by video link).
• Under Article 11, a decision should be made within 6 weeks. If not, you (or ICACU) can request a statement of reasons for the delay.

STEP 6: COORDINATE WITH OTHER AGENCIES
• Police: Report the abduction to your local police force. Request a crime reference number. Ask them to enter the child on the PNC (Police National Computer) as a missing person. If applicable, ask about an INTERPOL Yellow Notice.
• Passport Office: Contact HM Passport Office to request that no new UK passport be issued to the child without your consent. If the child already has a UK passport and you do not have it, report it as lost/stolen to prevent its use.
• Foreign & Commonwealth Development Office (FCDO): If ICACU is handling the Hague application, they will coordinate with the FCDO and the relevant British Embassy/Consulate. You can also contact the FCDO directly for consular assistance.
• Reunite International: Free advice line, mediation services, and support for parents. They can explain the process, help you prepare your application, and connect you with legal resources: https://www.reunite.org | +44 (0)116 255 6234.

STEP 7: IF THE HAGUE DOES NOT APPLY
If the destination country is NOT a Hague partner with the UK:
• ICACU cannot process a Hague application, but they may still be able to offer limited advice.
• Contact Reunite for guidance on non-Hague options (diplomatic channels, local custody filings, mediation, wardship in the High Court).
• Consider applying to the High Court to make the child a Ward of Court — this gives the court broad powers and makes removal from the jurisdiction a contempt of court.
• Contact the FCDO for consular assistance — they may be able to conduct welfare checks and provide information about local legal options.

TIMELINE EXPECTATIONS (UK OUTGOING APPLICATIONS):
• ICACU processing: 1-2 weeks (assuming complete application)
• Transmission to destination country: 1-2 weeks after processing
• Destination country proceedings: highly variable — 4 weeks to 12+ months depending on country
• If return is ordered: enforcement timelines vary by country

KEY TIPS:
• File FAST. The one-year clock under Article 12 is ticking from the date of removal/retention.
• Be thorough with your application. Missing documents cause delays.
• Get legal advice early — Reunite can provide free initial advice, and many solicitors specializing in international child abduction offer urgent consultations.
• Keep a detailed log of all communications, dates, and actions taken.
• Do not attempt "self-help" (re-abducting the child). This is a criminal offense and will destroy your legal case.`
    },
    {
        id: 'kb_eu_brussels_ii_ter_urgent_return_guide_v1', entryType: 'procedure',
        name: 'EU-General: Brussels II ter (Brussels IIb) — Urgent Return & Enforcement Quick Guide',
        countryPair: 'EU-General', resourceType: 'Legal Filing Guide',
        tags: ['eu', 'brussels_iib', 'brussels_ii_ter', 'hague', 'enforcement', 'jurisdiction', 'procedure'],
        url: 'https://online-forms.e-justice.europa.eu/online-forms/matrimonial-matters-forms_en',
        summary: 'For abductions between EU Member States (excluding Denmark), Brussels II ter interacts with Hague and provides additional tools for enforcement and cooperation. Use this to understand what to ask your lawyer/court to do fast.',
        fullText: `EU-GENERAL: BRUSSELS II TER (BRUSSELS IIb) — URGENT RETURN & ENFORCEMENT QUICK GUIDE

WHAT IS BRUSSELS II TER?
Brussels II ter (formally: Council Regulation (EU) 2019/1111, also known as "Brussels IIb" or "the Recast") replaced Brussels IIa (Regulation 2201/2003) on 1 August 2022. It governs jurisdiction, recognition, and enforcement of decisions in matrimonial matters and matters of parental responsibility across EU Member States (excluding Denmark).

For child abduction cases WITHIN the EU, Brussels II ter works ALONGSIDE the Hague Convention 1980 and provides ADDITIONAL tools that make it harder for an abductor to prevent return.

WHO DOES IT APPLY TO?
• Abductions between EU Member States (all EU countries except Denmark).
• It does NOT apply to abductions to/from non-EU countries — those are governed by the Hague Convention alone (or non-Hague strategies if the country is not a Hague partner).
• Post-Brexit: It does NOT apply to UK-EU abductions. The UK is now treated as a non-EU Hague partner.

KEY ADVANTAGES OVER HAGUE ALONE:

1. STRICTER ARTICLE 13(b) — HARDER TO REFUSE RETURN (Article 27(3)):
Under Brussels II ter, a court in the destination EU country CANNOT refuse return under Article 13(b) (grave risk) if "adequate arrangements have been made to ensure the protection of the child after return." This means: if you offer undertakings (safe harbor measures) and show that your home country has protective mechanisms, the 13(b) defense is much harder for the abductor to win.

2. THE "OVERRIDE" MECHANISM — HOME COURT GETS FINAL SAY (Article 29):
If the destination country court REFUSES to return the child (e.g., under Article 13(b)):
• That court MUST transmit the case file to the court of the child's habitual residence (your home country) within ONE MONTH.
• Your home country court then examines the case and can ORDER THE RETURN — issuing a "certified decision" under Article 47.
• This certified decision is DIRECTLY ENFORCEABLE in the destination country. The destination country courts CANNOT refuse to enforce it.
• This is the "trump card" — even if you lose in the destination country, your home court can override.

3. FASTER TIMELINES (Article 24):
• First-instance court in the destination country: must decide within 6 WEEKS of the application being lodged with the court.
• Appellate court (if the decision is appealed): must decide within 6 WEEKS.
• These are hard deadlines. If they are missed, either party (or the Central Authority) can request a statement of reasons for the delay.

4. HEARING THE CHILD (Article 26):
• The child must be given the opportunity to express their views during the proceedings, unless it is inappropriate having regard to their age or degree of maturity.
• This is a right of the child, not a tool for the abductor. Courts should ensure the child is not coached.

5. DIRECT ENFORCEMENT — NO EXEQUATUR (Article 34-35):
• Decisions certified under Brussels II ter are enforceable in other EU Member States WITHOUT a declaration of enforceability (no exequatur required).
• This means: once your home court issues a certified return order, you take it directly to the enforcement authority in the destination country.

WHAT TO ASK YOUR LAWYER / COURT TO DO:

PHASE 1: IMMEDIATE (First 48 Hours)
a) File the Hague return application through your Central Authority as normal.
b) Simultaneously, ensure your lawyer in the destination country CITES Brussels II ter (not just Hague) in all filings.
c) Request provisional/protective measures under Article 15: the destination court can order measures to protect the child pending the return decision (e.g., supervised contact, travel ban, passport surrender).

PHASE 2: AT THE HEARING (Within 6 Weeks)
a) Argue that Article 13(b) cannot succeed because adequate protective measures are available in your home country (Article 27(3)). Prepare undertakings.
b) Request that the court comply with the 6-week timeline (Article 24).
c) If the child is heard, request independent assessment to prevent coaching influence.

PHASE 3: IF YOU WIN — ENFORCEMENT
a) Request immediate enforcement. Under Brussels II ter, the decision is directly enforceable.
b) If the abductor does not comply, request enforcement measures available under the destination country's law (e.g., in Germany: Ordnungsgeld, Zwangshaft; in France: astreinte, huissier de justice).
c) Request that the court set a specific date for handover and designate the method (e.g., at a specific location, with police presence).

PHASE 4: IF YOU LOSE — THE OVERRIDE
a) If the destination court refuses return: your lawyer in the HOME country must be ready to act immediately.
b) Under Article 29, the destination court must transmit the file to your home court within 1 month.
c) Your home court examines the case, hears from both parties, and may order the return.
d) If return is ordered: the home court issues a "Certificate" under Article 47.
e) This Certificate is directly enforceable in the destination country — no further court proceedings needed.
f) Take the Certificate to the destination country's enforcement authority.

IMPORTANT FORMS:
• Brussels II ter includes standardized forms (Annexes) for certificates, enforcement requests, and information exchange between courts.
• Access them at: https://online-forms.e-justice.europa.eu/online-forms/matrimonial-matters-forms_en
• Your lawyer should use these forms to ensure the decision is immediately recognized and enforceable across the EU.

CENTRAL AUTHORITY COOPERATION (Article 76-84):
• Central Authorities in EU Member States have enhanced cooperation obligations under Brussels II ter.
• They must assist in locating the child, facilitating mediation, exchanging information, and coordinating with courts.
• If your Central Authority is slow, you can request court-to-court direct communication under Article 86.

COMMON PITFALLS:
• Not citing Brussels II ter: Many lawyers still file under Hague alone. Brussels II ter gives you stronger tools — make sure it is cited.
• Accepting delay: The 6-week deadlines are binding. If they are not met, formally request a statement of reasons (Article 24(2)).
• Not preparing for the override: If you lose in the destination country, you must act FAST in your home country. Have your home lawyer on standby from day one.
• Not using provisional measures: Article 15 allows protective measures even before the return decision. Use them to prevent the abductor from moving the child again.`
    }
    ];

    const [activeTab, setActiveTab] = useState('all');

    // Categories derived from entryType
    const categories: { key: string; label: string; types: string[] }[] = [
        { key: 'all', label: `All (${seedData.length})`, types: [] },
        { key: 'templates', label: 'Email & Letter Templates', types: ['template'] },
        { key: 'procedures', label: 'Step-by-Step Guides', types: ['procedure'] },
        { key: 'countries', label: 'Country Strategies', types: ['country_matrix'] },
        { key: 'legal', label: 'Legal Resources', types: ['resource'] },
        { key: 'guidance', label: 'Strategy & Guidance', types: ['guidance'] },
        { key: 'prevention', label: 'Prevention', types: ['prevention', 'opsec'] },
    ];

    const filtered = seedData.filter(e => {
        const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) || e.countryPair?.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'all' || categories.find(c => c.key === activeTab)?.types.includes(e.entryType);
        return matchesSearch && matchesTab;
    });

    const tabCounts: Record<string, number> = {};
    categories.forEach(c => {
        tabCounts[c.key] = c.key === 'all' ? seedData.length : seedData.filter(e => c.types.includes(e.entryType)).length;
    });

    return (
        <div style={{ cursor: 'default' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: '0.25rem' }}>Guides & Templates Library</h2>
                <p style={{ margin: 0 }}>{seedData.length} resources — legal templates, country strategies, step-by-step procedures, and more.</p>
            </div>

            <input type="text" placeholder="Search by name, tag, or country..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem', width: '100%' }} />

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {categories.filter(c => tabCounts[c.key] > 0).map(c => (
                    <button key={c.key} onClick={() => setActiveTab(c.key)} style={{
                        padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: activeTab === c.key ? 600 : 400,
                        borderRadius: '100px', cursor: 'pointer', border: '1px solid ' + (activeTab === c.key ? 'var(--accent)' : 'var(--border-default)'),
                        background: activeTab === c.key ? 'var(--accent-muted)' : 'var(--surface-card)',
                        color: activeTab === c.key ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                        {c.label} {c.key !== 'all' && <span style={{ opacity: 0.6 }}>({tabCounts[c.key]})</span>}
                    </button>
                ))}
            </div>

            {/* Results count */}
            {search && <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>}

            {/* Entry Grid */}
            <div className="tools-grid">
                {filtered.map(entry => (
                    <div key={entry.id} className="tool-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedEntry(entry)}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.3rem' }}>
                            {entry.resourceType} {entry.countryPair && entry.countryPair !== 'Global' && entry.countryPair !== 'General' ? `· ${entry.countryPair}` : ''}
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.3 }}>{entry.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.5rem', flex: 1 }}>{entry.summary?.substring(0, 140)}{(entry.summary?.length || 0) > 140 ? '...' : ''}</p>
                        {(entry.phone || entry.email) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>
                                {entry.phone && <span>{entry.phone}</span>}
                                {entry.phone && entry.email && <span> · </span>}
                                {entry.email && <span>{entry.email}</span>}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {entry.tags?.slice(0, 4).map(t => <span key={t} className="journal-badge" style={{ fontSize: '0.6rem' }}>{t}</span>)}
                            {(entry.tags?.length || 0) > 4 && <span style={{ fontSize: '0.6rem', color: 'var(--text-hint)' }}>+{(entry.tags?.length || 0) - 4}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0' }}>No results found. Try a different search or category.</p>}

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="tour-backdrop" onClick={() => setSelectedEntry(null)}>
                    <div className="tour-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="tour-header">
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                    {selectedEntry.resourceType} {selectedEntry.countryPair && selectedEntry.countryPair !== 'Global' && selectedEntry.countryPair !== 'General' ? `· ${selectedEntry.countryPair}` : ''}
                                </div>
                                <h3 style={{ margin: 0 }}>{selectedEntry.name}</h3>
                            </div>
                            <button className="tour-close" onClick={() => setSelectedEntry(null)}>×</button>
                        </div>
                        {selectedEntry.summary && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{selectedEntry.summary}</p>}
                        {(selectedEntry.phone || selectedEntry.email || selectedEntry.url) && (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.6rem 0.75rem', background: 'var(--surface-raised)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                                {selectedEntry.phone && <span>📞 {selectedEntry.phone}</span>}
                                {selectedEntry.email && <span>📧 {selectedEntry.email}</span>}
                                {selectedEntry.url && <a href={selectedEntry.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>🔗 Official Link →</a>}
                            </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: "'SF Mono', Consolas, monospace", fontSize: '0.82rem', backgroundColor: 'var(--surface-raised)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', lineHeight: 1.55, border: '1px solid var(--border-subtle)' }}>
                            {selectedEntry.fullText || "Content preview not available."}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {selectedEntry.tags?.map(t => <span key={t} className="journal-badge" style={{ fontSize: '0.6rem' }}>{t}</span>)}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="button-secondary" onClick={() => { navigator.clipboard.writeText(selectedEntry.fullText || ''); alert('Copied to clipboard!'); }}>Copy Template</button>
                                <button className="button-primary" onClick={() => setSelectedEntry(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ... (Rest of file remains unchanged, just ensuring the new components are used)
const ExpensesTracker: React.FC = () => {
   // ... (No changes needed here)
   const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [newExp, setNewExp] = useState<Partial<ExpenseEntry>>({ category: 'Legal', currency: 'USD' });

    useEffect(() => {
        const saved = localStorage.getItem('caseExpenses');
        if (saved) setExpenses(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('caseExpenses', JSON.stringify(expenses));
        if (auth.currentUser && expenses.length > 0) {
            setDoc(doc(db, `users/${auth.currentUser.uid}/data/expenses`), { items: expenses }).catch(() => {});
        }
    }, [expenses]);

    const addExpense = () => {
        if (!newExp.description || !newExp.amount) return;
        const entry: ExpenseEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            description: newExp.description,
            amount: Number(newExp.amount),
            currency: newExp.currency || 'USD',
            category: newExp.category as any
        };
        setExpenses([entry, ...expenses]);
        setNewExp({ category: 'Legal', currency: 'USD', description: '', amount: '' as any });
    };

    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    const exportExpensePDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text("EXPENSE LOG — CHILD RECOVERY", 10, 13);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 28);
        doc.text(`Total: $${total.toFixed(2)}`, 140, 28);

        let y = 40;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("DATE", 10, y); doc.text("CATEGORY", 40, y); doc.text("DESCRIPTION", 80, y); doc.text("AMOUNT", 170, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        doc.setDrawColor(200); doc.line(10, y, 200, y); y += 4;

        expenses.forEach(exp => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(exp.date, 10, y);
            doc.text(exp.category, 40, y);
            const descLines = doc.splitTextToSize(exp.description, 80);
            doc.text(descLines, 80, y);
            doc.text(`$${exp.amount.toFixed(2)}`, 170, y);
            y += Math.max(descLines.length * 4.5, 6) + 2;
        });

        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL: $${total.toFixed(2)}`, 10, y);
        doc.save("Case_Expenses.pdf");
    };

    const deleteExpense = (id: string) => {
        if (confirm("Delete this expense?")) {
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Expense Tracker</h2>
                {expenses.length > 0 && <button className="button-secondary" onClick={exportExpensePDF}>🖨️ Export PDF</button>}
            </div>
            <div className="form-grid">
                <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value as any})}>
                    <option>Legal</option>
                    <option>Travel</option>
                    <option>Investigation</option>
                    <option>Administrative</option>
                </select>
                <input type="number" placeholder="Amount" value={newExp.amount || ''} onChange={e => setNewExp({...newExp, amount: e.target.value as any})} />
                <input type="text" placeholder="Description (e.g. Flight to Tokyo)" value={newExp.description || ''} onChange={e => setNewExp({...newExp, description: e.target.value})} className="full-width" />
                <button className="button-primary full-width" onClick={addExpense}>Log Expense</button>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
                <h3>Total: ${total.toFixed(2)}</h3>
                {expenses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-raised)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.95rem' }}>Log every dollar you spend — legal fees, flights, hotels, translators, private investigators. Under the Hague Convention, you may be able to claim restitution for these costs. The more detailed your records, the stronger your claim.</p>
                    </div>
                )}
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                            <th style={{ padding: '0.5rem' }}>Date</th>
                            <th style={{ padding: '0.5rem' }}>Desc</th>
                            <th style={{ padding: '0.5rem' }}>Cat</th>
                            <th style={{ padding: '0.5rem' }}>Amt</th>
                            <th style={{ padding: '0.5rem', width: '30px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '0.5rem' }}>{e.date}</td>
                                <td style={{ padding: '0.5rem' }}>{e.description}</td>
                                <td style={{ padding: '0.5rem' }}>{e.category}</td>
                                <td style={{ padding: '0.5rem' }}>${e.amount}</td>
                                <td style={{ padding: '0.5rem' }}><button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a' }}>🗑️</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
// --- LIVE GUIDE TOOL DECLARATIONS (for Gemini function calling) ---
const liveGuideTools = [
    {
        name: 'add_task',
        description: 'Add a new task to the parent\'s action plan. Use this when they mention something they need to do, or when you suggest an action step.',
        parameters: {
            type: 'OBJECT',
            properties: {
                task: { type: 'STRING', description: 'Short task description' },
                description: { type: 'STRING', description: 'Detailed explanation of what to do' },
                priority: { type: 'STRING', enum: ['Immediate', 'High', 'Medium', 'Low'] },
                category: { type: 'STRING', description: 'Category like Legal, Government, Investigation, etc.' }
            },
            required: ['task', 'priority', 'category']
        }
    },
    {
        name: 'log_evidence',
        description: 'Log a call, email, meeting, or event to the case journal. Use when the parent describes something that happened.',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: { type: 'STRING', enum: ['Phone Call', 'Email', 'In-Person', 'Police Interaction', 'Court', 'Sighting', 'Other'] },
                description: { type: 'STRING', description: 'What happened' },
                peopleInvolved: { type: 'STRING', description: 'Who was involved' }
            },
            required: ['type', 'description']
        }
    },
    {
        name: 'add_contact',
        description: 'Save a new contact (lawyer, agent, official, etc.) to the contact list.',
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'Person\'s name' },
                role: { type: 'STRING', description: 'Their role (e.g., FBI Agent, Family Lawyer, etc.)' },
                email: { type: 'STRING', description: 'Email if mentioned' },
                phone: { type: 'STRING', description: 'Phone if mentioned' },
                notes: { type: 'STRING', description: 'Any context about this contact' }
            },
            required: ['name', 'role']
        }
    },
    {
        name: 'navigate_to',
        description: 'Open a specific page in the app for the parent. Use when they ask to see something or when you want to show them a relevant tool.',
        parameters: {
            type: 'OBJECT',
            properties: {
                page: { type: 'STRING', enum: ['dashboard', 'myChecklist', 'taskBrainstormer', 'caseJournal', 'documentVault', 'correspondence', 'expenses', 'contactList', 'knowledgeBase', 'campaignBuilder', 'supportResources'] }
            },
            required: ['page']
        }
    },
    {
        name: 'log_expense',
        description: 'Log an expense related to the recovery case.',
        parameters: {
            type: 'OBJECT',
            properties: {
                description: { type: 'STRING', description: 'What the expense was for' },
                amount: { type: 'NUMBER', description: 'Amount in dollars' },
                category: { type: 'STRING', enum: ['Legal', 'Travel', 'Investigation', 'Administrative', 'Other'] }
            },
            required: ['description', 'amount', 'category']
        }
    }
];

interface LiveGuideProps {
    profile: CaseProfile;
    items: ActionItem[];
    onAddTask: (task: ActionItem) => void;
    onNavigate: (view: View) => void;
}

const LiveGuide: React.FC<LiveGuideProps> = ({ profile, items, onAddTask, onNavigate }) => {
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [actionLog, setActionLog] = useState<{ icon: string; text: string }[]>([]);

    const inputCtxRef = useRef<AudioContext | null>(null);
    const outputCtxRef = useRef<AudioContext | null>(null);
    const outputGainRef = useRef<GainNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const websocketRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const mutedRef = useRef(false);

    useEffect(() => { mutedRef.current = muted; }, [muted]);

    useEffect(() => {
        return () => {
            websocketRef.current?.close();
            streamRef.current?.getTracks().forEach(t => t.stop());
            if (inputCtxRef.current?.state !== 'closed') inputCtxRef.current?.close();
            if (outputCtxRef.current?.state !== 'closed') outputCtxRef.current?.close();
        };
    }, []);

    const logAction = (icon: string, text: string) => {
        setActionLog(prev => [{ icon, text }, ...prev].slice(0, 20));
    };

    const handleToolCall = (fc: any) => {
        try {
            const args = fc.args || {};
            switch (fc.name) {
                case 'add_task': {
                    const newTask: ActionItem = {
                        id: Date.now().toString(),
                        category: args.category || 'General',
                        task: args.task || 'New Task',
                        description: args.description || '',
                        priority: args.priority || 'High',
                        completed: false
                    };
                    onAddTask(newTask);
                    logAction('📋', `Added task: ${newTask.task}`);
                    break;
                }
                case 'log_evidence': {
                    const entry: LogEntry = {
                        id: Date.now().toString(),
                        date: new Date().toLocaleDateString('en-CA'),
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                        type: args.type || 'Other',
                        description: args.description || '',
                        peopleInvolved: args.peopleInvolved || '',
                        createdAt: new Date().toISOString()
                    };
                    // Save to localStorage directly (CaseJournal reads from there)
                    try {
                        const existing: LogEntry[] = JSON.parse(localStorage.getItem('caseLogs') || '[]');
                        localStorage.setItem('caseLogs', JSON.stringify([entry, ...existing]));
                    } catch {}
                    logAction('🗂️', `Logged: ${args.type} — ${(args.description || '').substring(0, 60)}...`);
                    break;
                }
                case 'add_contact': {
                    const contact: ContactEntry = {
                        id: Date.now().toString(),
                        name: args.name || 'Unknown',
                        role: args.role || '',
                        email: args.email || '',
                        phone: args.phone || '',
                        notes: args.notes || ''
                    };
                    try {
                        const existing: ContactEntry[] = JSON.parse(localStorage.getItem('caseContacts') || '[]');
                        localStorage.setItem('caseContacts', JSON.stringify([contact, ...existing]));
                    } catch {}
                    logAction('📇', `Added contact: ${contact.name} (${contact.role})`);
                    break;
                }
                case 'navigate_to': {
                    if (args.page) {
                        onNavigate(args.page as View);
                        logAction('🔗', `Opened: ${args.page}`);
                    }
                    break;
                }
                case 'log_expense': {
                    const expense: ExpenseEntry = {
                        id: Date.now().toString(),
                        date: new Date().toLocaleDateString('en-CA'),
                        description: args.description || '',
                        amount: Number(args.amount) || 0,
                        currency: 'USD',
                        category: args.category || 'Other'
                    };
                    try {
                        const existing: ExpenseEntry[] = JSON.parse(localStorage.getItem('caseExpenses') || '[]');
                        localStorage.setItem('caseExpenses', JSON.stringify([expense, ...existing]));
                    } catch {}
                    logAction('💰', `Logged expense: $${expense.amount} — ${expense.description}`);
                    break;
                }
            }
            return 'ok';
        } catch (e) {
            return 'error: ' + e;
        }
    };

    const connect = async () => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Dual AudioContext: 16kHz in, 24kHz out
            inputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            // Output chain: gain → analyser → speakers
            outputGainRef.current = outputCtxRef.current.createGain();
            analyserRef.current = outputCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            outputGainRef.current.connect(analyserRef.current);
            analyserRef.current.connect(outputCtxRef.current.destination);

            // Input visualizer (separate analyser on input context)
            const inputAnalyser = inputCtxRef.current.createAnalyser();
            const inputSource = inputCtxRef.current.createMediaStreamSource(streamRef.current);
            inputSource.connect(inputAnalyser);
            drawVisualizer(inputAnalyser);

            const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.API_KEY}`);
            websocketRef.current = ws;

            // Build system instruction with case context
            const activeTasks = items.filter(i => !i.completed).slice(0, 5).map(t => `- [${t.priority}] ${t.task}`).join('\n');
            const systemInstruction = `You are a compassionate, knowledgeable recovery assistant helping a parent whose child has been internationally abducted. Speak like a calm, experienced advisor — not a robot, not a therapist. Be direct and action-oriented.

CASE CONTEXT:
- Child's Name: ${profile.childName || 'Unknown'}
- Taken From: ${profile.fromCountry || 'Unknown'} → To: ${profile.toCountry || 'Unknown'}
- Custody Status: ${profile.custodyStatus || 'Unknown'}
- Abductor: ${profile.abductorRelationship || 'Unknown'}
${profile.abductionDate ? `- Date: ${profile.abductionDate} (Day ${Math.floor((new Date().getTime() - new Date(profile.abductionDate).getTime()) / (1000 * 3600 * 24))})` : ''}

CURRENT ACTIVE TASKS:
${activeTasks || 'None yet'}

CAPABILITIES — You can take ACTIONS for the parent using your tools:
- add_task: Add action items to their checklist
- log_evidence: Record calls, emails, meetings, sightings in their case journal
- add_contact: Save lawyers, agents, officials to their contacts
- navigate_to: Open app pages to show them relevant tools
- log_expense: Track money spent on the recovery

BEHAVIOR:
- When they tell you about something that happened (a call, meeting, email), LOG IT using log_evidence
- When they mention a person by name and role, SAVE THEM using add_contact
- When you suggest they should do something, ADD IT as a task using add_task
- When they ask to see something, NAVIGATE THEM using navigate_to
- When they mention spending money, LOG IT using log_expense
- Always tell them what you did: "I've added that to your task list" or "I logged that call in your journal"
- Keep responses concise. They're stressed. Don't monologue.
- If they're emotional, acknowledge it briefly, then guide them to the next concrete step.`;

            ws.onopen = () => {
                setConnected(true);
                setLogs(prev => [...prev, "Connected. Tell me what's going on."]);

                // Setup with tools and system instruction
                ws.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
                        generation_config: {
                            response_modalities: ["AUDIO"],
                            temperature: 0.7
                        },
                        system_instruction: {
                            parts: [{ text: systemInstruction }]
                        },
                        tools: [{ function_declarations: liveGuideTools }]
                    }
                }));
            };

            ws.onmessage = async (event) => {
                // Handle text/JSON messages (tool calls come as JSON)
                if (typeof event.data === 'string') {
                    try {
                        const msg = JSON.parse(event.data);

                        // Handle tool calls
                        if (msg.toolCall) {
                            const responses: any[] = [];
                            for (const fc of (msg.toolCall.functionCalls || [])) {
                                const result = handleToolCall(fc);
                                responses.push({ id: fc.id, name: fc.name, response: { output: result } });
                            }
                            // Send tool responses back
                            ws.send(JSON.stringify({ tool_response: { function_responses: responses } }));
                        }

                        // Handle audio in JSON envelope
                        const audioPart = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData?.data);
                        if (audioPart && outputCtxRef.current && outputGainRef.current) {
                            const audioBytes = decode(audioPart.inlineData.data);
                            const audioBuffer = await decodeAudioData(audioBytes, outputCtxRef.current, 24000, 1);
                            const bufferSource = outputCtxRef.current.createBufferSource();
                            bufferSource.buffer = audioBuffer;
                            bufferSource.connect(outputGainRef.current);
                            bufferSource.addEventListener('ended', () => sourcesRef.current.delete(bufferSource));
                            nextStartRef.current = Math.max(nextStartRef.current, outputCtxRef.current.currentTime);
                            bufferSource.start(nextStartRef.current);
                            nextStartRef.current += audioBuffer.duration;
                            sourcesRef.current.add(bufferSource);
                        }

                        // Handle interruption
                        if (msg.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
                            sourcesRef.current.clear();
                            nextStartRef.current = 0;
                        }
                    } catch {}
                }

                // Handle raw binary audio (some responses come as Blob)
                if (event.data instanceof Blob) {
                    try {
                        const arrayBuffer = await event.data.arrayBuffer();
                        if (outputCtxRef.current && outputGainRef.current) {
                            const audioBuffer = await decodeAudioData(new Uint8Array(arrayBuffer), outputCtxRef.current, 24000, 1);
                            const bufferSource = outputCtxRef.current.createBufferSource();
                            bufferSource.buffer = audioBuffer;
                            bufferSource.connect(outputGainRef.current);
                            bufferSource.addEventListener('ended', () => sourcesRef.current.delete(bufferSource));
                            nextStartRef.current = Math.max(nextStartRef.current, outputCtxRef.current.currentTime);
                            bufferSource.start(nextStartRef.current);
                            nextStartRef.current += audioBuffer.duration;
                            sourcesRef.current.add(bufferSource);
                        }
                    } catch {}
                }
            };

            ws.onerror = () => setLogs(prev => [...prev, "Connection error."]);
            ws.onclose = () => { setConnected(false); setLogs(prev => [...prev, "Session ended."]); };

            // Mic capture: PCM 16-bit → base64 → WebSocket
            const scriptProcessor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
            const micSource = inputCtxRef.current.createMediaStreamSource(streamRef.current);

            scriptProcessor.onaudioprocess = (e) => {
                if (mutedRef.current) return;
                if (ws.readyState !== WebSocket.OPEN) return;
                const input = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
                }
                const base64 = encode(new Uint8Array(pcm.buffer));
                ws.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: "audio/pcm;rate=16000", data: base64 }] } }));
            };
            micSource.connect(scriptProcessor);
            scriptProcessor.connect(inputCtxRef.current.destination);

        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, "Failed to connect. Check microphone permissions."]);
        }
    };

    const disconnect = () => {
        websocketRef.current?.close();
        streamRef.current?.getTracks().forEach(t => t.stop());
        sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
        sourcesRef.current.clear();
        if (inputCtxRef.current?.state !== 'closed') inputCtxRef.current?.close();
        if (outputCtxRef.current?.state !== 'closed') outputCtxRef.current?.close();
        setConnected(false);
        nextStartRef.current = 0;
    };

    const drawVisualizer = (analyser: AnalyserNode) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            if (!ctx) return;
            ctx.fillStyle = '#f0f2f8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = connected ? '#1e3a5f' : '#a0aec0';
            ctx.beginPath();
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };
        draw();
    };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2>Talk to AI</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Tell me what's happening. I can add tasks, log evidence, save contacts, and track expenses — just by listening.</p>

            <canvas ref={canvasRef} className="audio-visualizer" width="600" height="80" style={{ borderRadius: '12px', border: '1px solid var(--border-default)' }}></canvas>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {!connected ? (
                    <button className="button-primary" onClick={connect} style={{ flex: 1 }}>🎙️ Start Voice Session</button>
                ) : (
                    <>
                        <button className={muted ? 'button-primary' : 'button-secondary'} onClick={() => setMuted(!muted)} style={{ minWidth: '120px' }}>
                            {muted ? '🔇 Unmute' : '🎤 Muted'}
                        </button>
                        <button className="button-secondary" onClick={disconnect} style={{ minWidth: '100px' }}>⏹ End</button>
                    </>
                )}
            </div>

            {/* Action log — shows what AI did */}
            {actionLog.length > 0 && (
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Actions Taken</div>
                    {actionLog.slice(0, 8).map((a, i) => (
                        <div key={i} style={{ fontSize: '0.85rem', padding: '0.25rem 0', color: '#374151', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                            <span>{a.icon}</span><span>{a.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Status log */}
            {logs.length > 0 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {logs.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
                </div>
            )}

            {connected && (
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Try saying:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {[
                            "I just spoke with my lawyer",
                            "Add a task to file the Hague application",
                            "Show me my tasks",
                            "I spent $500 on legal fees",
                            "What should I do next?"
                        ].map((s, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'var(--surface-active)', borderRadius: '100px', color: 'var(--text-secondary)' }}>{s}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const EMAIL_TEMPLATES = [
    { id: 'custom', label: 'Custom (Blank)', recipient: '', topic: '', tone: 'Firm', instructions: '' },
    { id: 'police-followup', label: 'Police Report Follow-Up', recipient: 'Investigating Officer / Police Department', topic: 'Follow-up on Missing Child Report', tone: 'Firm & Legal', instructions: 'Request status update on the police report. Ask if the child has been entered into NCIC and Interpol databases. Request the case number if not already provided.' },
    { id: 'central-authority', label: 'State Dept / Central Authority', recipient: 'Office of Children\'s Issues / Central Authority', topic: 'Hague Convention Application Status', tone: 'Firm & Legal', instructions: 'Inquire about the status of a Hague Convention return application. Reference any case numbers. Ask about timeline and next steps.' },
    { id: 'lawyer', label: 'Lawyer Engagement', recipient: 'Family Law Attorney', topic: 'Engagement for International Child Abduction Case', tone: 'Neutral Update', instructions: 'Initial outreach to a lawyer specializing in international family law. Briefly explain the situation and request a consultation. Ask about their experience with Hague Convention cases.' },
    { id: 'embassy', label: 'Embassy / Consulate Inquiry', recipient: 'Embassy / Consulate of [Country]', topic: 'Welfare Check / Consular Assistance for Abducted Child', tone: 'Pleading & Urgent', instructions: 'Request a welfare and whereabouts check on the child. Ask about consular notification and what assistance they can provide. Reference any passport or citizenship information.' },
    { id: 'records', label: 'School / Medical Records', recipient: 'School Administrator / Medical Provider', topic: 'Request for Records Transfer / Information Hold', tone: 'Polite Follow-up', instructions: 'Request that no records be released or transferred without your written consent. Ask for copies of any transfer requests that have been received. Provide custody documentation context.' }
];

const CorrespondenceHelper: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [draft, setDraft] = useState('');
    const [recipient, setRecipient] = useState('');
    const [topic, setTopic] = useState('');
    const [context, setContext] = useState('');
    const [includeOverview, setIncludeOverview] = useState(true);
    const [tone, setTone] = useState('Firm');
    const [generating, setGenerating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    const applyTemplate = (templateId: string) => {
        const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            if (templateId !== 'custom') {
                setRecipient(template.recipient);
                setTopic(template.topic);
                setTone(template.tone);
            }
        }
    };

    const generateDraft = async () => {
        setGenerating(true);
        try {
            const ragContext = await getRagContext();
            const prompt = `
            Draft an email as the PARENT (${profile.parentRole}).
            
            To: ${recipient}
            Regarding: ${topic}
            Child: ${profile.childName}
            Missing from: ${profile.fromCountry} to ${profile.toCountry}
            Abduction Date: ${profile.abductionDate}
            Case IDs: ${JSON.stringify(profile.caseNumbers || {})}
            
            Tone: ${tone}
            
            Goal / Additional Context / Past Email to Reply to: 
            "${context}"
            
            ${ragContext}
            
            Instructions:
            ${includeOverview ? "- Start with a standard paragraph stating the child's name, abduction date, and location." : "- Do NOT include the standard intro paragraph."}
            - Ensure the subject line includes Case IDs if available.
            - USE THE REFERENCE DOCUMENTS PROVIDED (if any) to add specific dates/facts where relevant.
            - Keep it professional, clear, and action-oriented.
            ${selectedTemplate !== 'custom' ? `\n            TEMPLATE-SPECIFIC INSTRUCTIONS:\n            ${EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)?.instructions || ''}` : ''}
            `;
            
            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt
            });
            setDraft((result.text as string) || '');
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Comms HQ</h2>
            <p>Draft professional emails to lawyers, police, and government agencies. Select a template or start from scratch.</p>

            <div className="template-selector">
                {EMAIL_TEMPLATES.map(t => (
                    <button key={t.id} className={`template-chip ${selectedTemplate === t.id ? 'active' : ''}`} onClick={() => applyTemplate(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                     <label>To Who? (Recipient)</label>
                     <input type="text" placeholder="e.g. FBI Agent Smith, State Dept Desk Officer" value={recipient} onChange={e => setRecipient(e.target.value)} />
                </div>
                
                <div style={{ gridColumn: '1 / -1' }}>
                     <label>About What? (Topic)</label>
                     <input type="text" placeholder="e.g. Requesting update on case number, Forwarding new evidence" value={topic} onChange={e => setTopic(e.target.value)} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                     <label>Paste Previous Email or Context</label>
                     <textarea placeholder="Paste the email you received, or describe what you want to say..." value={context} onChange={e => setContext(e.target.value)} rows={4} />
                </div>

                <div className="full-width" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface-raised)', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={includeOverview} onChange={e => setIncludeOverview(e.target.checked)} /> 
                        <strong>Include Case Overview?</strong> 
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(Auto-adds: "{profile.childName} was taken on...")</span>
                    </label>
                    
                    <div>
                        <label>Tone</label>
                        <select value={tone} onChange={e => setTone(e.target.value)}>
                            <option>Firm & Legal</option>
                            <option>Pleading & Urgent</option>
                            <option>Neutral Update</option>
                            <option>Polite Follow-up</option>
                        </select>
                    </div>
                </div>

                <button className="button-ai full-width" onClick={generateDraft} disabled={generating}>
                    {generating ? 'Reading documents & Drafting...' : '✨ Generate Email Draft'}
                </button>
            </div>
            
            {draft && (
                <div className="draft-preview" style={{ marginTop: '2rem' }}>
                    <h3>Generated Draft</h3>
                    <textarea value={draft} rows={15} className="full-width" style={{ fontFamily: 'monospace', padding: '1rem' }} readOnly />
                    <button className="button-secondary" onClick={() => navigator.clipboard.writeText(draft)} style={{ marginTop: '0.5rem' }}>Copy to Clipboard</button>
                </div>
            )}
        </div>
    );
};

const CaseSettings: React.FC<{ profile: CaseProfile, setProfile: (p: CaseProfile) => void }> = ({ profile, setProfile }) => {
    const [nums, setNums] = useState(profile.caseNumbers || {});
    const [newKey, setNewKey] = useState('');
    const [newVal, setNewVal] = useState('');
    const [editProfile, setEditProfile] = useState(profile);

    const addNum = () => {
        if (newKey && newVal) {
            const updated = { ...nums, [newKey]: newVal };
            setNums(updated);
            setProfile({ ...profile, caseNumbers: updated });
            setNewKey(''); setNewVal('');
        }
    };

    const saveProfile = () => {
        setProfile(editProfile);
        alert("Profile Updated");
    };

    const handlePrintSummary = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(179, 38, 30); // Crisis Red
        doc.text("CASE SUMMARY: INTERNATIONAL ABDUCTION", 10, 20);
        
        // Child Info
        doc.setFontSize(14);
        doc.setTextColor(0,0,0);
        doc.text(`Child: ${profile.childName}`, 10, 40);
        if(profile.childDOB) doc.text(`DOB: ${profile.childDOB}`, 100, 40);
        
        doc.setFontSize(12);
        doc.text(`Missing From: ${profile.fromCountry}`, 10, 55);
        doc.text(`Taken To: ${profile.toCountry}`, 100, 55);
        doc.text(`Date Taken: ${profile.abductionDate}`, 10, 65);
        
        // Case Numbers
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("CASE IDENTIFIERS:", 10, 85);
        doc.setFont("helvetica", "normal");
        
        let y = 95;
        Object.entries(profile.caseNumbers || {}).forEach(([k, v]) => {
            doc.text(`${k}: ${v}`, 10, y);
            y += 8;
        });
        
        if(y < 95) y = 95;
        
        // Summary / Context
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("SITUATION SUMMARY:", 10, y);
        y += 10;
        doc.setFont("helvetica", "normal");
        const summary = `${profile.childName} was taken by the ${profile.abductorRelationship || 'other parent'} on ${profile.abductionDate}. Legal custody status at time of taking was: ${profile.custodyStatus}. \n\n${profile.additionalContext || ''}`;
        const lines = doc.splitTextToSize(summary, 180);
        doc.text(lines, 10, y);
        
        doc.save(`${profile.childName}_Case_Summary.pdf`);
    };

    const handleFullCaseExport = async () => {
        const pdf = new jsPDF();
        let y = 10;
        const addPage = () => { pdf.addPage(); y = 15; };
        const checkPage = (needed: number) => { if (y + needed > 280) addPage(); };

        // --- PAGE 1: CASE SUMMARY ---
        pdf.setFillColor(30, 58, 95);
        pdf.rect(0, 0, 210, 25, 'F');
        pdf.setFontSize(18); pdf.setTextColor(255, 255, 255);
        pdf.text("FULL CASE FILE", 10, 16);
        pdf.setFontSize(8); pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 16);
        y = 35;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
        pdf.text(`Child: ${profile.childName}`, 10, y); y += 7;
        pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
        if (profile.childDOB) { pdf.text(`DOB: ${profile.childDOB}`, 10, y); y += 5; }
        pdf.text(`Missing From: ${profile.fromCountry} → Taken To: ${profile.toCountry}`, 10, y); y += 5;
        pdf.text(`Date Taken: ${profile.abductionDate}`, 10, y); y += 5;
        pdf.text(`Custody: ${profile.custodyStatus}`, 10, y); y += 8;
        Object.entries(profile.caseNumbers || {}).forEach(([k, v]) => { pdf.text(`${k}: ${v}`, 10, y); y += 5; });
        if (profile.additionalContext) {
            y += 3; pdf.setFont("helvetica", "bold"); pdf.text("Context:", 10, y); y += 5;
            pdf.setFont("helvetica", "normal");
            const ctxLines = pdf.splitTextToSize(profile.additionalContext, 185);
            pdf.text(ctxLines, 10, y); y += ctxLines.length * 4 + 5;
        }

        // --- ACTION PLAN ---
        addPage();
        pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
        pdf.text("ACTION PLAN", 10, y); y += 8;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
        const savedItems = localStorage.getItem('recoveryHubItems');
        if (savedItems) {
            const tasks: ActionItem[] = JSON.parse(savedItems);
            tasks.forEach(t => {
                checkPage(10);
                pdf.text(`[${t.completed ? 'X' : ' '}] ${t.priority} — ${t.task}`, 10, y); y += 5;
                if (t.description) { const dl = pdf.splitTextToSize(t.description, 170); pdf.text(dl, 15, y); y += dl.length * 4 + 2; }
            });
        } else { pdf.text("No tasks generated yet.", 10, y); y += 5; }

        // --- TIMELINE ---
        addPage();
        pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
        pdf.text("EVIDENCE TIMELINE", 10, y); y += 8;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
        const savedLogs = localStorage.getItem('caseLogs');
        if (savedLogs) {
            const logEntries: LogEntry[] = JSON.parse(savedLogs);
            logEntries.forEach(l => {
                checkPage(12);
                pdf.setFont("helvetica", "bold");
                pdf.text(`${l.date} — ${l.type}`, 10, y); y += 4;
                pdf.setFont("helvetica", "normal");
                const dl = pdf.splitTextToSize(l.description, 180);
                pdf.text(dl, 10, y); y += dl.length * 4 + 4;
            });
        } else { pdf.text("No timeline entries.", 10, y); y += 5; }

        // --- EXPENSES ---
        addPage();
        pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
        pdf.text("EXPENSES", 10, y); y += 8;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
        const savedExp = localStorage.getItem('caseExpenses');
        if (savedExp) {
            const exps: ExpenseEntry[] = JSON.parse(savedExp);
            let expTotal = 0;
            exps.forEach(ex => {
                checkPage(6);
                pdf.text(`${ex.date} — ${ex.category} — ${ex.description} — $${ex.amount}`, 10, y); y += 5;
                expTotal += ex.amount;
            });
            y += 3; pdf.setFont("helvetica", "bold"); pdf.text(`TOTAL: $${expTotal.toFixed(2)}`, 10, y); y += 5;
        } else { pdf.text("No expenses logged.", 10, y); y += 5; }

        // --- CONTACTS ---
        addPage();
        pdf.setFontSize(14); pdf.setFont("helvetica", "bold");
        pdf.text("KEY CONTACTS", 10, y); y += 8;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
        const savedContacts = localStorage.getItem('recoveryHubContacts');
        if (savedContacts) {
            const contactsList: ContactEntry[] = JSON.parse(savedContacts);
            contactsList.forEach(c => {
                checkPage(14);
                pdf.setFont("helvetica", "bold"); pdf.text(`${c.name} — ${c.role}`, 10, y); y += 4;
                pdf.setFont("helvetica", "normal");
                if (c.email) { pdf.text(`Email: ${c.email}`, 10, y); y += 4; }
                if (c.phone) { pdf.text(`Phone: ${c.phone}`, 10, y); y += 4; }
                if (c.notes) { const nl = pdf.splitTextToSize(c.notes, 180); pdf.text(nl, 10, y); y += nl.length * 4; }
                y += 3;
            });
        } else { pdf.text("No contacts saved.", 10, y); y += 5; }

        pdf.save(`${profile.childName}_Full_Case_File.pdf`);
    };

    const clearData = () => {
        if (confirm("Are you sure you want to wipe all local data? This cannot be undone.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Case Profile & Settings</h2>
            
            <div className="form-grid" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-default)' }}>
                <div>
                    <label>Child's Name</label>
                    <input type="text" value={editProfile.childName} onChange={e => setEditProfile({...editProfile, childName: e.target.value})} />
                </div>
                <div>
                    <label>Date of Birth (Optional)</label>
                    <input type="date" value={editProfile.childDOB || ''} onChange={e => setEditProfile({...editProfile, childDOB: e.target.value})} />
                </div>
                <div>
                    <label>Date Taken</label>
                    <input type="date" value={editProfile.abductionDate} onChange={e => setEditProfile({...editProfile, abductionDate: e.target.value})} />
                </div>
                <div>
                    <label>From (Country)</label>
                    <input type="text" value={editProfile.fromCountry} onChange={e => setEditProfile({...editProfile, fromCountry: e.target.value})} />
                </div>
                <div>
                    <label>To (Country)</label>
                    <input type="text" value={editProfile.toCountry} onChange={e => setEditProfile({...editProfile, toCountry: e.target.value})} />
                </div>
                <button className="button-primary full-width" onClick={saveProfile}>Update Profile Details</button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
                <button className="button-secondary full-width" onClick={handlePrintSummary} style={{ marginBottom: '0.5rem' }}>🖨️ Download One-Page Case Sheet (PDF)</button>
                <button className="button-primary full-width" onClick={handleFullCaseExport}>📁 Export Full Case File (PDF) — Everything</button>
            </div>

            <h3>Case IDs</h3>
            <div className="form-grid" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-default)' }}>
                <input type="text" placeholder="Agency (e.g. FBI)" value={newKey} onChange={e => setNewKey(e.target.value)} />
                <input type="text" placeholder="Case Number" value={newVal} onChange={e => setNewVal(e.target.value)} />
                <button className="button-secondary" onClick={addNum}>Add ID</button>
                <div className="id-list full-width">
                    {Object.entries(nums).map(([k, v]) => (
                        <div key={k} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-default)' }}><strong>{k}:</strong> {v}</div>
                    ))}
                </div>
            </div>

            <h3>Data Management</h3>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>📦 Backup & Restore</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Download everything — case profile, action plan, timeline, expenses, contacts, and uploaded documents — as a single backup file.</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="button-primary" onClick={async () => {
                        try {
                            const localData: Record<string, any> = {};
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key) {
                                    try { localData[key] = JSON.parse(localStorage.getItem(key)!); }
                                    catch { localData[key] = localStorage.getItem(key); }
                                }
                            }
                            let vaultMetadata: VaultDocument[] = [];
                            try { vaultMetadata = await getFilesFromLocalVault(); } catch {}
                            const vaultFiles: { id: string; name: string; dataUrl: string }[] = [];
                            try {
                                const idb = await openVaultDB();
                                const tx = idb.transaction(STORE_NAME, 'readonly');
                                const store = tx.objectStore(STORE_NAME);
                                const allReq = store.getAll();
                                await new Promise<void>((resolve, reject) => {
                                    allReq.onsuccess = () => {
                                        const records = allReq.result;
                                        let pending = records.filter((r: any) => r.fileBlob).length;
                                        if (pending === 0) { resolve(); return; }
                                        records.forEach((rec: any) => {
                                            if (rec.fileBlob) {
                                                const reader = new FileReader();
                                                reader.onload = () => { vaultFiles.push({ id: rec.id, name: rec.name, dataUrl: reader.result as string }); pending--; if (pending === 0) resolve(); };
                                                reader.readAsDataURL(rec.fileBlob);
                                            }
                                        });
                                    };
                                    allReq.onerror = () => reject(allReq.error);
                                });
                            } catch {}
                            const exportData = { version: '0.2.0', exportDate: new Date().toISOString(), localStorage: localData, vaultMetadata, vaultFiles };
                            const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `RecoveryHub_Backup_${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            alert('Backup downloaded! Save this file somewhere safe.');
                        } catch (err) { console.error(err); alert('Export failed. Try again.'); }
                    }}>⬇️ Download Full Backup (JSON)</button>
                    <div>
                        <input type="file" id="settings-import-backup" accept=".json" style={{ display: 'none' }} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!confirm("This will REPLACE all current data with the backup. Are you sure?")) return;
                            try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                if (!data.version || !data.localStorage) { alert('Invalid backup file.'); return; }
                                Object.entries(data.localStorage).forEach(([key, value]) => {
                                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                                });
                                if (data.vaultFiles && data.vaultFiles.length > 0) {
                                    const idb = await openVaultDB();
                                    for (const vf of data.vaultFiles) {
                                        try {
                                            const resp = await fetch(vf.dataUrl);
                                            const blob = await resp.blob();
                                            const meta = data.vaultMetadata?.find((m: any) => m.id === vf.id) || {};
                                            const tx = idb.transaction(STORE_NAME, 'readwrite');
                                            tx.objectStore(STORE_NAME).put({ ...meta, id: vf.id, name: vf.name, fileBlob: blob });
                                        } catch {}
                                    }
                                }
                                alert('Import complete! Reloading...');
                                setTimeout(() => window.location.reload(), 500);
                            } catch (err) { console.error(err); alert('Import failed. The file may be corrupted.'); }
                        }} />
                        <label htmlFor="settings-import-backup" className="button-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>⬆️ Import Backup File</label>
                    </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>Note: Very large files (40MB+ PDFs) may make the backup file big. The backup includes your actual documents.</p>
            </div>

            <div style={{ padding: '1rem', border: '1px solid #ffccbc', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                <h4 style={{ color: '#d84315', marginTop: 0 }}>⚠️ Danger Zone</h4>
                <p>This will permanently delete all Case Profiles, Journals, and Checklists stored on this browser.</p>
                <button className="button-danger" onClick={clearData}>Wipe All Local Data</button>
            </div>
        </div>
    );
};

const CampaignSiteBuilder: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    // ... (Same state setup as before)
    const [story, setStory] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [missingCaseNumber, setMissingCaseNumber] = useState('');
    const [links, setLinks] = useState<{label: string, url: string}[]>([]);
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');

    useEffect(() => {
        if (auth.currentUser?.email && !email) setEmail(auth.currentUser.email);
        if (!story && profile.childName) {
            setStory(`${profile.childName} was taken from ${profile.fromCountry} to ${profile.toCountry} on ${profile.abductionDate}. Please help bring them home.`);
        }
    }, [profile, auth.currentUser]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                const base64 = await fileToBase64(e.target.files[0]);
                const compressed = await resizeImage(base64);
                setPhoto(compressed);
            } catch (err) { console.error(err); }
        }
    };

    const handleAddLink = () => {
        if(newLinkLabel && newLinkUrl) {
            setLinks([...links, { label: newLinkLabel, url: newLinkUrl.startsWith('http') ? newLinkUrl : 'https://' + newLinkUrl }]);
            setNewLinkLabel(''); setNewLinkUrl('');
        }
    };
    
    const handleRemoveLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));

    const handleAutoDraft = async () => {
        setDrafting(true);
        try {
             const ragContext = await getRagContext();
             const prompt = `
             Write a compelling, FACTUAL, and DIRECT public statement for a missing child website.
             
             Child: ${profile.childName}
             Missing From: ${profile.fromCountry}
             Taken To: ${profile.toCountry}
             Date: ${profile.abductionDate}
             
             Reference Documents Context:
             ${ragContext}
             
             Instructions:
             - Do NOT use flowery, dramatic, or overly emotional language. 
             - Be journalistic and urgency-driven.
             - Include physical description if available in context.
             - Clearly state who took them if known and safe to say.
             - End with a clear call to action.
             - Keep it under 300 words.
             `;
             const result = await ai.models.generateContent({
                 model: "gemini-2.5-pro",
                 contents: prompt
             });
             if (result.text) setStory(result.text);
        } catch (e) { console.error(e); } finally { setDrafting(false); }
    };

    const publish = async () => {
        setLoading(true);
        try {
            let uid = auth.currentUser?.uid;
            let dbWriteSuccess = false;

            if (!uid) {
                try {
                    const cred = await signInAnonymously(auth);
                    uid = cred.user.uid;
                } catch (authErr: any) { console.warn("Cloud Auth failed", authErr); }
            }
            
            // Collect Public Timeline Items
            const savedLogs = localStorage.getItem('caseLogs');
            let publicTimeline: any[] = [];
            if (savedLogs) {
                const logs = JSON.parse(savedLogs);
                publicTimeline = logs
                    .filter((l: LogEntry) => l.isPublic)
                    .map((l: LogEntry) => ({ date: l.date, title: l.type, description: l.description }));
            }

            const id = 'CASE_' + (profile.childName.replace(/\s/g, '_') || 'UNNAMED') + '_' + Date.now();
            const campaignData = {
                childName: profile.childName,
                story: story,
                photo: photo,
                fromCountry: profile.fromCountry,
                toCountry: profile.toCountry,
                contactEmail: email,
                contactPhone: phone,
                missingCaseNumber,
                links,
                timeline: publicTimeline,
                createdAt: new Date().toISOString(),
                ownerUid: uid || 'local_user'
            };

            if (uid) {
                try {
                    await setDoc(doc(db, 'campaigns', id), campaignData);
                    dbWriteSuccess = true;
                } catch (dbErr) { console.warn("Firestore write failed", dbErr); }
            }

            localStorage.setItem(`LOCAL_CAMPAIGN_${id}`, JSON.stringify(campaignData));
            
            const url = `${window.location.origin}?c=${id}`;
            setPublishedUrl(url);
            
            if (!dbWriteSuccess) {
                alert("Offline Mode: Campaign saved to your device. The link below will work on THIS DEVICE only.");
            }

        } catch (e) {
            console.error(e);
            alert("Failed to publish. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    
    if (showPreview) {
        const savedLogs = localStorage.getItem('caseLogs');
        let publicTimeline: any[] = [];
        if (savedLogs) {
            publicTimeline = JSON.parse(savedLogs)
                .filter((l: LogEntry) => l.isPublic)
                .map((l: LogEntry) => ({ date: l.date, title: l.type, description: l.description }));
        }

        const previewData = {
            childName: profile.childName,
            story, photo, fromCountry: profile.fromCountry, toCountry: profile.toCountry, contactEmail: email, contactPhone: phone,
            missingCaseNumber, links, timeline: publicTimeline
        };
        return (
            <div className="tool-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2>Site Preview</h2>
                    <button className="button-secondary" onClick={() => setShowPreview(false)}>Close Preview</button>
                </div>
                <div style={{ border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden', height: '600px', overflowY: 'scroll' }}>
                    <PublicCampaignViewer id="PREVIEW" previewData={previewData} />
                </div>
            </div>
        );
    }

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Campaign Website Builder (Hosted)</h2>
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}><strong>1. Hero Photo</strong></label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {photo && <img src={photo} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />}
            
            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem' }}><strong>2. Public Story & Details</strong></label>
            <textarea placeholder="Write your public story here..." value={story} onChange={e => setStory(e.target.value)} rows={6} className="full-width" />
            <button className="button-ai" onClick={handleAutoDraft} disabled={drafting} style={{ marginTop: '0.5rem' }}>
                {drafting ? 'Reading Docs & Drafting...' : '✨ Auto-Draft with AI'}
            </button>
            
            <div style={{ marginTop: '1rem' }}>
                <label>Missing Person Case Number (if public)</label>
                <input type="text" value={missingCaseNumber} onChange={e => setMissingCaseNumber(e.target.value)} placeholder="e.g. Police Case #, NGO ID, or NCMEC" />
            </div>
            
            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem' }}><strong>3. Public Contact Info</strong></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input type="email" placeholder="Public Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="tel" placeholder="Public Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem' }}><strong>4. Useful Links (Link Tree)</strong></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem' }}>
                <input type="text" placeholder="Label" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} />
                <input type="text" placeholder="URL" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
                <button className="button-secondary" onClick={handleAddLink}>Add</button>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
                {links.map((l, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--surface-raised)', marginBottom: '0.25rem', borderRadius: '4px' }}>
                        <span>{l.label}</span>
                        <button onClick={() => handleRemoveLink(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red' }}>x</button>
                    </div>
                ))}
            </div>

             <p style={{marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                <strong>Note:</strong> To include a Case Timeline on your public site, go to the "Evidence" tab and toggle specific events to "Public" (Green Globe).
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="button-secondary" onClick={() => setShowPreview(true)}>Preview Site</button>
                <button className="button-primary" onClick={publish} disabled={loading}>
                    {loading ? 'Publishing...' : 'Publish to Web 🚀'}
                </button>
            </div>
            
            {publishedUrl && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                    <strong>✅ Site is Live!</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                        <a href={publishedUrl} target="_blank" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2e7d32' }}>{publishedUrl}</a>
                    </div>
                </div>
            )}
        </div>
    );
};

const PublicCampaignViewer: React.FC<{ id: string, previewData?: any }> = ({ id, previewData }) => {
    const [data, setData] = useState<any>(previewData || null);
    const [loading, setLoading] = useState(!previewData);
    const [error, setError] = useState('');

    useEffect(() => {
        if (data) document.title = `MISSING CHILD: ${data.childName}`;
    }, [data]);

    useEffect(() => {
        if (previewData) {
            setData(previewData);
            setLoading(false);
            return;
        }
        
        const fetchData = async () => {
            try {
                try {
                    const snap = await getDoc(doc(db, 'campaigns', id));
                    if (snap.exists()) {
                        setData(snap.data());
                        setLoading(false);
                        return;
                    }
                } catch (err) { console.warn("Firestore read failed", err); }

                const local = localStorage.getItem(`LOCAL_CAMPAIGN_${id}`);
                if (local) {
                    setData(JSON.parse(local));
                } else {
                    setError("Campaign not found.");
                }
            } catch (e) {
                console.error(e);
                setError("Could not load campaign.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, previewData]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Campaign...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>;
    if (!data) return null;

    return (
        <div className="public-campaign-container">
            <div className="missing-poster-header">
                MISSING CHILD
            </div>
            
            <div className="missing-poster-body">
                <div className="missing-photo-container">
                    {data.photo ? (
                         <img src={data.photo} alt={`Photo of ${data.childName}`} className="missing-photo" />
                    ) : (
                         <div className="missing-photo-placeholder">No Photo Available</div>
                    )}
                </div>

                <h1 className="missing-name">{data.childName}</h1>
                
                {data.missingCaseNumber && <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-secondary)' }}>CASE #: {data.missingCaseNumber}</div>}

                <div className="missing-details-bar">
                     <div><strong>MISSING FROM:</strong><br/>{data.fromCountry}</div>
                     <div><strong>TAKEN TO:</strong><br/>{data.toCountry}</div>
                     <div><strong>DATE:</strong><br/>{data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Unknown'}</div>
                </div>

                <div className="missing-story">
                    <p>{data.story}</p>
                </div>
                
                {data.links && data.links.length > 0 && (
                    <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.links.map((l: any, i: number) => (
                            <a key={i} href={l.url} target="_blank" className="button-primary full-width" style={{ textAlign: 'center', textDecoration: 'none' }}>{l.label}</a>
                        ))}
                    </div>
                )}

                {/* PUBLIC TIMELINE */}
                {data.timeline && data.timeline.length > 0 && (
                    <div style={{ margin: '2rem 0', textAlign: 'left', borderTop: '2px solid var(--border-default)', paddingTop: '2rem' }}>
                        <h3 style={{ textAlign: 'center', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Case Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.timeline.map((t: any, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', borderLeft: '3px solid #d32f2f', paddingLeft: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', minWidth: '100px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.date}</div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>{t.title}</div>
                                        <div style={{ fontSize: '0.95rem' }}>{t.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="missing-contact">
                    <h3>IF SEEN OR LOCATED, CONTACT:</h3>
                    {data.contactEmail && <div className="contact-line">EMAIL: {data.contactEmail}</div>}
                    {data.contactPhone && <div className="contact-line">PHONE: {data.contactPhone}</div>}
                    {!data.contactEmail && !data.contactPhone && <div className="contact-line">Please contact local police immediately.</div>}
                </div>
            </div>
        </div>
    );
};

const TermsOfService: React.FC = () => (
    <div className="tool-card" style={{ cursor: 'default' }}>
        <h2>Terms of Service & Disclaimer</h2>
        <p>This application is a support tool for informational and organizational purposes only.</p>
        <p><strong>Not Legal Advice:</strong> The Recovery Hub uses Artificial Intelligence to help organize information and draft documents. It is not a substitute for a qualified attorney. International family law is complex and fact-specific.</p>
        <p><strong>Data Privacy:</strong> By default, this app stores data locally on your device (localStorage and IndexedDB). If you sign in, data is encrypted and synced to the cloud. Please review our Data Management section for more details on how to wipe your data.</p>
        <p><strong>Limitation of Liability:</strong> The creators of this tool accept no liability for the outcome of your case. Use this tool at your own risk.</p>
    </div>
);

const DataManagement: React.FC = () => {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    const clearData = () => {
        if (confirm("Are you sure you want to wipe all local data? This cannot be undone.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Gather all localStorage data
            const localData: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    try { localData[key] = JSON.parse(localStorage.getItem(key)!); }
                    catch { localData[key] = localStorage.getItem(key); }
                }
            }

            // Gather all IndexedDB vault docs (metadata only — files are too large)
            let vaultMetadata: VaultDocument[] = [];
            try {
                vaultMetadata = await getFilesFromLocalVault();
            } catch (e) { console.error('Could not read vault', e); }

            // Gather actual file blobs from IndexedDB
            const vaultFiles: { id: string; name: string; dataUrl: string }[] = [];
            try {
                const idb = await openVaultDB();
                const tx = idb.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const allReq = store.getAll();
                await new Promise<void>((resolve, reject) => {
                    allReq.onsuccess = () => {
                        const records = allReq.result;
                        records.forEach((rec: any) => {
                            if (rec.fileBlob) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    vaultFiles.push({ id: rec.id, name: rec.name, dataUrl: reader.result as string });
                                    if (vaultFiles.length === records.filter((r: any) => r.fileBlob).length) resolve();
                                };
                                reader.readAsDataURL(rec.fileBlob);
                            }
                        });
                        if (records.filter((r: any) => r.fileBlob).length === 0) resolve();
                    };
                    allReq.onerror = () => reject(allReq.error);
                });
            } catch (e) { console.error('Could not export file blobs', e); }

            const exportData = {
                version: '0.2.0',
                exportDate: new Date().toISOString(),
                localStorage: localData,
                vaultMetadata,
                vaultFiles
            };

            const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RecoveryHub_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert('Backup downloaded! Save this file somewhere safe. You can import it on any device.');
        } catch (err) {
            console.error(err);
            alert('Export failed. Try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm("This will REPLACE all current data with the backup. Are you sure?")) return;

        setImporting(true);
        setImportStatus('Reading backup file...');
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version || !data.localStorage) {
                alert('Invalid backup file.');
                return;
            }

            // Restore localStorage
            setImportStatus('Restoring case data...');
            Object.entries(data.localStorage).forEach(([key, value]) => {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            });

            // Restore vault files if present
            if (data.vaultFiles && data.vaultFiles.length > 0) {
                setImportStatus(`Restoring ${data.vaultFiles.length} documents...`);
                const idb = await openVaultDB();
                for (const vf of data.vaultFiles) {
                    try {
                        const resp = await fetch(vf.dataUrl);
                        const blob = await resp.blob();
                        const meta = data.vaultMetadata?.find((m: any) => m.id === vf.id) || {};
                        const tx = idb.transaction(STORE_NAME, 'readwrite');
                        tx.objectStore(STORE_NAME).put({ ...meta, id: vf.id, name: vf.name, fileBlob: blob });
                    } catch (err) {
                        console.error(`Failed to restore file ${vf.name}`, err);
                    }
                }
            }

            setImportStatus('Done! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            console.error(err);
            alert('Import failed. The file may be corrupted.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Data Management</h2>
            <p>Your data is stored in this browser on this device. Use these tools to back it up or move it.</p>

            <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginTop: 0 }}>📦 Backup & Restore</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Download everything — case profile, action plan, timeline, expenses, contacts, and uploaded documents — as a single backup file. Import it on any device to pick up where you left off.</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="button-primary" onClick={handleExport} disabled={exporting}>
                        {exporting ? 'Preparing backup...' : '⬇️ Download Full Backup'}
                    </button>
                    <div>
                        <input type="file" id="import-backup" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                        <label htmlFor="import-backup" className="button-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                            {importing ? 'Importing...' : '⬆️ Import Backup File'}
                        </label>
                    </div>
                </div>
                {importStatus && <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.5rem' }}>{importStatus}</p>}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>Note: Very large files (40MB+ PDFs) may make the backup file big. The backup includes your actual documents so nothing is lost.</p>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid #ffccbc', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                <h3 style={{ color: '#d84315', marginTop: 0 }}>⚠️ Danger Zone</h3>
                <p>This will permanently delete all data stored in this browser. Make sure you have a backup first.</p>
                <button className="button-danger" onClick={clearData}>Wipe All Local Data</button>
            </div>
        </div>
    );
};

const OnboardingWizard: React.FC<{ onComplete: (p: CaseProfile) => void, onPreventionClick?: () => void }> = ({ onComplete, onPreventionClick }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<Partial<CaseProfile>>({ completedActions: [] });
    const [analyzingDoc, setAnalyzingDoc] = useState(false);

    const next = () => setStep(s => s + 1);

    const handleActionToggle = (action: string) => {
        const current = data.completedActions || [];
        if (current.includes(action)) {
            setData({ ...data, completedActions: current.filter(a => a !== action) });
        } else {
            setData({ ...data, completedActions: [...current, action] });
        }
    };
    
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setAnalyzingDoc(true);
            const file = e.target.files[0];
            try {
                 const base64 = await fileToBase64(file);
                 const prompt = `
                 Analyze this legal document. Extract:
                 1. "type": Document Type (Court Order, Report, etc.)
                 2. "date": The specific date written ON the document (YYYY-MM-DD). If multiple, choose the filing date.
                 3. "summary": One sentence summary.
                 Return JSON.
                 `;
                 
                 const result = await ai.models.generateContent({
                    model: "gemini-2.5-pro",
                    contents: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: prompt }
                    ],
                    config: { responseMimeType: "application/json" }
                 });
                 
                 const text = result.text;
                 const analysis = text ? JSON.parse(text) : {};
                 
                 const vaultDoc: VaultDocument = {
                    id: Date.now().toString(),
                    name: file.name,
                    type: analysis.type || 'Initial Evidence',
                    date: analysis.date || new Date().toISOString().split('T')[0],
                    summary: analysis.summary || 'Uploaded during setup',
                    extractedText: '',
                    fileType: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                };
                
                if (auth.currentUser) {
                    await setDoc(doc(db, `users/${auth.currentUser.uid}/documents`, vaultDoc.id), vaultDoc);
                }
                await saveFileToLocalVault(vaultDoc, file);
                
                alert(`Analyzed & Saved: ${vaultDoc.type} (${vaultDoc.date})`);
            } catch (err) {
                console.error(err);
                alert("Failed to analyze document, but saved locally.");
            } finally {
                setAnalyzingDoc(false);
            }
        }
    };

    return (
        <div className="tool-card">
            <h2>Case Setup Wizard</h2>
            {onPreventionClick && step === 0 && (
                <div className="tool-card highlight" onClick={onPreventionClick} style={{ marginBottom: '1.5rem', cursor: 'pointer' }}>
                    <h3>🛡️ Worried About Abduction?</h3>
                    <p>No case yet? Get a country-specific prevention checklist you can download right now.</p>
                </div>
            )}
            {step === 0 && (
                <div className="form-grid">
                    <div>
                        <label>Child's Name</label>
                        <input type="text" value={data.childName || ''} onChange={e => setData({...data, childName: e.target.value})} />
                    </div>
                    
                    <div>
                        <label>Your Role</label>
                        <select value={data.parentRole || 'mother'} onChange={e => setData({...data, parentRole: e.target.value as any})}>
                            <option value="mother">Mother</option>
                            <option value="father">Father</option>
                            <option value="legal-guardian">Legal Guardian</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="full-width">
                         <label>Legal Custody Status (Before Taking)</label>
                         <select value={data.custodyStatus || 'no-order'} onChange={e => setData({...data, custodyStatus: e.target.value as any})}>
                            <option value="no-order">No Court Order Exists</option>
                            <option value="sole-custody-me-local">I have Sole Custody</option>
                            <option value="joint-custody-local">We have Joint Custody</option>
                            <option value="sole-custody-them-local">They have Sole Custody (Retained/Taken by Custodial Parent)</option>
                            <option value="other">Other / Unclear</option>
                         </select>
                         <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>Select the status in the country the child was taken FROM.</p>
                    </div>
                    
                    <div className="full-width" style={{marginTop: '1rem', display: 'flex', gap: '1rem'}}>
                        <button className="button-primary" onClick={next}>Next Step</button>
                        <button className="button-secondary" onClick={() => onComplete({ ...data, isSkipped: true, isProfileComplete: true } as any)}>Skip Setup</button>
                    </div>
                </div>
            )}
            {step === 1 && (
                <div className="form-grid">
                    <div>
                        <label>Missing From (Country)</label>
                        <input type="text" value={data.fromCountry || ''} onChange={e => setData({...data, fromCountry: e.target.value})} />
                    </div>
                    <div>
                        <label>Taken To (Country)</label>
                        <input type="text" value={data.toCountry || ''} onChange={e => setData({...data, toCountry: e.target.value})} />
                    </div>
                    
                    <div>
                        <label>Date Taken</label>
                        <input type="date" value={data.abductionDate || ''} onChange={e => setData({...data, abductionDate: e.target.value})} />
                    </div>
                    
                    <div>
                        <label>Who took them?</label>
                        <select value={data.abductorRelationship || ''} onChange={e => setData({...data, abductorRelationship: e.target.value})}>
                            <option value="">Select Relationship</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Grandparent">Grandparent</option>
                            <option value="Relative">Other Relative</option>
                            <option value="Stranger">Stranger/Unknown</option>
                        </select>
                    </div>

                    <div className="full-width" style={{marginTop: '1rem'}}>
                        <button className="button-primary full-width" onClick={next}>Next Step</button>
                        <button className="button-secondary" onClick={() => setStep(0)} style={{marginTop: '0.5rem', width: '100%', border: 'none'}}>Back</button>
                    </div>
                </div>
            )}
            {step === 2 && (
                <div className="form-grid">
                    <div className="full-width">
                        <label style={{marginBottom: '0.5rem'}}>Progress Check: What have you already done?</label>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem'}}>
                            {[
                                'Filed Police Report',
                                'Contacted Child Abduction Lawyer', 
                                'Contacted State Dept / Ministry of Foreign Affairs',
                                'Alerted Border Control / Passport Agency'
                            ].map(action => (
                                <label key={action} style={{fontWeight: 'normal', display: 'flex', alignItems: 'center'}}>
                                    <input 
                                        type="checkbox" 
                                        checked={data.completedActions?.includes(action)} 
                                        onChange={() => handleActionToggle(action)} 
                                        style={{width: 'auto', marginRight: '0.5rem'}}
                                    />
                                    {action}
                                </label>
                            ))}
                        </div>

                        <label>Upload Key Documents (Optional)</label>
                        <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Court orders or police reports will be analyzed and saved to your Vault.</p>
                        <input type="file" onChange={handleDocUpload} accept=".pdf,image/*" style={{ marginBottom: '0.5rem' }} />
                        {analyzingDoc && <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Analyzing document... please wait...</div>}
                    
                        <label style={{marginTop: '1rem', display: 'block'}}>Is there anything else?</label>
                        <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Context affects strategy (e.g., "Child has medical needs," "History of domestic violence," "Abductor has dual citizenship").</p>
                        <textarea 
                            value={data.additionalContext || ''} 
                            onChange={e => setData({...data, additionalContext: e.target.value})} 
                            rows={4} 
                            placeholder="Enter details here..."
                        />
                    </div>

                    <div className="full-width" style={{marginTop: '1rem'}}>
                        <button className="button-primary full-width" onClick={() => onComplete({ ...data, isProfileComplete: true } as any)} disabled={analyzingDoc}>Finish Setup & Build Plan</button>
                        <button className="button-secondary" onClick={() => setStep(1)} style={{marginTop: '0.5rem', width: '100%', border: 'none'}}>Back</button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- PREVENTION STEPS TOOL ---

const GeminiResponseRenderer: React.FC<{ items: ChecklistItem[], onToggleItem: (id: string) => void }> = ({ items, onToggleItem }) => {
    const renderLineContent = (text: string) => {
        return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="gemini-response-checklist">
            {items.map(item => {
                switch (item.type) {
                    case 'heading':
                        return <h3 key={item.id} className="checklist-heading">{renderLineContent(item.text)}</h3>;
                    case 'task':
                        return (
                            <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
                                <label className="checklist-item-label">
                                    <input type="checkbox" className="checklist-item-checkbox" checked={item.completed} onChange={() => onToggleItem(item.id)} />
                                    <span>{renderLineContent(item.text)}</span>
                                </label>
                            </div>
                        );
                    case 'paragraph':
                    default:
                        return <p key={item.id} className="checklist-paragraph">{renderLineContent(item.text)}</p>;
                }
            })}
        </div>
    );
};

const PreventionSteps: React.FC<{ profile: CaseProfile, onBack: () => void }> = ({ profile, onBack }) => {
    const [country, setCountry] = useState('');
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const responseRef = useRef<HTMLDivElement>(null);

    const parseResponseToItems = (text: string): ChecklistItem[] => {
        const lines = text.split('\n');
        const parsed: ChecklistItem[] = [];
        lines.forEach(line => {
            const t = line.trim();
            if (t.startsWith('## ')) {
                parsed.push({ id: crypto.randomUUID(), text: t.substring(3), completed: false, type: 'heading' });
            } else if (t.startsWith('* ') || t.startsWith('- ')) {
                parsed.push({ id: crypto.randomUUID(), text: t.substring(2), completed: false, type: 'task' });
            } else if (t.length > 0) {
                const last = parsed[parsed.length - 1];
                if (last && last.type === 'paragraph') {
                    last.text += ` ${t}`;
                } else {
                    parsed.push({ id: crypto.randomUUID(), text: t, completed: false, type: 'paragraph' });
                }
            }
        });
        return parsed;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setItems([]);
        try {
            const prompt = `A parent is worried their co-parent is going to abduct their child internationally from their current country of residence, which is ${country}.
Generate a clear, actionable list of preventative steps they can take.
CRITICAL INSTRUCTIONS:
1. **Country-Specific Programs:** Prioritize official, country-specific programs. For the U.S., this MUST include the "Children's Passport Issuance Alert Program (CPIAP)". For other countries, find the equivalent passport alert or border control program.
2. **Legal Actions:** Emphasize the importance of obtaining a court order that explicitly prohibits the child from leaving the country without permission from the court or both parents.
3. **Practical Steps:** Include practical advice like securing the child's passport, notifying schools, and documenting threats.
4. **Provide URLs:** Wherever possible, provide official government URLs for the programs and resources you mention.
Format the response as a clear, easy-to-follow list. Use markdown for formatting (e.g., ## for headings, * for list items, ** for bold).`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });
            setItems(parseResponseToItems(result.text || ''));
        } catch (e: any) {
            setError(`Failed to generate prevention steps: ${e.message}`);
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleItem = (id: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
    };

    const handleDownloadPdf = async () => {
        const element = responseRef.current;
        if (!element) return;
        const btn = element.querySelector('.button-download') as HTMLElement | null;
        if (btn) btn.style.display = 'none';
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: 'var(--surface-raised)' });
            if (btn) btn.style.display = '';
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('Recommended-Prevention-Plan.pdf');
        } catch (err) {
            if (btn) btn.style.display = '';
            console.error('PDF generation failed', err);
            setError('PDF could not be created. Try your browser\'s print function (Ctrl/Cmd + P).');
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <button className="button-secondary" onClick={onBack} style={{ marginBottom: '1rem' }}>&larr; Back</button>
            <h2>Prevention Steps</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Worried your co-parent may try to take your child out of the country? Enter your country below and we'll generate a specific, actionable prevention checklist you can start on right now.</p>
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="full-width">
                    <label>Your Current Country of Residence</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g., United States, United Kingdom, Japan" required />
                </div>
                <div className="full-width">
                    <button type="submit" className="button-primary" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Generating Prevention Plan...' : 'Get Prevention Steps'}
                    </button>
                </div>
            </form>

            {loading && <div className="prevention-spinner"></div>}
            {error && <p style={{ color: 'var(--md-sys-color-error)', marginTop: '1rem' }}>{error}</p>}

            {items.length > 0 && (
                <div className="response-content" ref={responseRef}>
                    <div className="response-header">
                        <h3>Recommended Prevention Plan</h3>
                        <button className="button-download" onClick={handleDownloadPdf}>Download PDF</button>
                    </div>
                    <GeminiResponseRenderer items={items} onToggleItem={handleToggleItem} />
                    <div className="disclaimer-block" style={{ marginTop: '1.5rem' }}>
                        <strong>Important Disclaimer:</strong> This is AI-generated guidance for informational purposes only. It is not a substitute for legal advice. Laws, treaties, and procedures differ by country and situation. Always verify with qualified legal counsel and official government authorities before taking action.
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CONTACT LIST BUILDER ---
const ContactListBuilder: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [contacts, setContacts] = useState<ContactEntry[]>([]);
    const [newContact, setNewContact] = useState<Partial<ContactEntry>>({ role: '' });
    const [suggesting, setSuggesting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('caseContacts');
        if (saved) setContacts(JSON.parse(saved));
        if (auth.currentUser) {
            getDocs(query(collection(db, `users/${auth.currentUser.uid}/contacts`))).then(snap => {
                if (!snap.empty) {
                    const cloudContacts = snap.docs.map(d => d.data() as ContactEntry);
                    if (cloudContacts.length > 0) setContacts(cloudContacts);
                }
            }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('caseContacts', JSON.stringify(contacts));
        if (auth.currentUser && contacts.length > 0) {
            const batch = writeBatch(db);
            contacts.forEach(c => {
                const ref = doc(db, `users/${auth.currentUser!.uid}/contacts`, c.id);
                batch.set(ref, c);
            });
            batch.commit().catch(e => console.error("Contact sync failed", e));
        }
    }, [contacts]);

    const addContact = () => {
        if (!newContact.name) return;
        const entry: ContactEntry = {
            id: Date.now().toString(),
            name: newContact.name,
            role: newContact.role || '',
            email: newContact.email || '',
            phone: newContact.phone || '',
            notes: newContact.notes || ''
        };
        setContacts(prev => [entry, ...prev]);
        setNewContact({ role: '' });
    };

    const deleteContact = (id: string) => {
        if (confirm("Delete this contact?")) {
            setContacts(prev => prev.filter(c => c.id !== id));
        }
    };

    const copyText = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`Copied ${label} to clipboard`);
    };

    const suggestContacts = async () => {
        setSuggesting(true);
        try {
            const prompt = `
            You are helping a parent whose child was abducted from ${profile.fromCountry} to ${profile.toCountry}.
            Custody status: ${profile.custodyStatus}.

            Generate 8-12 SPECIFIC, ACTIONABLE contacts they need. Go DEEP — not just the obvious "call police" stuff. Think like someone who has actually been through this.

            MUST INCLUDE (with real details where possible):
            1. The SPECIFIC Central Authority for Hague Convention in ${profile.fromCountry} — name the actual office, not just "Central Authority"
            2. The SPECIFIC Central Authority in ${profile.toCountry} — same, name the office
            3. The specific embassy/consulate of ${profile.fromCountry} in ${profile.toCountry} — city-specific if possible
            4. A specialized international family law attorney referral organization (not just "find a lawyer" — name the org like IAML, Reunite, etc.)
            5. The specific government hotline for child abduction cases in ${profile.fromCountry} (e.g., US = Office of Children's Issues 1-888-407-4747)
            6. NCMEC or equivalent in ${profile.fromCountry}
            7. ICMEC (International Centre for Missing & Exploited Children)
            8. A family law attorney referral in ${profile.toCountry} — name a specific legal aid org or bar association
            9. Interpol — specifically the ${profile.toCountry} NCB (National Central Bureau)
            10. Any country-specific NGOs that help with parental abduction cases involving ${profile.toCountry}

            DO NOT suggest generic contacts like "local police" without specifying WHICH police jurisdiction.
            DO provide actual phone numbers and emails where they are publicly known.
            DO explain in notes EXACTLY what to say when you call and what to ask for.

            Return JSON array with: name, role, email (or ""), phone (or ""), notes (include what to say/ask).
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                role: { type: Type.STRING },
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                notes: { type: Type.STRING }
                            },
                            required: ["name", "role", "notes"]
                        }
                    }
                }
            });

            const text = result.text;
            if (text) {
                const suggested = JSON.parse(text);
                const newContacts: ContactEntry[] = suggested.map((s: any, i: number) => ({
                    id: Date.now().toString() + i,
                    name: s.name,
                    role: s.role,
                    email: s.email || '',
                    phone: s.phone || '',
                    notes: s.notes || ''
                }));
                setContacts(prev => [...newContacts, ...prev]);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to suggest contacts. Please try again.");
        } finally {
            setSuggesting(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Contact List</h2>
                <button className="button-ai" onClick={suggestContacts} disabled={suggesting}>
                    {suggesting ? 'Finding Contacts...' : '🤖 AI Suggest Contacts'}
                </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Build your team of contacts - lawyers, agencies, police, and advocates. AI can suggest key contacts based on your case countries.</p>

            <div className="form-grid" style={{ backgroundColor: 'var(--surface-raised)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <input type="text" placeholder="Name / Agency" value={newContact.name || ''} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                <input type="text" placeholder="Role (e.g., FBI Agent, Lawyer)" value={newContact.role || ''} onChange={e => setNewContact({...newContact, role: e.target.value})} />
                <input type="email" placeholder="Email" value={newContact.email || ''} onChange={e => setNewContact({...newContact, email: e.target.value})} />
                <input type="tel" placeholder="Phone" value={newContact.phone || ''} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
                <input type="text" placeholder="Notes (optional)" value={newContact.notes || ''} onChange={e => setNewContact({...newContact, notes: e.target.value})} className="full-width" />
                <button className="button-primary full-width" onClick={addContact}>Add Contact</button>
            </div>

            <div>
                {contacts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-raised)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>You'll need lawyers, government officials, embassy contacts, and maybe an investigator.</p>
                        <p style={{ fontSize: '0.9rem' }}>Click <strong>"AI Suggest Contacts"</strong> below to get country-specific recommendations — or add your own.</p>
                    </div>
                )}
                {contacts.map(c => (
                    <div key={c.id} className="contact-card">
                        <div className="contact-card-info">
                            <div className="contact-card-name">{c.name}</div>
                            {c.role && <div className="contact-card-role">{c.role}</div>}
                            <div className="contact-card-details">
                                {c.email && <button onClick={() => copyText(c.email!, 'email')}>📧 {c.email}</button>}
                                {c.phone && <button onClick={() => copyText(c.phone!, 'phone')}>📞 {c.phone}</button>}
                            </div>
                            {c.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{c.notes}</div>}
                        </div>
                        <div className="contact-card-actions">
                            <button onClick={() => deleteContact(c.id)} title="Delete Contact">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>Something went wrong</h2>
                    <p>The app encountered an unexpected error. Your data is safe - it's stored locally on your device and in the cloud if you're signed in.</p>
                    <button className="button-primary" onClick={() => window.location.reload()}>Refresh Page</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- SUPPORT & MENTAL HEALTH RESOURCES ---

const SupportResources: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [resources, setResources] = useState<{ name: string; type: string; location: string; description: string; contact: string; url: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const findResources = async () => {
        setLoading(true);
        try {
            const prompt = `
            A parent is going through an international child abduction crisis.
            They live in: ${profile.fromCountry}
            Their child is in: ${profile.toCountry}
            ${profile.childName ? `Their child's name is ${profile.childName}.` : ''}

            Find REAL, SPECIFIC support resources for them. Include:

            1. **Mental health / therapy:**
               - Therapists or organizations that specialize in parental abduction trauma or family separation
               - Crisis hotlines in ${profile.fromCountry}
               - Online therapy options (e.g., BetterHelp, but also specialized ones)

            2. **Support groups:**
               - Parent support groups specifically for international child abduction (e.g., Bring Abducted Children Home, Left Behind Parents groups)
               - Online communities and forums
               - Facebook groups or organizations

            3. **NGOs and advocacy:**
               - Organizations that advocate for or support left-behind parents
               - Legal aid specifically for international custody cases
               - Child welfare organizations in both ${profile.fromCountry} and ${profile.toCountry}

            4. **For the child:**
               - Resources about helping a child after reunion
               - Child psychologists who specialize in abduction cases

            5. **Financial assistance:**
               - Grants or funds that help parents with legal costs in international custody cases
               - Pro bono legal organizations

            Be SPECIFIC. Include real organization names, real URLs where known, real phone numbers. Do NOT make up organizations.
            Return JSON array with: name, type (therapy/support-group/ngo/legal-aid/financial/child-resources), location, description, contact (phone/email or ""), url (or "").
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const text = result.text;
            if (text) setResources(JSON.parse(text));
            setHasSearched(true);
        } catch (e) {
            console.error(e);
            alert('Search failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const typeLabels: Record<string, string> = {
        'therapy': '🧠 Mental Health', 'support-group': '🤝 Support Group', 'ngo': '🏛️ NGO/Advocacy',
        'legal-aid': '⚖️ Legal Aid', 'financial': '💰 Financial Help', 'child-resources': '👶 For the Child'
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Support & Mental Health</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {profile.childName ? `Fighting for ${profile.childName}` : 'This fight'} is brutal on your mental health. You don't have to do this alone. This tool finds therapists, support groups, NGOs, and financial resources specific to your situation and location.
            </p>

            {!hasSearched && (
                <button className="button-primary" onClick={findResources} disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Searching for resources...' : `Find Resources for ${profile.fromCountry} & ${profile.toCountry}`}
                </button>
            )}

            {loading && <div className="prevention-spinner" style={{ marginTop: '1rem' }}></div>}

            {resources.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                    {['therapy', 'support-group', 'ngo', 'legal-aid', 'financial', 'child-resources'].map(type => {
                        const filtered = resources.filter(r => r.type === type);
                        if (filtered.length === 0) return null;
                        return (
                            <div key={type} style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{typeLabels[type] || type}</h3>
                                {filtered.map((r, i) => (
                                    <div key={i} className="action-item" style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <strong>{r.name}</strong>
                                                {r.location && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{r.location}</span>}
                                            </div>
                                            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>Visit →</a>}
                                        </div>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0.25rem 0' }}>{r.description}</p>
                                        {r.contact && <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{r.contact}</p>}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    <button className="button-secondary" onClick={findResources} disabled={loading} style={{ marginTop: '0.5rem' }}>
                        🔄 Search Again
                    </button>
                </div>
            )}

            {hasSearched && resources.length === 0 && !loading && (
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No resources found. Try searching again.</p>
            )}

            <div className="disclaimer-block" style={{ marginTop: '1.5rem' }}>
                <strong>Important:</strong> If you're in a crisis, call <strong>988</strong> (US Suicide & Crisis Lifeline) or your local emergency number. These AI-suggested resources should be verified independently.
            </div>
        </div>
    );
};

// --- HOW IT WORKS GUIDE ---

const HowItWorks: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <button className="button-secondary" onClick={onBack} style={{ marginBottom: '1rem' }}>&larr; Back</button>
            <h2>How This Works</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This is a free tool built by a parent going through this. Here's what it does and how to use it.</p>

            <div className="how-it-works-section">
                <h3>🔒 Your data stays on YOUR device</h3>
                <p>Everything you enter — documents, logs, case details — is stored <strong>in your browser</strong> on this specific computer. Nothing sensitive goes to a server. That means:</p>
                <ul>
                    <li>Nobody else can see your data</li>
                    <li>If you clear your browser data or use a different computer, it's gone</li>
                    <li>Use the <strong>same browser on the same machine</strong> every time</li>
                    <li>Sign in with Google to back up your case profile to the cloud</li>
                    <li>Use <strong>Data Management</strong> to export a backup you can move to another device</li>
                </ul>
            </div>

            <div className="how-it-works-section">
                <h3>📋 Suggested order of operations</h3>
                <ol>
                    <li><strong>Fill out your case profile</strong> — the more detail you give, the better the AI can help you</li>
                    <li><strong>Generate your Action Plan</strong> — this creates a checklist of legal and practical steps specific to your countries</li>
                    <li><strong>Upload key documents</strong> — court orders, police reports, custody agreements go in the Evidence Locker. The AI reads them and builds your timeline automatically</li>
                    <li><strong>Use Strategy Chat when stuck</strong> — describe your problem, attach a document, get tactical advice and new tasks</li>
                    <li><strong>Log everything</strong> — every call, email, meeting goes in the Evidence Locker. It builds a court-ready chronology</li>
                    <li><strong>Draft emails with Comms HQ</strong> — professional emails to lawyers, embassies, police, government agencies</li>
                    <li><strong>Track expenses</strong> — every dollar you spend on recovery can be claimed later</li>
                    <li><strong>Build a campaign page</strong> — a public missing child page you can share</li>
                </ol>
            </div>

            <div className="how-it-works-section">
                <h3>🛠️ What each tool does</h3>
                <div className="how-grid">
                    <div><strong>Action Plan</strong><br/>Your master checklist. AI generates tasks based on your case. Check them off as you go. You can always add more.</div>
                    <div><strong>Strategy Chat</strong><br/>Like talking to someone who knows Hague Convention cases. Describe what's happening — it gives tactical advice and suggests tasks.</div>
                    <div><strong>Evidence Locker</strong><br/>Upload documents. Log calls, emails, meetings. Everything gets mapped to a timeline you can export as a PDF for your lawyer or court.</div>
                    <div><strong>Digital Vault</strong><br/>Where your uploaded files actually live. The AI extracts text from them so other tools can reference them.</div>
                    <div><strong>Comms HQ</strong><br/>Writes professional emails for you. Pick a recipient type, describe what you need, and it drafts something you can copy and send.</div>
                    <div><strong>Live Strategy Guide</strong><br/>Voice-based AI companion. Use it when you're in a crisis moment and need to talk through what's happening.</div>
                    <div><strong>Expense Tracker</strong><br/>Log every cost — legal fees, flights, investigations, admin. Exports to PDF for restitution claims.</div>
                    <div><strong>Contacts</strong><br/>Your key contacts organized by role. AI can suggest who you should be talking to based on your countries.</div>
                    <div><strong>Campaign Site</strong><br/>Creates a public missing child page with photo, story, timeline, and contact info. Shareable link.</div>
                    <div><strong>Prevention Steps</strong><br/>If abduction hasn't happened yet — enter your country and get a specific prevention checklist you can download.</div>
                    <div><strong>Support & Mental Health</strong><br/>Finds therapists, support groups, NGOs, legal aid, and financial help specific to your countries. This fight destroys your mental health — use this.</div>
                </div>
            </div>

            <div className="how-it-works-section">
                <h3>⚠️ What this is NOT</h3>
                <ul>
                    <li>This is <strong>not legal advice</strong>. Always work with a lawyer.</li>
                    <li>The AI is helpful but it can be wrong. Verify everything.</li>
                    <li>This is an MVP — it's being improved constantly based on feedback from parents using it.</li>
                </ul>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.5rem' }}>Built by a parent going through this. <a href="https://rescuecharlotte.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>rescuecharlotte.org</a></p>
        </div>
    );
};

// --- WELCOME DISCLAIMER POPUP ---

const WelcomeDisclaimer: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    return (
        <div className="welcome-overlay">
            <div className="welcome-modal compact">
                <h2>Quick heads up</h2>
                <p>This is an <strong>MVP</strong> — it works and people have found it helpful, but it's still being built. Things may break.</p>
                <p>Your data is stored <strong>locally in your browser</strong>. Nothing sensitive leaves your machine. Use the same browser and you're good.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>Built by a parent going through this. <a href="https://rescuecharlotte.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>rescuecharlotte.org</a></p>
                <button className="button-primary" onClick={onDismiss} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', fontSize: '1rem' }}>Got it</button>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [view, setView] = useState<View>('onboarding');
    const [caseProfile, setCaseProfile] = useState<CaseProfile>({
        childName: '', fromCountry: '', toCountry: '', abductionDate: '', custodyStatus: 'no-order', parentRole: 'mother', isProfileComplete: false
    });
    const [items, setItems] = useState<ActionItem[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(() => !localStorage.getItem('recoveryHubDisclaimerSeen'));

    const dismissDisclaimer = () => {
        localStorage.setItem('recoveryHubDisclaimerSeen', 'true');
        setShowDisclaimer(false);
    };

    // --- CLOUD SYNC MANAGER ---
    const syncDataToCloud = async (profile: CaseProfile, tasks: ActionItem[]) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        try {
            await setDoc(doc(db, `users/${uid}/profile/data`), profile);
            await setDoc(doc(db, `users/${uid}/data/tasks`), { items: tasks });
        } catch (e) { console.error("Sync failed", e); }
    };

    const loadDataFromCloud = async (uid: string) => {
        try {
            const profileSnap = await getDoc(doc(db, `users/${uid}/profile/data`));
            if (profileSnap.exists()) {
                const data = profileSnap.data() as CaseProfile;
                setCaseProfile(data);
                if (data.isProfileComplete) setView('dashboard');
            }
            const tasksSnap = await getDoc(doc(db, `users/${uid}/data/tasks`));
            if (tasksSnap.exists()) {
                setItems(tasksSnap.data().items);
            }
        } catch (e) { console.error("Load failed", e); }
    };

    useEffect(() => {
        const saved = localStorage.getItem('recoveryHubProfile');
        if (saved) setCaseProfile(JSON.parse(saved));
        
        const savedItems = localStorage.getItem('recoveryHubItems');
        if (savedItems) setItems(JSON.parse(savedItems));

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) { loadDataFromCloud(u.uid); }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (caseProfile.isProfileComplete) {
            localStorage.setItem('recoveryHubProfile', JSON.stringify(caseProfile));
            if (user) syncDataToCloud(caseProfile, items);
        }
    }, [caseProfile, user]); 

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('recoveryHubItems', JSON.stringify(items));
             if (user) syncDataToCloud(caseProfile, items);
        }
    }, [items, user]);

    // Track last active view for "pick up where you left off"
    useEffect(() => {
        if (view !== 'onboarding' && view !== 'dashboard') {
            localStorage.setItem('recoveryHubLastView', view);
            localStorage.setItem('recoveryHubLastActive', new Date().toISOString());
        }
    }, [view]);

    const lastView = localStorage.getItem('recoveryHubLastView') as View | null;
    const lastActive = localStorage.getItem('recoveryHubLastActive');
    const [showWelcomeBack, setShowWelcomeBack] = useState(() => {
        if (!lastView || !lastActive) return false;
        const hoursSince = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60);
        return hoursSince > 1; // Only show if they've been away more than an hour
    });

    const viewLabels: Record<string, string> = {
        myChecklist: 'Action Plan', taskBrainstormer: 'Strategy Chat', caseJournal: 'Evidence Locker',
        documentVault: 'Digital Vault', correspondence: 'Comms HQ', expenses: 'Expense Tracker',
        contactList: 'Contacts', campaignBuilder: 'Campaign Site', prevention: 'Prevention Steps',
        liveConversation: 'Live Guide', knowledgeBase: 'Knowledge Base', caseSettings: 'Settings',
        howItWorks: 'How This Works', supportResources: 'Support & Mental Health'
    };

    const handleSignIn = async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error: any) {
            console.error("Sign in error", error);
            if (error.code === 'auth/configuration-not-found' || error.code === 'auth/unauthorized-domain') {
                alert(`Offline Mode: Cloud configuration missing or domain unauthorized.\n\nIf you are the developer, go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ${window.location.hostname}`);
            } else if (error.code === 'auth/operation-not-allowed') {
                alert(`Configuration Error: Google Sign-In is disabled.\n\nGo to Firebase Console -> Authentication -> Sign-in method and enable 'Google'.`);
            } else {
                alert("Sign in failed: " + error.message);
            }
        }
    };

    const handleSignOut = async () => {
        if (confirm("Are you sure you want to sign out?")) {
            await signOut(auth);
            window.location.reload();
        }
    };

    const handleAddTask = (newTask: ActionItem) => {
        setItems(prev => [newTask, ...prev]);
    };
    
    const handleDossierUpdate = (d: DossierData) => {
        setCaseProfile(prev => {
            const history = prev.dossierHistory || [];
            return { 
                ...prev, 
                dossierData: d, 
                dossierHistory: [...history, d] 
            };
        });
    };

    const handleAddSuggestedTask = (taskText: string, priority: string) => {
        const newTask: ActionItem = {
            id: Date.now().toString(),
            category: 'AI Suggested',
            task: taskText,
            description: '',
            priority: (priority as ActionItem['priority']) || 'High',
            completed: false
        };
        setItems(prev => [newTask, ...prev]);
    };

    const handleStart = async () => {
        setIsGeneratingPlan(true);
        try {
            const prompt = `
            Act as an expert international family law strategist. Create a detailed, comprehensive Checklist of Action Items for a parent whose child has just been abducted internationally.
            
            Context:
            - Child: ${caseProfile.childName}
            - Missing From: ${caseProfile.fromCountry}
            - Taken To: ${caseProfile.toCountry}
            - Time Missing: ${caseProfile.abductionDate}
            - Custody Status: ${caseProfile.custodyStatus}
            - Abductor: ${caseProfile.abductorRelationship}
            - Additional Context: ${caseProfile.additionalContext || 'None provided'}
            - ALREADY COMPLETED ACTIONS: ${caseProfile.completedActions?.join(', ') || 'None'}

            Generate 12-15 distinct, actionable tasks.
            
            CRITICAL INSTRUCTION ON COMPLETED ITEMS:
            If an action is listed in "ALREADY COMPLETED ACTIONS" (e.g., "Filed Police Report"), DO NOT generate a task to do it again.
            Instead, generate the *follow-up* task (e.g., "Obtain Police Report Number" or "Ensure Police entered child into NCIC").
            
            Prioritize them strictly:
            - "Immediate": Critical first 24-48 hour actions (Police, Border Agencies) - IF NOT ALREADY DONE.
            - "High": First week legal actions (Hague application, Lawyer retention).
            - "Medium": Evidence gathering and logistical support.
            - "Low": Long-term administrative tasks.
            
            Include 1-2 subtasks for complex items.
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING },
                                task: { type: Type.STRING },
                                description: { type: Type.STRING },
                                priority: { type: Type.STRING },
                                subtasks: { 
                                    type: Type.ARRAY, 
                                    items: { 
                                        type: Type.OBJECT, 
                                        properties: { 
                                            id: { type: Type.STRING }, 
                                            text: { type: Type.STRING },
                                            completed: { type: Type.BOOLEAN }
                                        }
                                    } 
                                }
                            },
                            required: ["category", "task", "description", "priority"]
                        }
                    }
                }
            });
            
            const text = result.text;
            if (text) {
                const tasks = JSON.parse(text);
                const formattedTasks: ActionItem[] = tasks.map((t: any, i: number) => ({
                    id: Date.now() + i.toString(),
                    category: t.category,
                    task: t.task,
                    description: t.description,
                    priority: t.priority,
                    completed: false,
                    subtasks: t.subtasks ? t.subtasks.map((st: any, si: number) => ({ ...st, id: Date.now() + i + 'sub' + si })) : []
                }));
                setItems(formattedTasks);
                setView('myChecklist');
            }
        } catch (e) {
            console.error("Failed to generate plan", e);
            setItems([{ id: '1', category: 'Legal', task: 'File Police Report', description: 'Go to local station immediately.', priority: 'Immediate', completed: false }]);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const [publicCampaignId, setPublicCampaignId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [nudgeDismissed, setNudgeDismissed] = useState(() => !!localStorage.getItem('recoveryHubNudgeDismissed'));

    const dismissNudge = () => { setNudgeDismissed(true); localStorage.setItem('recoveryHubNudgeDismissed', 'true'); };
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('recoveryHubNotifications') === 'true');

    const toggleNotifications = async () => {
        if (notificationsEnabled) {
            setNotificationsEnabled(false);
            localStorage.removeItem('recoveryHubNotifications');
            return;
        }
        if (!('Notification' in window)) { alert('This browser does not support notifications.'); return; }
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            setNotificationsEnabled(true);
            localStorage.setItem('recoveryHubNotifications', 'true');
            new Notification('Recovery Hub', { body: 'Reminders are now active. You\'ll get a nudge if you haven\'t checked in.', icon: '🏠' });
        } else {
            alert('Notification permission denied. You can change this in your browser settings.');
        }
    };

    // Notification check-in system: fires on app load
    useEffect(() => {
        if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
        const lastVisit = localStorage.getItem('recoveryHubLastVisit');
        const now = Date.now();
        localStorage.setItem('recoveryHubLastVisit', now.toString());

        if (lastVisit) {
            const hoursSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60);
            // If 24+ hours since last visit, show "welcome back" nudge
            if (hoursSinceLastVisit >= 24 && caseProfile.childName) {
                setTimeout(() => {
                    new Notification(`Keep going for ${caseProfile.childName}`, {
                        body: `It's been ${Math.floor(hoursSinceLastVisit / 24)} day${Math.floor(hoursSinceLastVisit / 24) > 1 ? 's' : ''} since your last session. Every action counts.`,
                    });
                }, 3000);
            }
        }

        // Check for stale immediate-priority tasks
        const immediateTasks = items.filter(i => !i.completed && i.priority === 'Immediate');
        if (immediateTasks.length > 0 && lastVisit) {
            const hoursSince = (now - parseInt(lastVisit)) / (1000 * 60 * 60);
            if (hoursSince >= 8) {
                setTimeout(() => {
                    new Notification(`${immediateTasks.length} urgent task${immediateTasks.length > 1 ? 's' : ''} waiting`, {
                        body: immediateTasks[0].task,
                    });
                }, 8000);
            }
        }

        // Set an interval to remind every 4 hours while tab is open
        const interval = setInterval(() => {
            if (document.hidden && caseProfile.childName) {
                new Notification('Recovery Hub Check-In', { body: `Don't forget to log today's activity for ${caseProfile.childName}'s case.` });
            }
        }, 4 * 60 * 60 * 1000); // 4 hours

        return () => clearInterval(interval);
    }, [notificationsEnabled, caseProfile.childName, items]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const c = params.get('c');
        if (c) setPublicCampaignId(c);
    }, []);

    if (publicCampaignId) {
        return <PublicCampaignViewer id={publicCampaignId} />;
    }

    // Navigation items for the sidebar
    const navItems: { icon: string; label: string; view: View; section?: string }[] = [
        { icon: '', label: 'Dashboard', view: 'dashboard', section: 'Overview' },
        { icon: '', label: 'My Tasks', view: 'myChecklist', section: 'Case Tools' },
        { icon: '', label: 'Ask AI', view: 'taskBrainstormer' },
        { icon: '', label: 'Case Journal', view: 'caseJournal' },
        { icon: '', label: 'Uploaded Files', view: 'documentVault' },
        { icon: '', label: 'Draft Emails', view: 'correspondence' },
        { icon: '', label: 'Expenses', view: 'expenses' },
        { icon: '', label: 'Contacts', view: 'contactList' },
        { icon: '', label: 'Talk to AI', view: 'liveConversation', section: 'AI Help' },
        { icon: '', label: 'Guides & Templates', view: 'knowledgeBase' },
        { icon: '', label: 'Support & Wellbeing', view: 'supportResources' },
        { icon: '', label: 'Public Campaign', view: 'campaignBuilder', section: 'More' },
        { icon: '', label: 'Prevention', view: 'prevention' },
        { icon: '', label: 'How This Works', view: 'howItWorks' },
        { icon: '', label: 'Settings', view: 'caseSettings' },
    ];

    const navigateTo = (v: View) => { setView(v); setSidebarOpen(false); };

    // Sign-in nudge: show at key moments when not signed in
    const showSignInNudge = !user && !nudgeDismissed && caseProfile.isProfileComplete && (items.length >= 3 || view === 'expenses' || view === 'documentVault' || view === 'caseJournal');

    const renderView = () => {
        switch (view) {
            case 'onboarding': return <OnboardingWizard onComplete={(p) => { setCaseProfile(p); setView('dashboard'); }} />;
            case 'dashboard': return (
                <div className="dashboard-container">
                    {showWelcomeBack && lastView && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--md-sys-color-primary-container)', borderRadius: 'var(--md-sys-shape-corner-medium)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <span>Welcome back. You were last working on <strong>{viewLabels[lastView] || lastView}</strong>.</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => { navigateTo(lastView); setShowWelcomeBack(false); }} style={{ background: 'var(--md-sys-color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.3rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer' }}>Continue →</button>
                                <button onClick={() => setShowWelcomeBack(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>✕</button>
                            </div>
                        </div>
                    )}
                    {/* 1. STATUS BOARD (HERO) */}
                    <div className="dashboard-hero">
                        <div className="hero-top-bar">
                            <div>
                                <div className="hero-child-name">{caseProfile.childName ? `Bring ${caseProfile.childName} Home` : 'Active Recovery'}</div>
                                <div className="hero-case-route">{caseProfile.fromCountry && caseProfile.toCountry ? `${caseProfile.fromCountry} → ${caseProfile.toCountry}` : ''}{caseProfile.abductionDate ? ` · Day ${Math.floor((new Date().getTime() - new Date(caseProfile.abductionDate).getTime()) / (1000 * 3600 * 24))}` : ''}</div>
                            </div>
                            <div className="status-pill active">ACTIVE CASE</div>
                        </div>

                        <QuickCopyCard profile={caseProfile} />

                        <div className="hero-content-grid">
                             <CriticalTasksWidget items={items} onStart={handleStart} isGenerating={isGeneratingPlan} onBrainstorm={() => navigateTo('taskBrainstormer')} onViewTasks={() => navigateTo('myChecklist')} />
                             <IntelligenceBriefWidget profile={caseProfile} onUpdate={handleDossierUpdate} onAddTask={handleAddSuggestedTask} />
                        </div>
                        <MomentumTracker items={items} />
                        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                             <SimilarCasesWidget from={caseProfile.fromCountry} to={caseProfile.toCountry} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>Recovery Toolkit</h3>
                        <button onClick={() => navigateTo('howItWorks')} style={{ background: 'none', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface-variant)', borderRadius: '8px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>How This Works</button>
                    </div>

                    {/* 2. TOOL GRID */}
                    <div className="tools-grid">
                        <div className="tool-card" onClick={() => navigateTo('myChecklist')}>
                            <h3>My Tasks</h3>
                            <p>Your master checklist of legal and operational tasks.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('taskBrainstormer')}>
                            <h3>Ask AI</h3>
                            <p>Brainstorm problems and turn worries into tasks.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('caseJournal')}>
                            <h3>Case Journal</h3>
                            <p>Log calls, map documents to timeline, and export for court.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('liveConversation')}>
                            <h3>Talk to AI</h3>
                            <p>Voice-activated AI companion for crisis moments.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('expenses')}>
                            <h3>Expenses</h3>
                            <p>Log every cost for future restitution claims.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('correspondence')}>
                            <h3>Draft Emails</h3>
                            <p>Draft professional emails to authorities and lawyers.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('documentVault')}>
                            <h3>Uploaded Files</h3>
                            <p>Securely store and analyze court orders and reports.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('knowledgeBase')}>
                            <h3>Guides & Templates</h3>
                            <p>Templates, guides, and legal resources.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('campaignBuilder')}>
                            <h3>Public Campaign</h3>
                            <p>Build and host a public website to find your child.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('contactList')}>
                            <h3>Contacts</h3>
                            <p>Build and manage your list of lawyers, agencies, and key contacts.</p>
                        </div>
                        <div className="tool-card" onClick={() => navigateTo('supportResources')}>
                            <h3>Support & Wellbeing</h3>
                            <p>Find therapists, support groups, NGOs, and financial aid.</p>
                        </div>
                    </div>
                </div>
            );
            case 'myChecklist': return <MyChecklist items={items} setItems={setItems} onOpenBrainstorm={() => navigateTo('taskBrainstormer')} />;
            case 'taskBrainstormer': return <TaskBrainstormer profile={caseProfile} onAddTask={handleAddTask} items={items} />;
            case 'caseJournal': return <CaseJournal />;
            case 'expenses': return <ExpensesTracker />;
            case 'liveConversation': return <LiveGuide profile={caseProfile} items={items} onAddTask={handleAddTask} onNavigate={navigateTo} />;
            case 'correspondence': return <CorrespondenceHelper profile={caseProfile} />;
            case 'documentVault': return <DocumentVault />;
            case 'knowledgeBase': return <KnowledgeBaseBuilder />;
            case 'campaignBuilder': return <CampaignSiteBuilder profile={caseProfile} />;
            case 'caseSettings': return <CaseSettings profile={caseProfile} setProfile={setCaseProfile} />;
            case 'termsOfService': return <TermsOfService />;
            case 'dataManagement': return <DataManagement />;
            case 'contactList': return <ContactListBuilder profile={caseProfile} />;
            case 'prevention': return <PreventionSteps profile={caseProfile} onBack={() => navigateTo('dashboard')} />;
            case 'howItWorks': return <HowItWorks onBack={() => navigateTo('dashboard')} />;
            case 'supportResources': return <SupportResources profile={caseProfile} />;
            default: return <div>View Not Found</div>;
        }
    };

    // Sidebar rendering
    const renderSidebar = () => {
        let currentSection = '';
        return navItems.map((item, i) => {
            const sectionLabel = item.section && item.section !== currentSection ? item.section : null;
            if (item.section) currentSection = item.section;
            return (
                <React.Fragment key={item.view}>
                    {sectionLabel && <div className="sidebar-section-label">{sectionLabel}</div>}
                    <button className={`sidebar-link${view === item.view ? ' active' : ''}`} onClick={() => navigateTo(item.view)}>
                        {item.label}
                    </button>
                </React.Fragment>
            );
        });
    };

    return (
        <div className="app-container">
            {showDisclaimer && <WelcomeDisclaimer onDismiss={dismissDisclaimer} />}

            {/* Mobile overlay */}
            {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}

            {/* Mobile top bar */}
            <div className="mobile-topbar">
                <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                <h1>Recovery Hub</h1>
                <div style={{ width: '30px' }} />
            </div>

            {/* Sidebar Navigation */}
            <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
                <div className="sidebar-brand" onClick={() => navigateTo('dashboard')}>
                    <h1>Recovery Hub</h1>
                    <p className="sidebar-case">{caseProfile.childName ? `Case: ${caseProfile.childName}` : 'New Case'}</p>
                </div>
                <nav className="sidebar-nav">
                    {renderSidebar()}
                </nav>
                <div className="sidebar-footer">
                    {user ? (
                        <button className="sidebar-auth-btn signed-in" onClick={() => handleSignOut()} title="Click to Sign Out">
                            <img src={user.photoURL || ''} alt="" /> {user.displayName?.split(' ')[0] || 'Signed In'}
                            <span className="cloud-dot" style={{ marginLeft: 'auto' }} />
                        </button>
                    ) : (
                        <>
                            <button className="sidebar-auth-btn sign-in" onClick={handleSignIn}>
                                ☁️ Sign In to Save
                            </button>
                            {!nudgeDismissed && caseProfile.isProfileComplete && (
                                <div className="sidebar-nudge">
                                    <strong>💡 Your data is local only</strong>
                                    Sign in with Google to back up your case across devices and never lose your work.
                                </div>
                            )}
                        </>
                    )}
                    {'Notification' in window && (
                        <button onClick={toggleNotifications} style={{ marginTop: '0.5rem', background: 'none', border: '1px solid rgba(200,216,232,0.2)', color: notificationsEnabled ? '#93c5fd' : 'rgba(200,216,232,0.5)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '8px', width: '100%', textAlign: 'center', transition: 'all 0.2s' }}>
                            {notificationsEnabled ? '🔔 Reminders On' : '🔕 Enable Reminders'}
                        </button>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => navigateTo('dataManagement')} style={{ background: 'none', border: 'none', color: 'rgba(200,216,232,0.5)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>Data</button>
                        <span style={{ color: 'rgba(200,216,232,0.3)' }}>·</span>
                        <button onClick={() => navigateTo('termsOfService')} style={{ background: 'none', border: 'none', color: 'rgba(200,216,232,0.5)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>Terms</button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="app-content-area">
                <main>
                    {/* Sign-in nudge banner at key data entry points */}
                    {showSignInNudge && (
                        <div className="signin-nudge-banner">
                            <span>☁️</span>
                            <span style={{ flex: 1 }}>Your work is saved locally. <strong>Sign in</strong> to back it up and access from any device.</span>
                            <button onClick={handleSignIn}>Sign In</button>
                            <button className="nudge-dismiss" onClick={dismissNudge}>✕</button>
                        </div>
                    )}
                    {view === 'prevention' ? <PreventionSteps profile={caseProfile} onBack={() => navigateTo(caseProfile.isProfileComplete ? 'dashboard' : 'onboarding')} /> : caseProfile.isProfileComplete ? renderView() : <OnboardingWizard onComplete={(p) => { setCaseProfile(p); setView('dashboard'); }} onPreventionClick={() => setView('prevention')} />}
                </main>

                <footer className="app-footer">
                    <div className="footer-content">
                        <div>
                            <h3>A Note from the Creator</h3>
                            <p>My name is Scott. I'm not an expert on child abduction, and I didn't go through and put together every right answer for every situation. In fact, one thing I learned is that almost every resource was wrong. I work in AI and build AI tools, so this seemed like a natural thing to build.</p>
                            <p>I'm building this because I wished I had not been so alone when I started. As I'm writing this, I am still trying to recover my daughter. For context, you can learn about my situation at <a href="https://rescuecharlotte.org" target="_blank">rescuecharlotte.org</a>.</p>
                        </div>
                        <div>
                            <h3>Quick Links</h3>
                            <div className="footer-links">
                               <a onClick={() => navigateTo('dashboard')}>Home</a>
                               <a onClick={() => navigateTo('howItWorks')}>How This Works</a>
                               <a onClick={() => navigateTo('knowledgeBase')}>Knowledge Base</a>
                               <a onClick={() => navigateTo('dataManagement')}>Data Management</a>
                               <a onClick={() => navigateTo('termsOfService')}>Terms of Service</a>
                            </div>
                        </div>
                    </div>
                    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
                        <div className="disclaimer-block">
                            <strong>LEGAL DISCLAIMER:</strong> This tool uses Artificial Intelligence to help organize information and draft documents. It is not a substitute for a qualified attorney. International family law is complex and fact-specific. Always consult with legal counsel in both the home and destination countries.
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(160,174,192,0.5)', marginTop: '1.5rem' }}>Recovery Hub v0.5.0</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<ErrorBoundary><App /><Analytics /></ErrorBoundary>);