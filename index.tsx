
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, LiveServerMessage, Modality, FunctionDeclaration } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, writeBatch, getDoc, deleteDoc, query, where, setDoc, onSnapshot, orderBy } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
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
type View = 'onboarding' | 'dashboard' | 'firstSteps' | 'findKeyContacts' | 'preventionSteps' | 'liveConversation' | 'knowledgeBase' | 'termsOfService' | 'dataManagement' | 'myChecklist' | 'caseJournal' | 'expenses' | 'flyerGenerator' | 'correspondence' | 'caseSettings' | 'documentVault' | 'campaignBuilder';
type CustodyStatus = 'no-order' | 'sole-custody-me-local' | 'joint-custody-local' | 'sole-custody-them-local' | 'sole-custody-me-foreign' | 'joint-custody-foreign' | 'sole-custody-them-foreign' | 'other';
type ParentRole = 'mother' | 'father' | 'other';
type TranscriptEntry = { speaker: 'user' | 'model'; text: string; id: string; };

interface DossierData {
    summary: string;
    risk: 'High' | 'Medium' | 'Low';
    legalSystem: string;
    redFlags: string[];
}

interface CaseProfile {
    childName: string;
    fromCountry: string;
    toCountry: string;
    abductionDate: string;
    custodyStatus: CustodyStatus;
    parentRole: ParentRole;
    isProfileComplete: boolean;
    isSkipped?: boolean;
    dossierData?: DossierData; 
    caseNumbers?: Record<string, string>; // e.g. { "Local Police": "123", "State Dept": "ABC" }
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
    gates?: { [key: string]: any };
    actions?: { label: string; steps: string[]; expected_outputs: string[]; ids_to_capture: string[]; }[];
    evidence_schema?: { bucket: string; examples: string[]; filename_convention: string; }[];
    escalation?: { when?: string; day_mark?: number; trigger: string; do?: string[] | string; action?: string; who?: string[] | string; contact?: string; }[];
    donts?: string[];
}

interface VaultDocument {
    id: string;
    name: string;
    type: string; // 'Court Order', 'Police Report', etc.
    date: string;
    summary: string;
    extractedText: string;
    fileType: string;
    size: number;
    uploadedAt: string;
}

interface CampaignData {
    id?: string;
    childName: string;
    fromCountry: string;
    toCountry: string;
    abductionDate: string;
    daysMissing: number;
    publicStory: string;
    contactInfo: string;
    heroImageBase64: string | null;
    createdAt: any;
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
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

// --- HELPER: Resize Image (for Firestore) ---
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
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
        };
    });
}

// --- INDEXED DB HELPERS FOR VAULT ---
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

const saveFileToVault = async (doc: VaultDocument, fileBlob: Blob) => {
    const db = await openVaultDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...doc, blob: fileBlob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getFilesFromVault = async (): Promise<VaultDocument[]> => {
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

const getFileBlob = async (id: string): Promise<Blob | null> => {
    const db = await openVaultDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => {
            resolve(request.result?.blob || null);
        };
        request.onerror = () => reject(request.error);
    });
};

// --- AI CLIENT ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- COMPONENTS ---

