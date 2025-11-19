
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, LiveServerMessage, Modality, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, writeBatch, getDoc, deleteDoc, query, where, setDoc, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInAnonymously } from "firebase/auth";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- FIREBASE INITIALIZATION ---
// Your web app's Firebase configuration
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
type View = 'onboarding' | 'dashboard' | 'liveConversation' | 'knowledgeBase' | 'termsOfService' | 'dataManagement' | 'myChecklist' | 'caseJournal' | 'expenses' | 'correspondence' | 'caseSettings' | 'documentVault' | 'campaignBuilder' | 'taskBrainstormer';
type CustodyStatus = 'no-order' | 'sole-custody-me-local' | 'joint-custody-local' | 'sole-custody-them-local' | 'sole-custody-me-foreign' | 'joint-custody-foreign' | 'sole-custody-them-foreign' | 'other';
type ParentRole = 'mother' | 'father' | 'legal-guardian' | 'other';

interface DossierData {
    summary: string;
    risk: 'High' | 'Medium' | 'Low';
    legalSystem: string;
    redFlags: string[];
    lastUpdated?: string;
}

interface CaseProfile {
    childName: string;
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
    dossierData?: DossierData; 
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
    template?: string;
    tags?: string[];
}

interface VaultDocument {
    id: string;
    name: string;
    type: string; // 'Court Order', 'Police Report', etc.
    date: string; // The ACTUAL date on the document
    summary: string;
    extractedText: string; // For RAG
    fileType: string;
    size: number;
    uploadedAt: string;
    cloudUrl?: string; // If stored in Firebase Storage
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    suggestedTasks?: ActionItem[];
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

// --- AI CLIENT ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- COMPONENTS ---

const IntelligenceBriefWidget: React.FC<{ profile: CaseProfile, onRefresh: (data: DossierData) => void }> = ({ profile, onRefresh }) => {
    const [loading, setLoading] = useState(false);

    const refreshAnalysis = async () => {
        setLoading(true);
        try {
            const prompt = `
            Analyze the international child abduction case from ${profile.fromCountry} to ${profile.toCountry}.
            Date Taken: ${profile.abductionDate}.
            
            Provide a structured risk assessment.
            Return JSON:
            {
                "risk": "High" | "Medium" | "Low",
                "summary": "Brief, direct summary of the legal relationship between these countries (Hague status, etc.) and main challenges.",
                "legalSystem": "Brief description of the destination country's legal system regarding family law.",
                "redFlags": ["List 2-3 major red flags"]
            }
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            risk: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            legalSystem: { type: Type.STRING },
                            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["risk", "summary", "legalSystem", "redFlags"]
                    }
                }
            });

            const data = JSON.parse(result.text || "{}");
            onRefresh({ ...data, lastUpdated: new Date().toLocaleDateString() });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!profile.dossierData && profile.fromCountry && profile.toCountry) {
            refreshAnalysis();
        }
    }, []);

    const d = profile.dossierData;

    if (loading) {
        return (
            <div className="dossier-card">
                <div className="loading-dossier">
                    <div className="pulse-ring"></div>
                    <div>Analyzing Intelligence...</div>
                </div>
            </div>
        );
    }

    if (!d) return (
        <div className="dossier-card">
            <button className="button-secondary" onClick={refreshAnalysis}>Initialize Intelligence Brief</button>
        </div>
    );

    return (
        <div className={`dossier-card risk-${d.risk.toLowerCase()}`}>
            <div className="dossier-header">
                <strong>Assessment</strong>
                <span className="risk-badge">{d.risk} RISK</span>
            </div>
            <div className="dossier-summary">{d.summary}</div>
            {d.redFlags && d.redFlags.length > 0 && (
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <strong>⚠️ Red Flags:</strong>
                    <ul style={{ paddingLeft: '1.2rem', margin: '0.25rem 0' }}>
                        {d.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                </div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#666' }}>Updated: {d.lastUpdated || 'Just now'}</span>
                <button className="button-secondary" onClick={refreshAnalysis} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Refresh</button>
            </div>
        </div>
    );
};

const CriticalTasksWidget: React.FC<{ items: ActionItem[], onStart: () => void, isGenerating: boolean, onBrainstorm: () => void }> = ({ items, onStart, isGenerating, onBrainstorm }) => {
    // Filter for incomplete items
    const incomplete = items.filter(i => !i.completed);
    
    // Get top priorities
    const topTasks = incomplete.filter(i => i.priority === 'Immediate' || i.priority === 'High').slice(0, 3);
    
    // Get next priorities (Medium/Low) if top are done
    const nextTasks = incomplete.filter(i => i.priority !== 'Immediate' && i.priority !== 'High').slice(0, 3);

    if (items.length === 0) {
        return (
            <div className="critical-tasks-empty">
                <h4>⚠️ Action Plan Not Started</h4>
                <p>Initialize your step-by-step recovery plan now.</p>
                <button className="button-primary" onClick={onStart} disabled={isGenerating}>
                    {isGenerating ? 'Generating Plan...' : 'Generate Plan'}
                </button>
            </div>
        );
    }

    if (incomplete.length === 0) {
        return (
            <div className="critical-tasks-empty" style={{ backgroundColor: '#e8f5e9', borderColor: '#4caf50' }}>
                <h4 style={{ color: '#1b5e20' }}>All Listed Tasks Complete</h4>
                <p>The mission isn't over. Review strategy or brainstorm next steps.</p>
                <button className="button-secondary" onClick={onBrainstorm}>Brainstorm Next Actions</button>
            </div>
        );
    }

    const tasksToShow = topTasks.length > 0 ? topTasks : nextTasks;
    const title = topTasks.length > 0 ? "Top Priorities" : "Next Priorities";

    return (
        <div className="critical-tasks-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>{title}</div>
                {topTasks.length === 0 && <div style={{ fontSize: '0.7rem', color: '#4caf50', fontWeight: 'bold' }}>High Priority Cleared ✅</div>}
            </div>
            {tasksToShow.map(task => (
                <div key={task.id} className="mini-task-card">
                    <span className={`mini-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="mini-task-text">{task.task}</span>
                </div>
            ))}
            {topTasks.length === 0 && nextTasks.length === 0 && (
                <button className="button-secondary full-width" onClick={onBrainstorm} style={{marginTop: '0.5rem', fontSize: '0.85rem'}}>+ Add More Tasks</button>
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
                                 url: chunk.web.uri,
                                 source: new URL(chunk.web.uri).hostname
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

const TaskBrainstormer: React.FC<{ profile: CaseProfile, onAddTask: (task: ActionItem) => void }> = ({ profile, onAddTask }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const prompt = `
            You are a strategic advisor for a parent whose child has been abducted from ${profile.fromCountry} to ${profile.toCountry}.
            The parent has a concern: "${userMsg.text}".
            
            1. Validate their concern briefly.
            2. Suggest 1-2 concrete, actionable tasks they can do to address this specific concern.
            
            Return JSON:
            {
                "reply": "Your conversational reply here...",
                "suggestedTasks": [
                    { "category": "Legal/Prevention/Logistics", "task": "Title of task", "description": "Short description", "priority": "High/Medium" }
                ]
            }
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
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

            const data = JSON.parse(result.text || "{}");
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
    const toggleItem = (id: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    };
    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Universal Action Plan</h2>
                <button className="button-secondary" onClick={onOpenBrainstorm}>💡 Brainstorm Tasks</button>
            </div>
            <div className="items-list">
                {items.map(item => (
                    <div key={item.id} className={`action-item ${item.completed ? 'completed' : ''}`}>
                        <div className="action-item-header">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input type="checkbox" className="action-item-checkbox" checked={item.completed} onChange={() => toggleItem(item.id)} />
                                <strong>{item.task}</strong>
                            </div>
                            <span className={`action-item-priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.9rem' }}>{item.description}</p>
                    </div>
                ))}
                {items.length === 0 && <p>No items yet. Go to Dashboard to generate a plan.</p>}
            </div>
        </div>
    );
};

