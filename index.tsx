import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, LiveServerMessage, Modality, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, writeBatch, getDoc, deleteDoc, query, where, setDoc, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInAnonymously } from "firebase/auth";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
                <div className="tour-header" style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🤖 Task Assistant</h3>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{task.task}</div>
                    </div>
                    <button className="tour-close" onClick={onClose}>×</button>
                </div>
                
                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#f8f9fa' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: '1rem', display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ 
                                backgroundColor: m.role === 'user' ? '#1e3a5f' : 'white', 
                                color: m.role === 'user' ? 'white' : 'black',
                                padding: '0.8rem', 
                                borderRadius: '12px',
                                border: m.role === 'ai' ? '1px solid #ddd' : 'none',
                                maxWidth: '80%',
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.95rem'
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>Thinking...</div>}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid #eee', display: 'flex', gap: '0.5rem' }}>
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
                            <button onClick={() => onAddTask(s.task, s.priority)} style={{ background: 'none', border: '1px solid rgba(147,197,253,0.4)', color: '#93c5fd', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>+ Add</button>
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
    if (totalActions === 0) return null; // Don't show if no activity yet

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
            <div className="momentum-stats">
                {stats.tasksCompleted > 0 && <div className="momentum-stat"><span className="stat-number">{stats.tasksCompleted}</span><span className="stat-label">tasks done</span></div>}
                {stats.logsAdded > 0 && <div className="momentum-stat"><span className="stat-number">{stats.logsAdded}</span><span className="stat-label">evidence logged</span></div>}
                {stats.expensesLogged > 0 && <div className="momentum-stat"><span className="stat-number">{stats.expensesLogged}</span><span className="stat-label">expenses tracked</span></div>}
                {stats.docsUploaded > 0 && <div className="momentum-stat"><span className="stat-number">{stats.docsUploaded}</span><span className="stat-label">docs uploaded</span></div>}
            </div>
            <div className="momentum-bar-row">
                {activityData.slice(-14).map((d) => (
                    <div key={d.date} className="momentum-bar-col" title={`${d.date}: ${d.count} action${d.count !== 1 ? 's' : ''}`}>
                        <div className="momentum-bar" style={{ height: d.count > 0 ? Math.max(6, (d.count / maxCount) * 32) + 'px' : '3px', backgroundColor: d.count > 0 ? 'var(--md-sys-color-primary)' : '#e2e8f0' }} />
                    </div>
                ))}
            </div>
            <div className="momentum-footer">
                <span>{activeDays > 0 ? `${activeDays} active day${activeDays !== 1 ? 's' : ''} in last 2 weeks` : 'No recent activity'}</span>
                {stats.streak > 1 && <span style={{ fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>🔥 {stats.streak}-day streak</span>}
            </div>
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
            
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: '1rem', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                            backgroundColor: m.role === 'user' ? '#e1f5fe' : 'white', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: '1px solid #eee',
                            maxWidth: '80%'
                        }}>
                            <strong>{m.role === 'user' ? 'You' : 'Guide'}: </strong> {m.text}
                            
                            {m.suggestedTasks && m.suggestedTasks.length > 0 && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>SUGGESTED ACTIONS:</div>
                                    {m.suggestedTasks.map(t => (
                                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', backgroundColor: '#f1f8e9', padding: '0.5rem', borderRadius: '4px' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.task}</div>
                                                <div style={{ fontSize: '0.8rem' }}>{t.description}</div>
                                            </div>
                                            <button className="button-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => onAddTask(t)}>
                                                + Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && <div style={{ fontStyle: 'italic', color: '#666' }}>Thinking...</div>}
            </div>

            {vaultDocs.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                    <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #ddd' }}>
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
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Archived tasks are still included in PDF exports. Click restore to move back to active.</p>
                    {archivedItems.map(item => (
                        <div key={item.id} className="action-item completed">
                            <div className="action-item-header">
                                <strong className="action-item-task-text" style={{ textDecoration: 'line-through' }}>{item.task}</strong>
                                <button className="button-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => restoreItem(item.id)}>Restore</button>
                            </div>
                        </div>
                    ))}
                    {archivedItems.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No archived tasks yet. Complete a task and archive it to keep your list clean.</p>}
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
                                        <button style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer', color: '#666' }} onClick={() => archiveItem(item.id)} title="Archive">📦</button>
                                    )}
                                    <span className={`action-item-priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
                                    <button className="action-item-delete" onClick={() => deleteItem(item.id)} title="Delete Task">🗑️</button>
                                </div>
                            </div>
                            <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.9rem' }}>{item.description}</p>
                            {item.subtasks && item.subtasks.length > 0 && (
                                <div style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
                                    {item.subtasks.map(sub => (
                                        <div key={sub.id} style={{ fontSize: '0.85rem', color: '#555' }}>- {sub.text}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && <p>No items yet. Go to Dashboard to generate a plan.</p>}
                    {items.length > 0 && filteredItems.length === 0 && <p style={{ color: '#666', textAlign: 'center' }}>No tasks match your search.</p>}
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
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Documents are analyzed by AI to extract dates and context.</p>
            
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
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
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
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>Dated: {f.date}</div>
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
                 dateObj: new Date(d.date || d.uploadedAt)
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

    const deleteDoc = async (id: string) => {
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
            
            <p style={{fontSize:'0.85rem', color: '#666'}}>
                Click the Globe 🌍 icon to toggle an event as "Public" for your campaign website.
            </p>

            {/* Fixed Z-Index and Positioning for Upload Form */}
            <div className="form-grid" style={{ position: 'relative', zIndex: 10, backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #eee' }}>
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
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
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
                        <div key={item.id || i} className="journal-entry" style={{ borderLeft: isDoc ? '4px solid #715573' : '1px solid #e1e2ec' }}>
                            <div className="journal-meta" style={{width: '100%'}}>
                                <span className="journal-badge" style={{ backgroundColor: isDoc ? '#fbd7fc' : '#dbe2f9', color: isDoc ? '#29132d' : '#141b2c' }}>
                                    {isDoc ? `📄 ${item.type}` : item.type}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                    {isDoc ? new Date(item.date).toLocaleDateString() : `${item.date} at ${item.time}`}
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
                                    <button onClick={() => isDoc ? deleteDoc(item.id) : deleteLog(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ba1a1a' }} title="Delete Entry">
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
                                            <span style={{ color: '#555' }}>{item.summary}</span>
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
    const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);

    // Seed Data (If DB is empty)
    const seedData: KnowledgeBaseEntry[] = [
        { 
            id: '1', entryType: 'resource', name: 'Hague Convention Text (Full)', countryPair: 'Global', resourceType: 'Legal Text', 
            tags: ['Legal', 'Treaty', 'Official'], summary: 'Full text of the 1980 Hague Convention on the Civil Aspects of International Child Abduction.',
            fullText: `(Sample Text - Full treaty would be here)\n\nArticle 1\nThe objects of the present Convention are:\na) to secure the prompt return of children wrongfully removed to or retained in any Contracting State;\nb) to ensure that rights of custody and of access under the law of one Contracting State are effectively respected in the other Contracting States.`
        },
        { 
            id: '5', entryType: 'template', name: 'Police Report Filing Template', countryPair: 'Global', resourceType: 'Template', 
            tags: ['Police', 'Documentation'], summary: 'Standardized format for filing a missing child report to ensure all key details are recorded.',
            fullText: `MISSING CHILD REPORT - INITIAL INTAKE\n\n1. CHILD INFORMATION\nName: [Full Name]\nDOB: [Date]\nPassport #: [Number]\nLast Known Location: [Address/Country]\n\n2. ABDUCTOR INFORMATION\nName: [Name]\nRelationship: [Role]\nVehicle: [Make/Model/Plate]\n\n3. CIRCUMSTANCES\nDate/Time of Taking: [Time]\nCustody Order in Place? [Yes/No]\nDescription of Taking: [Details]\n\n4. JURISDICTION\n(Note to Officer: This is a parental abduction under federal law. Please enter child into NCIC as Missing Person - Endangered.)`
        }
    ];

    useEffect(() => {
        // Try to fetch from Cloud Firestore first (Restoring "Lost" Knowledge)
        const fetchEntries = async () => {
            try {
                const q = query(collection(db, 'knowledgeBaseEntries'));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const cloudEntries = snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeBaseEntry));
                    setEntries([...seedData, ...cloudEntries]); // Combine seed + cloud
                } else {
                    setEntries(seedData);
                }
            } catch (e) {
                console.warn("Offline or no KB permissions", e);
                setEntries(seedData);
            }
        };
        fetchEntries();
    }, []);

    const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

    const seedCloud = async () => {
        if (!auth.currentUser) { alert("Please sign in to save templates to the cloud."); return; }
        try {
            const batch = writeBatch(db);
            seedData.forEach(e => {
                const ref = doc(collection(db, 'knowledgeBaseEntries'));
                batch.set(ref, e);
            });
            await batch.commit();
            alert("Knowledge Base Seeded to Cloud!");
        } catch (e) { console.error(e); }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h2>Community Knowledge Base</h2>
                <button className="button-secondary" style={{fontSize:'0.7rem'}} onClick={seedCloud}>Restore Default Templates</button>
            </div>
            <p>A curated library of legal texts, government guides, and operational security templates. Click to view full content.</p>
            <input type="text" placeholder="Search resources, guides, legal texts..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div className="tools-grid">
                {filtered.map(entry => (
                    <div key={entry.id} className="dossier-card" style={{ minHeight: '180px', cursor: 'pointer' }} onClick={() => setSelectedEntry(entry)}>
                        <div className="section-header">{entry.resourceType}</div>
                        <h4 style={{ margin: '0.5rem 0' }}>{entry.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#555' }}>{entry.summary}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                            {entry.tags?.map(t => <span key={t} className="journal-badge" style={{ fontSize: '0.65rem' }}>{t}</span>)}
                        </div>
                    </div>
                ))}
            </div>

            {selectedEntry && (
                <div className="tour-backdrop" onClick={() => setSelectedEntry(null)}>
                    <div className="tour-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="tour-header">
                            <h3>{selectedEntry.name}</h3>
                            <button className="tour-close" onClick={() => setSelectedEntry(null)}>×</button>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            {selectedEntry.fullText || "Content preview not available in offline mode."}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="button-secondary" onClick={() => navigator.clipboard.writeText(selectedEntry.fullText || '')}>Copy to Clipboard</button>
                            <button className="button-primary" onClick={() => setSelectedEntry(null)}>Close</button>
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
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.95rem' }}>Log every dollar you spend — legal fees, flights, hotels, translators, private investigators. Under the Hague Convention, you may be able to claim restitution for these costs. The more detailed your records, the stronger your claim.</p>
                    </div>
                )}
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '0.5rem' }}>Date</th>
                            <th style={{ padding: '0.5rem' }}>Desc</th>
                            <th style={{ padding: '0.5rem' }}>Cat</th>
                            <th style={{ padding: '0.5rem' }}>Amt</th>
                            <th style={{ padding: '0.5rem', width: '30px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
            <p style={{ color: '#666', marginBottom: '1rem' }}>Tell me what's happening. I can add tasks, log evidence, save contacts, and track expenses — just by listening.</p>

            <canvas ref={canvasRef} className="audio-visualizer" width="600" height="80" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}></canvas>

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
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#999' }}>
                    {logs.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
                </div>
            )}

            {connected && (
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '0.5rem' }}>Try saying:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {[
                            "I just spoke with my lawyer",
                            "Add a task to file the Hague application",
                            "Show me my tasks",
                            "I spent $500 on legal fees",
                            "What should I do next?"
                        ].map((s, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: '#e2e8f0', borderRadius: '100px', color: '#475569' }}>{s}</span>
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

                <div className="full-width" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={includeOverview} onChange={e => setIncludeOverview(e.target.checked)} /> 
                        <strong>Include Case Overview?</strong> 
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>(Auto-adds: "{profile.childName} was taken on...")</span>
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
            
            <div className="form-grid" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
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
            <div className="form-grid" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
                <input type="text" placeholder="Agency (e.g. FBI)" value={newKey} onChange={e => setNewKey(e.target.value)} />
                <input type="text" placeholder="Case Number" value={newVal} onChange={e => setNewVal(e.target.value)} />
                <button className="button-secondary" onClick={addNum}>Add ID</button>
                <div className="id-list full-width">
                    {Object.entries(nums).map(([k, v]) => (
                        <div key={k} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}><strong>{k}:</strong> {v}</div>
                    ))}
                </div>
            </div>

            <h3>Data Management</h3>
            <div style={{ padding: '1rem', border: '1px solid #ffccbc', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                <h4 style={{ color: '#d84315', marginTop: 0 }}>Danger Zone</h4>
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
                <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', height: '600px', overflowY: 'scroll' }}>
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
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f0f0f0', marginBottom: '0.25rem', borderRadius: '4px' }}>
                        <span>{l.label}</span>
                        <button onClick={() => handleRemoveLink(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red' }}>x</button>
                    </div>
                ))}
            </div>

             <p style={{marginTop: '1.5rem', fontSize: '0.85rem', color: '#666'}}>
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
                
                {data.missingCaseNumber && <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#555' }}>CASE #: {data.missingCaseNumber}</div>}

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
                    <div style={{ margin: '2rem 0', textAlign: 'left', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
                        <h3 style={{ textAlign: 'center', textTransform: 'uppercase', color: '#333', marginBottom: '1.5rem' }}>Case Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.timeline.map((t: any, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', borderLeft: '3px solid #d32f2f', paddingLeft: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', minWidth: '100px', fontSize: '0.9rem', color: '#555' }}>{t.date}</div>
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

            <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 style={{ marginTop: 0 }}>📦 Backup & Restore</h3>
                <p style={{ fontSize: '0.9rem', color: '#555' }}>Download everything — case profile, action plan, timeline, expenses, contacts, and uploaded documents — as a single backup file. Import it on any device to pick up where you left off.</p>
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
                {importStatus && <p style={{ fontSize: '0.85rem', color: '#1e3a5f', marginTop: '0.5rem' }}>{importStatus}</p>}
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.75rem' }}>Note: Very large files (40MB+ PDFs) may make the backup file big. The backup includes your actual documents so nothing is lost.</p>
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
                         <p style={{fontSize: '0.8rem', color: '#666', marginTop: '0.2rem'}}>Select the status in the country the child was taken FROM.</p>
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
                        <p style={{fontSize: '0.9rem', color: '#666'}}>Court orders or police reports will be analyzed and saved to your Vault.</p>
                        <input type="file" onChange={handleDocUpload} accept=".pdf,image/*" style={{ marginBottom: '0.5rem' }} />
                        {analyzingDoc && <div style={{ fontSize: '0.8rem', color: '#1e3a5f' }}>Analyzing document... please wait...</div>}
                    
                        <label style={{marginTop: '1rem', display: 'block'}}>Is there anything else?</label>
                        <p style={{fontSize: '0.9rem', color: '#666'}}>Context affects strategy (e.g., "Child has medical needs," "History of domestic violence," "Abductor has dual citizenship").</p>
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
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#f8f9fa' });
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
            <p style={{ color: '#555', marginBottom: '1.5rem' }}>Worried your co-parent may try to take your child out of the country? Enter your country below and we'll generate a specific, actionable prevention checklist you can start on right now.</p>
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
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Build your team of contacts - lawyers, agencies, police, and advocates. AI can suggest key contacts based on your case countries.</p>

            <div className="form-grid" style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <input type="text" placeholder="Name / Agency" value={newContact.name || ''} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                <input type="text" placeholder="Role (e.g., FBI Agent, Lawyer)" value={newContact.role || ''} onChange={e => setNewContact({...newContact, role: e.target.value})} />
                <input type="email" placeholder="Email" value={newContact.email || ''} onChange={e => setNewContact({...newContact, email: e.target.value})} />
                <input type="tel" placeholder="Phone" value={newContact.phone || ''} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
                <input type="text" placeholder="Notes (optional)" value={newContact.notes || ''} onChange={e => setNewContact({...newContact, notes: e.target.value})} className="full-width" />
                <button className="button-primary full-width" onClick={addContact}>Add Contact</button>
            </div>

            <div>
                {contacts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
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
                            {c.notes && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>{c.notes}</div>}
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
            <p style={{ color: '#555', marginBottom: '1rem' }}>
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
                                                {r.location && <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>{r.location}</span>}
                                            </div>
                                            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#1e3a5f', whiteSpace: 'nowrap' }}>Visit →</a>}
                                        </div>
                                        <p style={{ fontSize: '0.88rem', color: '#444', margin: '0.25rem 0' }}>{r.description}</p>
                                        {r.contact && <p style={{ fontSize: '0.8rem', color: '#1e3a5f' }}>{r.contact}</p>}
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
                <p style={{ color: '#666', marginTop: '1rem' }}>No resources found. Try searching again.</p>
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
            <p style={{ color: '#555', marginBottom: '1.5rem' }}>This is a free tool built by a parent going through this. Here's what it does and how to use it.</p>

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

            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1.5rem' }}>Built by a parent going through this. <a href="https://rescuecharlotte.org" target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f' }}>rescuecharlotte.org</a></p>
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
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.75rem' }}>Built by a parent going through this. <a href="https://rescuecharlotte.org" target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f' }}>rescuecharlotte.org</a></p>
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
        setView('myChecklist');
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
                                <button onClick={() => { navigateTo(lastView); setShowWelcomeBack(false); }} style={{ background: 'var(--md-sys-color-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer' }}>Continue →</button>
                                <button onClick={() => setShowWelcomeBack(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#666' }}>✕</button>
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
                        <button onClick={toggleNotifications} style={{ marginTop: '0.5rem', background: 'none', border: '1px solid rgba(200,216,232,0.2)', color: notificationsEnabled ? '#93c5fd' : 'rgba(200,216,232,0.5)', cursor: 'pointer', fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '6px', width: '100%', textAlign: 'center', transition: 'all 0.2s' }}>
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
root.render(<ErrorBoundary><App /></ErrorBoundary>);