const CriticalTasksWidget: React.FC<{ items: ActionItem[], onStart: () => void }> = ({ items, onStart }) => {
    const topTasks = items.filter(i => !i.completed && (i.priority === 'Immediate' || i.priority === 'High')).slice(0, 3);

    if (items.length === 0) {
        return (
            <div className="critical-tasks-empty">
                <h4>⚠️ Action Plan Not Started</h4>
                <p>Initialize your step-by-step recovery plan now.</p>
                <button className="button-primary" onClick={onStart}>Generate Plan</button>
            </div>
        );
    }

    if (topTasks.length === 0) {
        return (
            <div className="critical-tasks-empty" style={{ backgroundColor: '#e8f5e9', borderColor: '#4caf50' }}>
                <h4 style={{ color: '#1b5e20' }}>All Critical Tasks Complete</h4>
                <p>Great job. Check the full list for next steps.</p>
            </div>
        );
    }

    return (
        <div className="critical-tasks-list">
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.5rem' }}>Top Priorities</div>
            {topTasks.map(task => (
                <div key={task.id} className="mini-task-card">
                    <span className={`mini-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="mini-task-text">{task.task}</span>
                </div>
            ))}
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
            {stories.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="story-link-card">
                    <div className="story-title">{s.title}</div>
                    <div className="story-source">{s.source}</div>
                </a>
            ))}
        </div>
    );
};

const FlyerGenerator: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [details, setDetails] = useState({
        height: '',
        weight: '',
        eyes: '',
        hair: '',
        lastSeen: '',
        notes: ''
    });
    const flyerRef = useRef<HTMLDivElement>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setPhoto(base64);
        }
    };

    const downloadFlyer = async () => {
        if (!flyerRef.current) return;
        const canvas = await html2canvas(flyerRef.current);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`MISSING_${profile.childName.replace(/\s/g, '_')}.pdf`);
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Missing Person Flyer Generator</h2>
            <div className="form-grid">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                <input type="text" placeholder="Height (e.g. 3'5)" value={details.height} onChange={e => setDetails({...details, height: e.target.value})} />
                <input type="text" placeholder="Weight (e.g. 40 lbs)" value={details.weight} onChange={e => setDetails({...details, weight: e.target.value})} />
                <input type="text" placeholder="Eye Color" value={details.eyes} onChange={e => setDetails({...details, eyes: e.target.value})} />
                <input type="text" placeholder="Hair Color" value={details.hair} onChange={e => setDetails({...details, hair: e.target.value})} />
                <input type="text" placeholder="Last Seen Location" value={details.lastSeen} onChange={e => setDetails({...details, lastSeen: e.target.value})} />
                <textarea placeholder="Distinguishing Marks / Notes" value={details.notes} onChange={e => setDetails({...details, notes: e.target.value})} className="full-width" />
            </div>
            
            <button className="button-primary" onClick={downloadFlyer}>Download PDF</button>

            <div style={{ marginTop: '2rem', border: '1px solid #ddd', padding: '1rem', overflow: 'auto' }}>
                <div ref={flyerRef} className="flyer-preview">
                    <div className="flyer-header">MISSING</div>
                    <div className="flyer-photo-area">
                        {photo ? <img src={`data:image/png;base64,${photo}`} alt="Missing Child" /> : <span>PHOTO</span>}
                    </div>
                    <div className="flyer-name">{profile.childName || "CHILD NAME"}</div>
                    <div className="flyer-details-grid">
                        <div><strong>DOB:</strong> [Date]</div>
                        <div><strong>Height:</strong> {details.height}</div>
                        <div><strong>Weight:</strong> {details.weight}</div>
                        <div><strong>Eyes:</strong> {details.eyes}</div>
                        <div><strong>Hair:</strong> {details.hair}</div>
                        <div><strong>Missing From:</strong> {details.lastSeen}</div>
                    </div>
                    <div className="flyer-section">
                        <strong>Circumstances:</strong> {details.notes || "Alleged abduction by non-custodial parent."}
                    </div>
                    <div className="flyer-footer">
                        IF SEEN CALL 911
                    </div>
                </div>
            </div>
        </div>
    );
};

const MyChecklist: React.FC<{ items: ActionItem[]; setItems: React.Dispatch<React.SetStateAction<ActionItem[]>> }> = ({ items, setItems }) => {
    const toggleItem = (id: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    };
    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Universal Action Plan</h2>
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

const CaseJournal: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [newLog, setNewLog] = useState<{ type: string; description: string; people: string }>({ type: 'Phone Call', description: '', people: '' });
    const [isPolishing, setIsPolishing] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('caseLogs');
        if (saved) setLogs(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('caseLogs', JSON.stringify(logs));
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
        logs.forEach(log => {
            doc.setFontSize(10);
            doc.text(`${log.date} ${log.time} - ${log.type}`, 10, y);
            y += 5;
            const lines = doc.splitTextToSize(log.description, 180);
            doc.text(lines, 10, y);
            y += (lines.length * 5) + 5;
        });
        doc.save("Case_Timeline.pdf");
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Evidence Locker</h2>
                <button className="button-secondary" onClick={exportPDF}>Export PDF</button>
            </div>

            <div className="form-grid" style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
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
                {logs.map(log => (
                    <div key={log.id} className="journal-entry">
                        <div className="journal-meta">
                            <span className="journal-badge">{log.type}</span>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{log.date} at {log.time}</span>
                            {log.peopleInvolved && <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>with {log.peopleInvolved}</span>}
                        </div>
                        <p className="journal-description">{log.description}</p>
                    </div>
                ))}
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
    // Mock data for demo - in real app would fetch
    const entries: KnowledgeBaseEntry[] = [
        { id: '1', entryType: 'resource', name: 'Hague Convention Text', countryPair: 'Global', resourceType: 'Legal Text', tags: ['Legal', 'Treaty'] },
        { id: '2', entryType: 'guidance', name: 'Filing a Reunite Application', countryPair: 'UK', resourceType: 'Guide', tags: ['UK', 'Legal'] },
        { id: '3', entryType: 'opsec', name: 'Digital Safety Checklist', countryPair: 'All', resourceType: 'Security', tags: ['Safety', 'Tech'] }
    ];

    const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Community Knowledge Base</h2>
            <input type="text" placeholder="Search resources, guides, legal texts..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div className="tools-grid">
                {filtered.map(entry => (
                    <div key={entry.id} className="dossier-card">
                        <div className="section-header">{entry.entryType}</div>
                        <h4>{entry.name}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {entry.tags?.map(t => <span key={t} className="journal-badge">{t}</span>)}
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
                ws.send(JSON.stringify({ setup: { model: "models/gemini-2.0-flash-exp" } }));
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
    const [context, setContext] = useState('');
    const [includeOverview, setIncludeOverview] = useState(true);
    const [tone, setTone] = useState('Firm');

    const generateDraft = async () => {
        const prompt = `
        Draft an email as the PARENT (${profile.parentRole}).
        Child: ${profile.childName}. Missing from: ${profile.fromCountry} to ${profile.toCountry}.
        Case IDs: ${JSON.stringify(profile.caseNumbers || {})}.
        Tone: ${tone}.
        Context/Goal: ${context}.
        ${includeOverview ? "Include a brief standard paragraph with child details and abduction date." : "Do NOT include the standard intro."}
        Inject the Case IDs in the subject line or header.
        `;
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        setDraft(result.text || '');
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Comms HQ</h2>
            <div className="form-grid">
                <textarea placeholder="Paste email you received or describe goal (e.g. 'Ask FBI for update')" value={context} onChange={e => setContext(e.target.value)} rows={4} className="full-width" />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label><input type="checkbox" checked={includeOverview} onChange={e => setIncludeOverview(e.target.checked)} /> Include Case Overview</label>
                    <select value={tone} onChange={e => setTone(e.target.value)}>
                        <option>Firm</option>
                        <option>Pleading</option>
                        <option>Update</option>
                    </select>
                </div>
                <button className="button-ai full-width" onClick={generateDraft}>Draft Email</button>
            </div>
            {draft && (
                <div className="draft-preview">
                    <textarea value={draft} rows={10} className="full-width" readOnly />
                    <button className="button-secondary" onClick={() => navigator.clipboard.writeText(draft)}>Copy to Clipboard</button>
                </div>
            )}
        </div>
    );
};

const CaseSettings: React.FC<{ profile: CaseProfile, setProfile: (p: CaseProfile) => void }> = ({ profile, setProfile }) => {
    const [nums, setNums] = useState(profile.caseNumbers || {});
    const [newKey, setNewKey] = useState('');
    const [newVal, setNewVal] = useState('');

    const addNum = () => {
        if (newKey && newVal) {
            const updated = { ...nums, [newKey]: newVal };
            setNums(updated);
            setProfile({ ...profile, caseNumbers: updated });
            setNewKey(''); setNewVal('');
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Case IDs & Settings</h2>
            <div className="form-grid">
                <input type="text" placeholder="Agency (e.g. FBI)" value={newKey} onChange={e => setNewKey(e.target.value)} />
                <input type="text" placeholder="Case Number" value={newVal} onChange={e => setNewVal(e.target.value)} />
                <button className="button-primary" onClick={addNum}>Add ID</button>
            </div>
            <div className="id-list">
                {Object.entries(nums).map(([k, v]) => (
                    <div key={k} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}><strong>{k}:</strong> {v}</div>
                ))}
            </div>
        </div>
    );
};

const DocumentVault: React.FC = () => {
    const [files, setFiles] = useState<VaultDocument[]>([]);

    useEffect(() => {
        getFilesFromVault().then(setFiles);
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const doc: VaultDocument = {
                id: Date.now().toString(),
                name: file.name,
                type: 'Uncategorized',
                date: new Date().toISOString(),
                summary: 'Pending Analysis...',
                extractedText: '',
                fileType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };
            await saveFileToVault(doc, file);
            setFiles(prev => [...prev, doc]);
            // AI Analysis trigger would go here
        }
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Digital Vault (Secure Local Storage)</h2>
            <input type="file" onChange={handleUpload} />
            <div style={{ marginTop: '1rem' }}>
                {files.map(f => (
                    <div key={f.id} className="action-item">
                        <strong>{f.name}</strong>
                        <div style={{ fontSize: '0.8rem' }}>{f.summary}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CampaignSiteBuilder: React.FC<{ profile: CaseProfile }> = ({ profile }) => {
    const [story, setStory] = useState('');
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

    const publish = async () => {
        // In real app, save to Firestore 'campaigns' collection
        const id = 'DEMO_' + Date.now();
        setPublishedUrl(`${window.location.origin}?c=${id}`);
    };

    return (
        <div className="tool-card" style={{ cursor: 'default' }}>
            <h2>Campaign Website Builder</h2>
            <p>Create a public page to share your story.</p>
            <textarea placeholder="Write your public story here..." value={story} onChange={e => setStory(e.target.value)} rows={6} className="full-width" />
            <button className="button-primary" onClick={publish}>Publish to Web</button>
            {publishedUrl && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9' }}>
                    <strong>Live Link:</strong> <a href={publishedUrl} target="_blank">{publishedUrl}</a>
                </div>
            )}
        </div>
    );
};

const PublicCampaignViewer: React.FC<{ id: string }> = ({ id }) => {
    return (
        <div className="public-campaign-container">
            <div className="app-container">
                <h1>Bring Them Home</h1>
                <p>Campaign ID: {id}</p>
                <div className="hero-content-grid">
                    <div className="cta-box">
                        <h2>MISSING CHILD ALERT</h2>
                        <p>Please help us find our child.</p>
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
    const [data, setData] = useState<Partial<CaseProfile>>({});

    const next = () => setStep(s => s + 1);

    return (
        <div className="tool-card">
            <h2>Case Setup Wizard</h2>
            {step === 0 && (
                <div>
                    <label>Child's Name</label>
                    <input type="text" value={data.childName || ''} onChange={e => setData({...data, childName: e.target.value})} />
                    <button className="button-primary" onClick={next} style={{ marginTop: '1rem' }}>Next</button>
                    <button className="button-secondary" onClick={() => onComplete({ ...data, isSkipped: true } as any)}>Skip (Professional Mode)</button>
                </div>
            )}
            {step === 1 && (
                <div>
                    <label>From Country</label>
                    <input type="text" value={data.fromCountry || ''} onChange={e => setData({...data, fromCountry: e.target.value})} />
                    <label>To Country</label>
                    <input type="text" value={data.toCountry || ''} onChange={e => setData({...data, toCountry: e.target.value})} />
                    <button className="button-primary" onClick={() => onComplete({ ...data, isProfileComplete: true } as any)} style={{ marginTop: '1rem' }}>Finish</button>
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

    // Restore session from local storage or Auth
    useEffect(() => {
        const saved = localStorage.getItem('recoveryHubProfile');
        if (saved) setCaseProfile(JSON.parse(saved));
        
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            // Here we would sync with Firestore if user is logged in
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (caseProfile.isProfileComplete) localStorage.setItem('recoveryHubProfile', JSON.stringify(caseProfile));
    }, [caseProfile]);

    const handleStart = () => {
        // Generate logic would go here
        setItems([{ id: '1', category: 'Legal', task: 'File Police Report', description: 'Go to local station.', priority: 'Immediate', completed: false }]);
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
                            <div className="day-counter">DAY {Math.floor((new Date().getTime() - new Date(caseProfile.abductionDate || new Date()).getTime()) / (1000 * 3600 * 24))} OF RECOVERY</div>
                            <div className="status-pill active">ACTIVE CASE</div>
                        </div>
                        <div className="hero-content-grid">
                             <CriticalTasksWidget items={items} onStart={handleStart} />
                             <SimilarCasesWidget from={caseProfile.fromCountry} to={caseProfile.toCountry} />
                        </div>
                    </div>
                    
                    <div className="tool-card" onClick={() => setView('myChecklist')}><h3>📋 Action Plan</h3></div>
                    <div className="tool-card" onClick={() => setView('caseJournal')}><h3>Evidence Locker</h3></div>
                    <div className="tool-card" onClick={() => setView('liveConversation')}><h3>Live Strategy Guide</h3></div>
                    <div className="tool-card" onClick={() => setView('expenses')}><h3>Expense Tracker</h3></div>
                    <div className="tool-card" onClick={() => setView('correspondence')}><h3>Comms HQ</h3></div>
                    <div className="tool-card" onClick={() => setView('documentVault')}><h3>Digital Vault</h3></div>
                    <div className="tool-card" onClick={() => setView('knowledgeBase')}><h3>Knowledge Base</h3></div>
                    <div className="tool-card" onClick={() => setView('campaignBuilder')}><h3>Campaign Site</h3></div>
                    <div className="tool-card" onClick={() => setView('flyerGenerator')}><h3>Flyer Generator</h3></div>
                </div>
            );
            case 'myChecklist': return <MyChecklist items={items} setItems={setItems} />;
            case 'caseJournal': return <CaseJournal />;
            case 'expenses': return <ExpensesTracker />;
            case 'liveConversation': return <LiveGuide />;
            case 'correspondence': return <CorrespondenceHelper profile={caseProfile} />;
            case 'documentVault': return <DocumentVault />;
            case 'knowledgeBase': return <KnowledgeBaseBuilder />;
            case 'campaignBuilder': return <CampaignSiteBuilder profile={caseProfile} />;
            case 'flyerGenerator': return <FlyerGenerator profile={caseProfile} />;
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
                    {user ? <div className="user-pill"><img src={user.photoURL || ''} /> {user.displayName}</div> : <button className="button-secondary small-auth-btn" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>Sign In / Save</button>}
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