const DocumentVault: React.FC = () => {
    const [files, setFiles] = useState<VaultDocument[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('');

    useEffect(() => {
        // Initial load from local vault as fallback or cache
        getFilesFromLocalVault().then(setFiles);

        // If logged in, we should also fetch from Firestore to get RAG-ready docs
        if (auth.currentUser) {
            const q = query(collection(db, `users/${auth.currentUser.uid}/documents`));
            getDocs(q).then(snap => {
                const cloudDocs = snap.docs.map(d => d.data() as VaultDocument);
                // Merge logic could go here, for now just set
                if (cloudDocs.length > 0) setFiles(cloudDocs);
            });
        }
    }, []);

    const analyzeAndSaveDocument = async (file: File) => {
        setIsAnalyzing(true);
        setAnalysisStatus(`Analyzing ${file.name}...`);
        try {
            const base64 = await fileToBase64(file);
            
            // 1. Analyze with Gemini
            const prompt = `
            Analyze this document image/PDF for an international child abduction case. 
            Extract:
            1. "type": What is it? (e.g., Court Order, Police Report, Flight Ticket, ID).
            2. "date": The specific date written ON the document (YYYY-MM-DD). Scan document closely for dates. If multiple, use the most relevant one (e.g. filing date).
            3. "summary": A 2-sentence summary of the key content (who, what, when).
            4. "extractedText": The full text content you can read.
            
            Return JSON.
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        inlineData: {
                            mimeType: file.type,
                            data: base64
                        }
                    },
                    { text: prompt }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const analysis = JSON.parse(result.text || "{}");
            
            const docData: VaultDocument = {
                id: Date.now().toString(),
                name: file.name,
                type: analysis.type || 'Uncategorized',
                date: analysis.date || new Date().toISOString().split('T')[0],
                summary: analysis.summary || 'No summary available',
                extractedText: analysis.extractedText || '',
                fileType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };

            // 2. Save to Cloud (Firestore) if logged in
            if (auth.currentUser) {
                await setDoc(doc(db, `users/${auth.currentUser.uid}/documents`, docData.id), docData);
            }

            // 3. Save to Local Vault (IndexedDB) always
            await saveFileToLocalVault(docData, file);
            
            setFiles(prev => [...prev, docData]);
            setAnalysisStatus('Done!');
            setTimeout(() => setAnalysisStatus(''), 2000);

        } catch (e) {
            console.error(e);
            alert("Analysis failed. Please try again.");
            setAnalysisStatus('');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Digital Vault & RAG Context</h2>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Documents are analyzed by AI to extract dates and context for your case.</p>
            
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
                {files.length === 0 && <p>No documents yet.</p>}
                {files.map(f => (
                    <div key={f.id} className="action-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{f.name}</strong>
                            <span className="journal-badge">{f.type}</span>
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
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [newLog, setNewLog] = useState<{ type: string; description: string; people: string }>({ type: 'Phone Call', description: '', people: '' });
    const [isPolishing, setIsPolishing] = useState(false);
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'logs' | 'docs'>('all');

    useEffect(() => {
        const saved = localStorage.getItem('caseLogs');
        if (saved) setLogs(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('caseLogs', JSON.stringify(logs));
    }, [logs]);

    useEffect(() => {
        // Combine Logs and Docs for Unified Timeline
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
    }, [logs]);

    const addLog = () => {
        const entry: LogEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            type: newLog.type as any,
            description: newLog.description,
            peopleInvolved: newLog.people,
            createdAt: new Date().toISOString()
        };
        setLogs([entry, ...logs]);
        setNewLog({ type: 'Phone Call', description: '', people: '' });
    };

    const polishWithAI = async () => {
        if (!newLog.description) return;
        setIsPolishing(true);
        try {
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Rewrite this log entry to be objective, factual, and professional for a legal affidavit. Remove emotional language. Context: ${newLog.description}`
            });
            if (result.text) {
                setNewLog(prev => ({ ...prev, description: result.text! }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsPolishing(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Case Timeline & Evidence Log", 10, 10);
        let y = 20;
        timelineItems.forEach(item => {
            if (filter === 'logs' && item.timelineType !== 'log') return;
            if (filter === 'docs' && item.timelineType !== 'doc') return;

            doc.setFontSize(10);
            const dateStr = item.timelineType === 'log' ? `${item.date} ${item.time}` : new Date(item.date).toLocaleDateString();
            const typeStr = item.timelineType === 'log' ? item.type : `DOCUMENT: ${item.type}`;
            
            doc.text(`${dateStr} - ${typeStr}`, 10, y);
            y += 5;
            const desc = item.timelineType === 'log' ? item.description : `File: ${item.name}. Summary: ${item.summary}`;
            const lines = doc.splitTextToSize(desc, 180);
            doc.text(lines, 10, y);
            y += (lines.length * 5) + 5;
            
            if (y >= 280) {
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
                    <button className="button-secondary" onClick={exportPDF}>Export PDF</button>
                </div>
            </div>

            <div className="form-grid" style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
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
                    <button className="button-ai" onClick={polishWithAI} disabled={!newLog.description || isPolishing} style={{ marginTop: '0.5rem' }}>
                        {isPolishing ? 'Polishing...' : '✨ Polish for Court'}
                    </button>
                </div>
                <button className="button-primary full-width" onClick={addLog}>Add Entry</button>
            </div>

            <div className="journal-timeline">
                {timelineItems.map((item, i) => {
                    if (filter === 'logs' && item.timelineType !== 'log') return null;
                    if (filter === 'docs' && item.timelineType !== 'doc') return null;

                    const isDoc = item.timelineType === 'doc';

                    return (
                        <div key={item.id || i} className="journal-entry" style={{ borderLeft: isDoc ? '4px solid #715573' : '1px solid #e1e2ec' }}>
                            <div className="journal-meta">
                                <span className="journal-badge" style={{ backgroundColor: isDoc ? '#fbd7fc' : '#dbe2f9', color: isDoc ? '#29132d' : '#141b2c' }}>
                                    {isDoc ? `📄 ${item.type}` : item.type}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                    {isDoc ? new Date(item.date).toLocaleDateString() : `${item.date} at ${item.time}`}
                                </span>
                                {!isDoc && item.peopleInvolved && <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>with {item.peopleInvolved}</span>}
                            </div>
                            <p className="journal-description">
                                {isDoc ? (
                                    <>
                                        <strong>{item.name}</strong>
                                        <br/>
                                        {item.summary}
                                    </>
                                ) : item.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ExpensesTracker: React.FC = () => {
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [newExp, setNewExp] = useState<Partial<ExpenseEntry>>({ category: 'Legal', currency: 'USD' });

    useEffect(() => {
        const saved = localStorage.getItem('caseExpenses');
        if (saved) setExpenses(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('caseExpenses', JSON.stringify(expenses));
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

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Expense Tracker</h2>
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
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '0.5rem' }}>Date</th>
                            <th style={{ padding: '0.5rem' }}>Desc</th>
                            <th style={{ padding: '0.5rem' }}>Cat</th>
                            <th style={{ padding: '0.5rem' }}>Amt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(e => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '0.5rem' }}>{e.date}</td>
                                <td style={{ padding: '0.5rem' }}>{e.description}</td>
                                <td style={{ padding: '0.5rem' }}>{e.category}</td>
                                <td style={{ padding: '0.5rem' }}>${e.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const KnowledgeBaseBuilder: React.FC = () => {
    const [search, setSearch] = useState('');
    // Comprehensive mock data
    const entries: KnowledgeBaseEntry[] = [
        { id: '1', entryType: 'resource', name: 'Hague Convention Text (Full)', countryPair: 'Global', resourceType: 'Legal Text', tags: ['Legal', 'Treaty', 'Official'], summary: 'Full text of the 1980 Hague Convention on the Civil Aspects of International Child Abduction.' },
        { id: '2', entryType: 'guidance', name: 'US State Dept - IPCA Action Guide', countryPair: 'USA', resourceType: 'Guide', tags: ['USA', 'Government', 'First Steps'], summary: 'Official step-by-step guide from the Office of Children\'s Issues.' },
        { id: '3', entryType: 'opsec', name: 'Digital Safety & Spyware Checklist', countryPair: 'Global', resourceType: 'Security', tags: ['Safety', 'Tech', 'Privacy'], summary: 'How to secure your devices and accounts from monitoring by an abductor.' },
        { id: '4', entryType: 'resource', name: 'Reunite International (UK)', countryPair: 'UK', resourceType: 'NGO', tags: ['UK', 'Support', 'Legal Aid'], summary: 'Leading UK charity specializing in international parental child abduction.' },
        { id: '5', entryType: 'template', name: 'Police Report Filing Template', countryPair: 'Global', resourceType: 'Template', tags: ['Police', 'Documentation'], summary: 'Standardized format for filing a missing child report to ensure all key details are recorded.' },
        { id: '6', entryType: 'resource', name: 'NCMEC (National Center for Missing & Exploited Children)', countryPair: 'USA', resourceType: 'NGO', tags: ['USA', 'Support', 'Investigation'], summary: 'US-based organization providing resources and case management support.' },
        { id: '7', entryType: 'guidance', name: 'Hague Article 28 - Sample Form', countryPair: 'Global', resourceType: 'Legal Form', tags: ['Legal', 'Hague', 'Forms'], summary: 'Sample application form for return under the Hague Convention.' },
        { id: '8', entryType: 'resource', name: 'Interpol Yellow Notice Criteria', countryPair: 'Global', resourceType: 'Police', tags: ['Interpol', 'International'], summary: 'Requirements for issuing an Interpol Yellow Notice for a missing person.' },
        { id: '9', entryType: 'guidance', name: 'Selecting a Foreign Attorney', countryPair: 'Global', resourceType: 'Guide', tags: ['Legal', 'Representation'], summary: 'Questions to ask when hiring a lawyer in the destination country.' },
        { id: '10', entryType: 'prevention', name: 'Children\'s Passport Issuance Alert Program (CPIAP)', countryPair: 'USA', resourceType: 'Government', tags: ['USA', 'Prevention', 'Passport'], summary: 'US program to notify parents of passport applications for their children.' },
        { id: '11', entryType: 'resource', name: 'International Child Abduction Remedies Act (ICARA)', countryPair: 'USA', resourceType: 'Legal Text', tags: ['USA', 'Legal', 'Statute'], summary: 'US federal law implementing the Hague Convention.' },
        { id: '12', entryType: 'guidance', name: 'Japan - Hague Implementation Guide', countryPair: 'Japan', resourceType: 'Country Specific', tags: ['Japan', 'Asia', 'Hague'], summary: 'Specifics on how Japan implements the Hague Convention (since 2014).' },
        { id: '13', entryType: 'template', name: 'Left-Behind Parent Statement', countryPair: 'Global', resourceType: 'Template', tags: ['Legal', 'Affidavit'], summary: 'Template for writing a personal impact statement for court.' },
        { id: '14', entryType: 'resource', name: 'Global Legal Action Network', countryPair: 'Global', resourceType: 'NGO', tags: ['Legal', 'Human Rights'], summary: 'Network of lawyers supporting transnational human rights cases.' },
        { id: '15', entryType: 'opsec', name: 'Secure Communication Tools', countryPair: 'Global', resourceType: 'Tech', tags: ['Safety', 'Tech'], summary: 'List of encrypted messaging apps and secure email providers.' }
    ];

    const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Community Knowledge Base</h2>
            <p>A curated library of legal texts, government guides, and operational security templates.</p>
            <input type="text" placeholder="Search resources, guides, legal texts..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div className="tools-grid">
                {filtered.map(entry => (
                    <div key={entry.id} className="dossier-card" style={{ minHeight: '180px' }}>
                        <div className="section-header">{entry.resourceType}</div>
                        <h4 style={{ margin: '0.5rem 0' }}>{entry.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#555' }}>{entry.summary}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                            {entry.tags?.map(t => <span key={t} className="journal-badge" style={{ fontSize: '0.65rem' }}>{t}</span>)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LiveGuide: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [logs, setLogs] = useState<string[]>([]);
    
    // Audio Context Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const connect = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup Audio Visualizer
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceNodeRef.current.connect(analyserRef.current);
            drawVisualizer();

            const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.API_KEY}`);
            
            ws.onopen = () => {
                setConnected(true);
                setLogs(prev => [...prev, "Connected to Gemini Live Strategy Guide..."]);
                ws.send(JSON.stringify({ setup: { model: "models/gemini-2.5-flash-native-audio-preview-09-2025" } }));
            };

            ws.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    // Handle audio response
                    const arrayBuffer = await event.data.arrayBuffer();
                     const audioBuffer = await decodeAudioData(
                        new Uint8Array(arrayBuffer),
                        audioContextRef.current!,
                        24000,
                        1,
                    );
                    // Play audio logic would go here (using AudioBufferSourceNode)
                } else {
                     // Text logic
                }
            };

            // Recorder logic to send audio chunks
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                    const buffer = await e.data.arrayBuffer();
                    const base64 = encode(new Uint8Array(buffer));
                    ws.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: "audio/pcm", data: base64 }] } }));
                }
            };
            mediaRecorder.start(100);

        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev, "Connection Failed."]);
        }
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            if (!ctx) return;
            ctx.fillStyle = '#e1e2ec'; // Surface Variant
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#005ac1'; // Primary
            ctx.beginPath();
            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;
            for(let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };
        draw();
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Live Strategy Guide</h2>
            <p>Speak directly with the AI to plan your next move or de-escalate a situation.</p>
            <canvas ref={canvasRef} className="audio-visualizer" width="600" height="100"></canvas>
            {!connected ? (
                <button className="button-primary" onClick={connect}>Start Voice Session</button>
            ) : (
                <div className="status-pill active">Listening...</div>
            )}
            <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', color: '#666' }}>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};

const CorrespondenceHelper: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [draft, setDraft] = useState('');
    const [recipient, setRecipient] = useState('');
    const [topic, setTopic] = useState('');
    const [context, setContext] = useState('');
    const [includeOverview, setIncludeOverview] = useState(true);
    const [tone, setTone] = useState('Firm');
    const [generating, setGenerating] = useState(false);

    const generateDraft = async () => {
        setGenerating(true);
        try {
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
            
            Instructions:
            ${includeOverview ? "- Start with a standard paragraph stating the child's name, abduction date, and location." : "- Do NOT include the standard intro paragraph."}
            - Ensure the subject line includes Case IDs if available.
            - Keep it professional, clear, and action-oriented.
            `;
            
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt
            });
            setDraft(result.text || '');
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Comms HQ</h2>
            <p>Draft professional emails to lawyers, police, and government agencies.</p>
            
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
                    {generating ? 'Drafting...' : '✨ Generate Email Draft'}
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

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Case Profile & IDs</h2>
            
            <div className="form-grid" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
                <div>
                    <label>Child's Name</label>
                    <input type="text" value={editProfile.childName} onChange={e => setEditProfile({...editProfile, childName: e.target.value})} />
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

            <h3>Case IDs</h3>
            <div className="form-grid">
                <input type="text" placeholder="Agency (e.g. FBI)" value={newKey} onChange={e => setNewKey(e.target.value)} />
                <input type="text" placeholder="Case Number" value={newVal} onChange={e => setNewVal(e.target.value)} />
                <button className="button-secondary" onClick={addNum}>Add ID</button>
            </div>
            <div className="id-list">
                {Object.entries(nums).map(([k, v]) => (
                    <div key={k} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}><strong>{k}:</strong> {v}</div>
                ))}
            </div>
        </div>
    );
};

const CampaignSiteBuilder: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [story, setStory] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

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
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleAutoDraft = async () => {
        setDrafting(true);
        try {
             const prompt = `
             Write a compelling, emotional, but factual public statement for a missing child website.
             Child: ${profile.childName}
             Missing From: ${profile.fromCountry}
             Taken To: ${profile.toCountry}
             Date: ${profile.abductionDate}
             
             Focus on the human element, the parent's love, and the urgent need for return. 
             Ask for help clearly. Keep it under 250 words.
             `;
             const result = await ai.models.generateContent({
                 model: "gemini-2.5-flash",
                 contents: prompt
             });
             if (result.text) setStory(result.text);
        } catch (e) {
            console.error(e);
        } finally {
            setDrafting(false);
        }
    };

    const publish = async () => {
        setLoading(true);
        try {
            let uid = auth.currentUser?.uid;
            let dbWriteSuccess = false;

            if (!uid) {
                // If not logged in, try sign in anonymously
                try {
                    const cred = await signInAnonymously(auth);
                    uid = cred.user.uid;
                } catch (authErr: any) {
                    console.warn("Cloud Auth failed, failing back to Local Storage.", authErr);
                    if (authErr.code === 'auth/configuration-not-found' || authErr.code === 'auth/unauthorized-domain') {
                        alert(`Offline Mode: Cloud configuration missing or domain unauthorized. Saving locally. \n\nIf you are the developer, ensure ${window.location.hostname} is added to Firebase Authorized Domains.`);
                    } else if (authErr.code === 'auth/operation-not-allowed') {
                         alert(`Configuration Error: Anonymous Sign-In is disabled.\n\nGo to Firebase Console -> Authentication -> Sign-in method and enable 'Anonymous'.`);
                    }
                }
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
                createdAt: new Date().toISOString(),
                ownerUid: uid || 'local_user'
            };

            // Try Firestore write if we have a UID
            if (uid) {
                try {
                    await setDoc(doc(db, 'campaigns', id), campaignData);
                    dbWriteSuccess = true;
                } catch (dbErr) {
                     console.warn("Firestore write failed", dbErr);
                }
            }

            // Always save to Local Storage as a fallback or for local preview
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
        const previewData = {
            childName: profile.childName,
            story, photo, fromCountry: profile.fromCountry, toCountry: profile.toCountry, contactEmail: email, contactPhone: phone
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
            <p>Create and host a public webpage for your case instantly. Share this link with press and social media.</p>
            
            <label style={{ display: 'block', marginBottom: '0.5rem' }}><strong>1. Hero Photo</strong></label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {photo && <img src={photo} style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />}
            
            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem' }}><strong>2. Public Story</strong></label>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>Different from your legal journal. Focus on the child.</p>
            <textarea placeholder="Write your public story here..." value={story} onChange={e => setStory(e.target.value)} rows={6} className="full-width" />
            <button className="button-ai" onClick={handleAutoDraft} disabled={drafting} style={{ marginTop: '0.5rem' }}>
                {drafting ? 'Writing...' : '✨ Auto-Draft with AI'}
            </button>
            
            <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '0.5rem' }}><strong>3. Public Contact Info (Call to Action)</strong></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input type="email" placeholder="Public Email (e.g. find.charlotte@gmail.com)" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="tel" placeholder="Public Phone (Optional)" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666' }}>Leave blank if you don't want to share contact info.</p>

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
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.5rem 0 0 0' }}>Copy this link and share it.</p>
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
        if (previewData) {
            setData(previewData);
            setLoading(false);
            return;
        }
        
        const fetchData = async () => {
            try {
                // Try Firestore First
                try {
                    const snap = await getDoc(doc(db, 'campaigns', id));
                    if (snap.exists()) {
                        setData(snap.data());
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn("Firestore read failed, checking local storage", err);
                }

                // Fallback to Local Storage
                const local = localStorage.getItem(`LOCAL_CAMPAIGN_${id}`);
                if (local) {
                    setData(JSON.parse(local));
                } else {
                    setError("Campaign not found. (Check internet connection if this is a remote link)");
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
            <nav style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <strong style={{ fontSize: '1.2rem', color: '#b3261e' }}>MISSING CHILD ALERT</strong>
            </nav>
            <div className="app-container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
                <div className="hero-content-grid" style={{ alignItems: 'center' }}>
                    {data.photo ? (
                         <img src={data.photo} alt="Missing Child" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    ) : (
                         <div style={{ width: '100%', height: '300px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>No Photo Available</div>
                    )}
                    <div>
                        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', lineHeight: 1.1 }}>Help Bring {data.childName} Home</h1>
                        <p style={{ fontSize: '1.1rem', color: '#555' }}>Missing from <strong>{data.fromCountry}</strong> to <strong>{data.toCountry}</strong></p>
                        <div style={{ backgroundColor: '#fef7ff', padding: '1.5rem', borderRadius: '12px', marginTop: '1rem' }}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{data.story}</p>
                        </div>
                        
                        <div style={{ marginTop: '2rem', backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0, color: '#333' }}>Contact Info</h3>
                            {data.contactEmail && <p style={{marginBottom: '0.5rem'}}><strong>Email:</strong> <a href={`mailto:${data.contactEmail}`}>{data.contactEmail}</a></p>}
                            {data.contactPhone && <p style={{margin: 0}}><strong>Phone:</strong> <a href={`tel:${data.contactPhone}`}>{data.contactPhone}</a></p>}
                            {!data.contactEmail && !data.contactPhone && <p style={{ fontStyle: 'italic', color: '#666' }}>No direct contact info provided. Please contact local authorities.</p>}
                        </div>
                    </div>
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
    const clearData = () => {
        if (confirm("Are you sure you want to wipe all local data? This cannot be undone.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Data Management</h2>
            <p>Your privacy and safety are our top priority. You have full control over your data.</p>
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ffccbc', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                <h3 style={{ color: '#d84315', marginTop: 0 }}>Danger Zone</h3>
                <p>This will permanently delete all Case Profiles, Journals, and Checklists stored on this browser.</p>
                <button className="button-danger" onClick={clearData}>Wipe All Local Data</button>
            </div>
        </div>
    );
};

const OnboardingWizard: React.FC<{ onComplete: (p: CaseProfile) => void }> = ({ onComplete }) => {
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
                // Use the same analysis pipeline as the Vault
                 const base64 = await fileToBase64(file);
                 const prompt = `
                 Analyze this legal document. Extract:
                 1. "type": Document Type (Court Order, Report, etc.)
                 2. "date": The specific date written ON the document (YYYY-MM-DD). If multiple, choose the filing date.
                 3. "summary": One sentence summary.
                 Return JSON.
                 `;
                 
                 const result = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: prompt }
                    ],
                    config: { responseMimeType: "application/json" }
                 });
                 
                 const analysis = JSON.parse(result.text || "{}");
                 
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
                
                // Save to cloud if logged in, local if not
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
                        <button className="button-secondary" onClick={() => onComplete({ ...data, isSkipped: true } as any)}>Skip (Professional Mode)</button>
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
                        {analyzingDoc && <div style={{ fontSize: '0.8rem', color: '#005ac1' }}>Analyzing document... please wait...</div>}
                    
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


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [view, setView] = useState<View>('onboarding');
    const [caseProfile, setCaseProfile] = useState<CaseProfile>({
        childName: '', fromCountry: '', toCountry: '', abductionDate: '', custodyStatus: 'no-order', parentRole: 'mother', isProfileComplete: false
    });
    const [items, setItems] = useState<ActionItem[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

    // --- CLOUD SYNC MANAGER ---
    const syncDataToCloud = async (profile: CaseProfile, tasks: ActionItem[]) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        try {
            // Save Profile
            await setDoc(doc(db, `users/${uid}/profile/data`), profile);
            // Save Tasks (batch)
            await setDoc(doc(db, `users/${uid}/data/tasks`), { items: tasks });
        } catch (e) {
            console.error("Sync failed", e);
        }
    };

    const loadDataFromCloud = async (uid: string) => {
        try {
            // 1. Load Profile
            const profileSnap = await getDoc(doc(db, `users/${uid}/profile/data`));
            if (profileSnap.exists()) {
                const data = profileSnap.data() as CaseProfile;
                setCaseProfile(data);
                // If profile exists, go to dashboard
                if (data.isProfileComplete) setView('dashboard');
            }

            // 2. Load Tasks
            const tasksSnap = await getDoc(doc(db, `users/${uid}/data/tasks`));
            if (tasksSnap.exists()) {
                setItems(tasksSnap.data().items);
            }
            
            // 3. Documents are loaded by the DocumentVault component independently
        } catch (e) {
            console.error("Load failed", e);
        }
    };

    useEffect(() => {
        // Initial Local Load
        const saved = localStorage.getItem('recoveryHubProfile');
        if (saved) setCaseProfile(JSON.parse(saved));
        
        const savedItems = localStorage.getItem('recoveryHubItems');
        if (savedItems) setItems(JSON.parse(savedItems));

        // Auth Listener
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) {
                // User just logged in. Pull data from cloud.
                // Note: We rely on cloud data overwriting local data if it exists.
                loadDataFromCloud(u.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync on Change (if logged in)
    useEffect(() => {
        if (caseProfile.isProfileComplete) {
            localStorage.setItem('recoveryHubProfile', JSON.stringify(caseProfile));
            if (user) syncDataToCloud(caseProfile, items);
        }
    }, [caseProfile, user]); // Sync profile changes

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('recoveryHubItems', JSON.stringify(items));
             if (user) syncDataToCloud(caseProfile, items);
        }
    }, [items, user]); // Sync task changes

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

    const handleAddTask = (newTask: ActionItem) => {
        setItems(prev => [newTask, ...prev]);
        setView('myChecklist');
    };
    
    const handleDossierRefresh = (d: DossierData) => {
        setCaseProfile(prev => ({ ...prev, dossierData: d }));
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
            
            Tailor the tasks specifically to the context provided (e.g. if medical issues are mentioned, add medical tasks).
            `;

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
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
                                priority: { type: Type.STRING }
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
                    id: Date.now().toString() + i,
                    category: t.category,
                    task: t.task,
                    description: t.description,
                    priority: t.priority,
                    completed: false
                }));
                setItems(formattedTasks);
                setView('myChecklist');
            }
        } catch (e) {
            console.error("Failed to generate plan", e);
            // Fallback only if AI fails completely
            setItems([{ id: '1', category: 'Legal', task: 'File Police Report', description: 'Go to local station immediately.', priority: 'Immediate', completed: false }]);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    // Check for Public Campaign URL
    const [publicCampaignId, setPublicCampaignId] = useState<string | null>(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const c = params.get('c');
        if (c) setPublicCampaignId(c);
    }, []);

    if (publicCampaignId) {
        return <PublicCampaignViewer id={publicCampaignId} />;
    }

    const renderView = () => {
        switch (view) {
            case 'onboarding': return <OnboardingWizard onComplete={(p) => { setCaseProfile(p); setView('dashboard'); }} />;
            case 'dashboard': return (
                <div className="tools-grid">
                    <div className="dashboard-hero full-width">
                        <div className="hero-top-bar">
                            <div className="day-counter">DAY {caseProfile.abductionDate ? Math.floor((new Date().getTime() - new Date(caseProfile.abductionDate).getTime()) / (1000 * 3600 * 24)) : 0} OF RECOVERY</div>
                            <div className="status-pill active">ACTIVE CASE</div>
                        </div>
                        <div className="hero-content-grid">
                             <CriticalTasksWidget items={items} onStart={handleStart} isGenerating={isGeneratingPlan} onBrainstorm={() => setView('taskBrainstormer')} />
                             <IntelligenceBriefWidget profile={caseProfile} onRefresh={handleDossierRefresh} />
                        </div>
                        <div style={{ marginTop: '2rem', borderTop: '1px solid #e1e2ec', paddingTop: '1.5rem' }}>
                             <SimilarCasesWidget from={caseProfile.fromCountry} to={caseProfile.toCountry} />
                        </div>
                    </div>
                    
                    <div className="tool-card" onClick={() => setView('myChecklist')}><h3>📋 Action Plan</h3></div>
                    <div className="tool-card" onClick={() => setView('taskBrainstormer')}><h3>💡 Strategy & Task Brainstorming</h3></div>
                    <div className="tool-card" onClick={() => setView('caseJournal')}><h3>Case Timeline</h3></div>
                    <div className="tool-card" onClick={() => setView('liveConversation')}><h3>Live Strategy Guide</h3></div>
                    <div className="tool-card" onClick={() => setView('expenses')}><h3>Expense Tracker</h3></div>
                    <div className="tool-card" onClick={() => setView('correspondence')}><h3>Comms HQ</h3></div>
                    <div className="tool-card" onClick={() => setView('documentVault')}><h3>Digital Vault</h3></div>
                    <div className="tool-card" onClick={() => setView('knowledgeBase')}><h3>Knowledge Base</h3></div>
                    <div className="tool-card" onClick={() => setView('campaignBuilder')}><h3>Campaign Site</h3></div>
                </div>
            );
            case 'myChecklist': return <MyChecklist items={items} setItems={setItems} onOpenBrainstorm={() => setView('taskBrainstormer')} />;
            case 'taskBrainstormer': return <TaskBrainstormer profile={caseProfile} onAddTask={handleAddTask} />;
            case 'caseJournal': return <CaseJournal />;
            case 'expenses': return <ExpensesTracker />;
            case 'liveConversation': return <LiveGuide />;
            case 'correspondence': return <CorrespondenceHelper profile={caseProfile} />;
            case 'documentVault': return <DocumentVault />;
            case 'knowledgeBase': return <KnowledgeBaseBuilder />;
            case 'campaignBuilder': return <CampaignSiteBuilder profile={caseProfile} />;
            case 'caseSettings': return <CaseSettings profile={caseProfile} setProfile={setCaseProfile} />;
            case 'termsOfService': return <TermsOfService />;
            case 'dataManagement': return <DataManagement />;
            default: return <div>View Not Found</div>;
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-branding" onClick={() => setView('dashboard')}>
                    <h1>Recovery Hub</h1>
                    <p className="subtitle">Case: {caseProfile.childName || 'New'}</p>
                </div>
                <nav className="header-nav">
                    <a onClick={() => setView('dashboard')}>Dashboard</a>
                    <a onClick={() => setView('myChecklist')}>Tasks</a>
                    <a onClick={() => setView('caseJournal')}>Evidence</a>
                    <a onClick={() => setView('caseSettings')}>Settings</a>
                </nav>
                <div className="auth-widget">
                    {user ? <div className="user-pill"><img src={user.photoURL || ''} /> {user.displayName}</div> : <button className="button-secondary small-auth-btn" onClick={handleSignIn}>Sign In / Save Case</button>}
                </div>
            </header>

            <main>
                {caseProfile.isProfileComplete ? renderView() : (view === 'onboarding' ? renderView() : setView('onboarding'))}
            </main>

            <footer className="app-footer">
                <div className="footer-content">
                    <div>
                        <h3>A Note from the Creator</h3>
                        <p>My name is Scott. I'm not an expert on child abduction, and I didn't go through and put together every right answer for every situation. In fact, one thing I learned is that almost every resource was wrong. I work in AI and build AI tools, so this seemed like a natural thing to build. AI isn't set up for this, but neither is the government, Google, or anything else. There is no perfect guide.</p>
                        <p>I'm building this because I wished I had not been so alone when I started. As I'm writing this, I am still trying to recover my daughter. I'm not making this from a place of success, but as a work-in-progress because I know this is help people need. Read the Terms of Service. For context, you can learn about my situation at <a href="https://rescuecharlotte.org" target="_blank">rescuecharlotte.org</a>.</p>
                    </div>
                    <div>
                        <h3>Navigation</h3>
                        <div className="footer-links">
                           <a onClick={() => setView('dashboard')}>Home</a>
                           <a onClick={() => setView('knowledgeBase')}>Knowledge Base</a>
                           <a onClick={() => setView('dataManagement')}>Data Management</a>
                           <a onClick={() => setView('termsOfService')}>Terms of Service</a>
                        </div>
                    </div>
                </div>
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem' }}>
                    <div className="disclaimer-block">
                        <strong>LEGAL DISCLAIMER:</strong> This tool uses Artificial Intelligence to help organize information and draft documents. It is not a substitute for a qualified attorney. International family law is complex and fact-specific. Always consult with legal counsel in both the home and destination countries.
                    </div>
                </div>
            </footer>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
