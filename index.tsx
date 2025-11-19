
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
        // Store the metadata combined with the blob
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
             // Return docs without the heavy blob for listing
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
        request.onsuccess = () => resolve(request.result?.blob || null);
        request.onerror = () => reject(request.error);
    });
};
const deleteFileFromVault = async (id: string) => {
     const db = await openVaultDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}


// --- Visualizer Component ---
const AudioVisualizer = ({ stream }: { stream: MediaStream | null }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(null);
    const analyserRef = useRef<AnalyserNode>(null);
    const audioContextRef = useRef<AudioContext>(null);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyserRef.current = analyser;

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
            if (!analyserRef.current) return;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = '#e1e2ec'; 
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                const r = 0 + (dataArray[i] / 255) * 100;
                const g = 90 + (dataArray[i] / 255) * 50;
                const b = 193;
                canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
                const y = (canvas.height - barHeight) / 2;
                canvasCtx.beginPath();
                canvasCtx.roundRect(x, y, barWidth - 2, barHeight, 4);
                canvasCtx.fill();
                x += barWidth;
            }
            // @ts-ignore
            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (ctx && ctx.state !== 'closed') ctx.close();
             audioContextRef.current = null;
        };
    }, [stream]);
    return <canvas ref={canvasRef} className="audio-visualizer" width={500} height={80} />;
};


// --- UI COMPONENTS ---
const Header = ({ setView, caseProfile, user }: { setView: (view: View) => void, caseProfile: CaseProfile, user: User | null }) => {
    const handleLogin = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(console.error);
    };

    const handleLogout = () => {
        if(confirm("Sign out? Your data is safe in the cloud.")) {
            signOut(auth);
        }
    };

    return (
        <header className="app-header">
            <div className="header-branding" onClick={() => setView(caseProfile.isProfileComplete ? 'dashboard' : 'onboarding')}>
                <h1>Recovery Hub</h1>
                <p className="subtitle">
                    {caseProfile.isSkipped 
                        ? 'Professional / Research Mode' 
                        : (caseProfile.isProfileComplete ? `Case: ${caseProfile.childName}` : 'Intl. Parental Abduction Support')
                    }
                </p>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap', justifyContent:'center'}}>
                {caseProfile.isProfileComplete && (
                    <nav className="header-nav">
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('dashboard'); }}>Dashboard</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('myChecklist'); }}>Tasks</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('caseJournal'); }}>Evidence</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('campaignBuilder'); }}>Website</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('documentVault'); }}>Vault</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('correspondence'); }}>Comms</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('caseSettings'); }} title="Case Settings">⚙️</a>
                    </nav>
                )}
                <div className="auth-widget">
                    {user ? (
                        <div className="user-pill" onClick={handleLogout} title="Click to Sign Out">
                            {user.photoURL && <img src={user.photoURL} alt="Profile" />}
                            <span>{user.displayName?.split(' ')[0]}</span>
                            <div className="cloud-dot" title="Synced to Cloud"></div>
                        </div>
                    ) : (
                        <button className="button-secondary small-auth-btn" onClick={handleLogin}>
                            ☁️ Sign In / Save Case
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};


const GuidedTour = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState(0);
    const steps = [
        {
            title: "Welcome to Recovery Hub",
            content: "You are taking the first step in a difficult journey. This tool uses AI to organize your case, generate legal logs, and find specific strategy guides based on international treaties."
        },
        {
            title: "Your Privacy is First",
            content: "We understand the risks. By default, data stays on your device. However, we strongly recommend signing in with Google to back up your case file to our secure cloud, so you don't lose it if your phone is lost."
        },
        {
            title: "Why we need details",
            content: "International abduction laws (like the Hague Convention) rely entirely on the specific pair of countries involved. A generic guide won't help you. We need to know 'From Where' and 'To Where' to generate the right Intelligence Dossier."
        },
        {
            title: "Not a Parent?",
            content: "If you are a professional (Law Enforcement, Legal, NGO), you can use the 'Skip Setup' button in the wizard to enter Research Mode and access the tools without a specific case file."
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else onClose();
    };

    return (
        <div className="tour-backdrop">
            <div className="tour-card animate-fade-in">
                <div className="tour-header">
                    <h3>{steps[step].title}</h3>
                    <button onClick={onClose} className="tour-close">&times;</button>
                </div>
                <p className="tour-content-text">{steps[step].content}</p>
                <div className="tour-actions">
                    <div className="tour-dots">
                        {steps.map((_, i) => <span key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />)}
                    </div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button className="button-secondary" style={{fontSize:'0.9rem', padding:'0.5rem 1rem'}} onClick={onClose}>Skip</button>
                        <button className="button-primary" style={{fontSize:'0.9rem', padding:'0.5rem 1.5rem'}} onClick={handleNext}>
                            {step === steps.length - 1 ? "Get Started" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const OnboardingWizard = ({ onComplete }: { onComplete: (profile: CaseProfile) => void }) => {
    const [step, setStep] = useState(1);
    const [showTour, setShowTour] = useState(false);
    const [profile, setProfile] = useState<CaseProfile>({
        childName: '',
        fromCountry: '',
        toCountry: '',
        abductionDate: '',
        custodyStatus: 'no-order',
        parentRole: 'other',
        isProfileComplete: false,
        caseNumbers: {}
    });

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('has_seen_onboarding_tour');
        if (!hasSeenTour) {
            setShowTour(true);
        }
    }, []);

    const handleCloseTour = () => {
        localStorage.setItem('has_seen_onboarding_tour', 'true');
        setShowTour(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleNext = () => {
        if (step === 1 && (!profile.childName || !profile.abductionDate)) return alert("Please fill in all fields.");
        if (step === 2 && (!profile.fromCountry || !profile.toCountry)) return alert("Please specify the countries.");
        setStep(step + 1);
    };

    const handleSubmit = () => {
        onComplete({ ...profile, isProfileComplete: true });
    };

    const handleSkip = () => {
        // Create a generic profile for research/professional access
        onComplete({
            childName: 'Research Case',
            fromCountry: '',
            toCountry: '',
            abductionDate: new Date().toISOString(),
            custodyStatus: 'no-order',
            parentRole: 'other',
            isProfileComplete: true,
            isSkipped: true,
            caseNumbers: {}
        });
    };

    return (
        <>
            {showTour && <GuidedTour onClose={handleCloseTour} />}
            <div className="onboarding-container" style={{maxWidth: '600px', margin: '2rem auto', textAlign: 'center'}}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2>Let's start with the basics.</h2>
                        <p>We will build a custom recovery dashboard for you. Data can be synced to the cloud later.</p>
                        <div className="form-group" style={{textAlign: 'left', marginTop: '2rem'}}>
                            <label>What is your child's name?</label>
                            <input type="text" name="childName" value={profile.childName} onChange={handleChange} placeholder="e.g. Charlotte" />
                            
                            <label style={{marginTop: '1rem', display: 'block'}}>When were they taken?</label>
                            <input type="date" name="abductionDate" value={profile.abductionDate} onChange={handleChange} />
                            
                            <label style={{marginTop: '1rem', display: 'block'}}>What is your role?</label>
                            <select name="parentRole" value={profile.parentRole} onChange={handleChange}>
                                <option value="mother">I am the Mother</option>
                                <option value="father">I am the Father</option>
                                <option value="other">I am a Legal Guardian / Other</option>
                            </select>
                        </div>
                        <button className="button-primary" style={{marginTop: '2rem', width: '100%'}} onClick={handleNext}>Next &rarr;</button>
                        
                        <div style={{marginTop: '1.5rem', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '1rem', opacity: 0.7}}>
                            <p style={{fontSize: '0.85rem', margin: '0 0 0.5rem 0'}}>For Govt / Legal / Researchers:</p>
                            <button className="button-secondary" style={{fontSize: '0.8rem', border: 'none', padding: '0.5rem 1rem'}} onClick={handleSkip}>
                                Skip Setup (Enter Research Mode)
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2>Where are they?</h2>
                        <p>Understanding the specific laws between two countries is critical.</p>
                        <div className="form-group" style={{textAlign: 'left', marginTop: '2rem'}}>
                            <label>Habitual Residence (From)</label>
                            <input type="text" name="fromCountry" value={profile.fromCountry} onChange={handleChange} placeholder="e.g. United States" />
                            
                            <label style={{marginTop: '1rem', display: 'block'}}>Taking Location (To)</label>
                            <input type="text" name="toCountry" value={profile.toCountry} onChange={handleChange} placeholder="e.g. Japan" />
                        </div>
                        <div style={{display:'flex', gap: '1rem', marginTop: '2rem'}}>
                            <button className="button-secondary" onClick={() => setStep(1)}>&larr; Back</button>
                            <button className="button-primary" style={{flexGrow: 1}} onClick={handleNext}>Next &rarr;</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2>Legal Status</h2>
                        <p>This helps us determine if this is a Hague Convention case.</p>
                        <div className="form-group" style={{textAlign: 'left', marginTop: '2rem'}}>
                            <label>Custody Order Status</label>
                            <select name="custodyStatus" value={profile.custodyStatus} onChange={handleChange}>
                                <option value="no-order">No court order exists yet</option>
                                <option value="sole-custody-me-local">I have Sole Custody (Order from home country)</option>
                                <option value="joint-custody-local">We have Joint Custody (Order from home country)</option>
                                <option value="sole-custody-them-local">Other parent has Sole Custody</option>
                                <option value="other">Other / Unsure</option>
                            </select>
                        </div>
                        <div style={{display:'flex', gap: '1rem', marginTop: '2rem'}}>
                            <button className="button-secondary" onClick={() => setStep(2)}>&larr; Back</button>
                            <button className="button-primary" style={{flexGrow: 1}} onClick={handleSubmit}>Create Recovery Dashboard</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const CaseSettings = ({ setView, profile, onUpdateProfile, user }: { setView: (view: View) => void, profile: CaseProfile, onUpdateProfile: (p: CaseProfile) => void, user: User | null }) => {
    const [localProfile, setLocalProfile] = useState<CaseProfile>(profile);
    const [newIdLabel, setNewIdLabel] = useState('');
    const [newIdValue, setNewIdValue] = useState('');

    const handleAddId = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIdLabel || !newIdValue) return;
        const updatedIds = { ...localProfile.caseNumbers, [newIdLabel]: newIdValue };
        setLocalProfile({ ...localProfile, caseNumbers: updatedIds });
        setNewIdLabel('');
        setNewIdValue('');
    };

    const handleRemoveId = (key: string) => {
        const updatedIds = { ...localProfile.caseNumbers };
        delete updatedIds[key];
        setLocalProfile({ ...localProfile, caseNumbers: updatedIds });
    };

    const handleSave = async () => {
        onUpdateProfile(localProfile);
        // Force sync if user is logged in
        if (user) {
             await setDoc(doc(db, "users", user.uid), { profile: localProfile }, { merge: true });
        }
        setView('dashboard');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setLocalProfile({ ...localProfile, [e.target.name]: e.target.value });
    };

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <h2 style={{marginTop: '1rem'}}>Case Settings</h2>
            {user && <p className="sync-badge">☁️ Cloud Sync Active: Changes saved to account {user.email}</p>}

            <div className="form-grid" style={{backgroundColor: 'var(--md-sys-color-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline)'}}>
                <div className="full-width"><h3>Core Details</h3></div>
                <label>Child's Name</label>
                <input type="text" name="childName" value={localProfile.childName} onChange={handleChange} />
                <label>From Country</label>
                <input type="text" name="fromCountry" value={localProfile.fromCountry} onChange={handleChange} />
                <label>To Country</label>
                <input type="text" name="toCountry" value={localProfile.toCountry} onChange={handleChange} />
                <label>Date Taken</label>
                <input type="date" name="abductionDate" value={localProfile.abductionDate} onChange={handleChange} />
            </div>

            <div style={{marginTop: '2rem', backgroundColor: 'var(--md-sys-color-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline)'}}>
                <h3>Case Reference Numbers</h3>
                <p style={{fontSize: '0.9rem', opacity: 0.8}}>Add numbers for police reports, Hague cases, etc.</p>
                
                <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr auto', alignItems: 'end', marginBottom: '1rem'}}>
                    <div>
                        <label style={{fontSize: '0.8rem'}}>Label (e.g. "Local Police #")</label>
                        <input type="text" value={newIdLabel} onChange={e => setNewIdLabel(e.target.value)} placeholder="Label" />
                    </div>
                    <div>
                        <label style={{fontSize: '0.8rem'}}>Number/ID</label>
                        <input type="text" value={newIdValue} onChange={e => setNewIdValue(e.target.value)} placeholder="Case ID" />
                    </div>
                    <button className="button-secondary" onClick={handleAddId} style={{marginBottom: '4px'}}>Add</button>
                </div>

                <div className="id-list">
                    {localProfile.caseNumbers && Object.entries(localProfile.caseNumbers).map(([key, value]) => (
                        <div key={key} style={{display:'flex', justifyContent:'space-between', padding:'0.75rem', borderBottom:'1px solid var(--md-sys-color-surface-variant)', alignItems: 'center'}}>
                            <div>
                                <strong>{key}:</strong> <span style={{fontFamily:'monospace', fontSize:'1.1rem'}}>{value}</span>
                            </div>
                            <button onClick={() => handleRemoveId(key)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', opacity: 0.6}}>&times;</button>
                        </div>
                    ))}
                    {(!localProfile.caseNumbers || Object.keys(localProfile.caseNumbers).length === 0) && <p style={{fontStyle:'italic', opacity:0.6}}>No case numbers added yet.</p>}
                </div>
            </div>

            <button className="button-primary" style={{marginTop: '2rem', width: '100%'}} onClick={handleSave}>Save Changes</button>
        </div>
    );
};

const DocumentVault = ({ setView }: { setView: (view: View) => void }) => {
    const [docs, setDocs] = useState<VaultDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        const files = await getFilesFromVault();
        setDocs(files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64 = await fileToBase64(file);
            
            const prompt = `Analyze this legal document related to a child abduction case. 
            Extract:
            1. Document Type (e.g. Court Order, Police Report, Letter, Affidavit)
            2. Date of Document (YYYY-MM-DD format if possible, or best guess)
            3. Summary (2 concise sentences on what this document says/orders)
            4. Extracted Text (The full meaningful text content for indexing)
            
            Return JSON: { "type": "", "date": "", "summary": "", "extractedText": "" }`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64 } },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const analysis = JSON.parse(response.text);
            
            const newDoc: VaultDocument = {
                id: Date.now().toString(),
                name: file.name,
                fileType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                type: analysis.type || "Unknown Document",
                date: analysis.date || "Unknown Date",
                summary: analysis.summary || "No summary extracted.",
                extractedText: analysis.extractedText || ""
            };

            await saveFileToVault(newDoc, file);
            await loadDocs();

        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this document permanently?")) {
            await deleteFileFromVault(id);
            loadDocs();
        }
    };

    return (
        <div>
             <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1rem'}}>
                 <h2>Digital Vault (Document Intelligence)</h2>
                 <div style={{fontSize:'0.8rem', padding:'0.5rem', border:'1px solid var(--md-sys-color-outline)', borderRadius:'8px', opacity:0.7}}>
                     🔐 Local Encryption Only (Privacy First)
                 </div>
             </div>
             <p>Securely store legal documents. AI extracts dates and summaries automatically for your emails.</p>

             <div className="tool-card" style={{marginBottom:'2rem', borderStyle:'dashed', textAlign:'center', backgroundColor: analyzing ? '#f0f4ff' : 'var(--md-sys-color-surface)'}}>
                 {analyzing ? (
                     <div style={{padding:'2rem'}}>
                         <div className="pulse-ring" style={{margin:'0 auto 1rem'}}></div>
                         <h4>Analyzing Document Structure...</h4>
                         <p>Extracting dates, legal clauses, and summary.</p>
                     </div>
                 ) : (
                     <div style={{padding:'2rem'}}>
                         <input type="file" id="vault-upload" style={{display:'none'}} onChange={handleFileUpload} accept="application/pdf,image/*" />
                         <label htmlFor="vault-upload" className="button-primary">Upload Document (PDF/Image)</label>
                         <p style={{marginTop:'1rem', opacity:0.6}}>Files are encrypted in your browser's database.</p>
                     </div>
                 )}
             </div>

             <div className="documents-list">
                 {docs.length === 0 && <p style={{textAlign:'center', opacity:0.5}}>Vault is empty.</p>}
                 {docs.map(doc => (
                     <div key={doc.id} className="tool-card" style={{padding:'1rem', marginBottom:'1rem', cursor:'default'}}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                             <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                                 <div style={{fontSize:'2rem'}}>📄</div>
                                 <div>
                                     <h4 style={{margin:0}}>{doc.type} <span style={{fontWeight:'normal', opacity:0.6}}>({doc.date})</span></h4>
                                     <div style={{fontSize:'0.85rem', opacity:0.8}}>{doc.name}</div>
                                 </div>
                             </div>
                             <button onClick={() => handleDelete(doc.id)} className="button-danger" style={{padding:'0.25rem 0.75rem', fontSize:'0.8rem'}}>Delete</button>
                         </div>
                         <div style={{marginTop:'1rem', padding:'0.75rem', backgroundColor:'var(--md-sys-color-surface-variant)', borderRadius:'8px', fontSize:'0.9rem'}}>
                             <strong>AI Summary:</strong> {doc.summary}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};

const PublicCampaignViewer = ({ campaignId }: { campaignId: string }) => {
    const [data, setData] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const docRef = doc(db, "campaigns", campaignId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setData(docSnap.data() as CampaignData);
                } else {
                    setError("Campaign not found or has been removed.");
                }
            } catch (e) {
                console.error(e);
                setError("Error loading campaign.");
            } finally {
                setLoading(false);
            }
        };
        fetchCampaign();
    }, [campaignId]);

    if (loading) return <div style={{padding:'3rem', textAlign:'center'}}>Loading Campaign...</div>;
    if (error || !data) return <div style={{padding:'3rem', textAlign:'center', color:'red'}}>{error}</div>;

    return (
        <div className="public-campaign-container">
            <header style={{backgroundColor: '#005ac1', color: 'white', padding: '3rem 1.5rem', textAlign: 'center'}}>
                <h1 style={{fontSize: '2.5rem', margin: '0 0 1rem 0'}}>Bring {data.childName} Home</h1>
                <p style={{fontSize: '1.2rem', opacity: 0.9}}>Missing from {data.fromCountry} &bull; Believed to be in {data.toCountry}</p>
            </header>

            <main style={{maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem'}}>
                <div className="stats-bar" style={{marginTop: '-2rem', position: 'relative', zIndex: 10}}>
                    <div className="stat">
                        <span className="stat-val">{data.daysMissing}</span>
                        <span className="stat-lbl">Days Missing</span>
                    </div>
                    <div className="stat">
                        <span className="stat-val">{data.abductionDate}</span>
                        <span className="stat-lbl">Date Taken</span>
                    </div>
                    <div className="stat">
                        <span className="stat-val">{data.toCountry}</span>
                        <span className="stat-lbl">Location</span>
                    </div>
                </div>

                {data.heroImageBase64 && (
                    <img src={data.heroImageBase64} alt={data.childName} className="hero-img" style={{marginTop: '3rem'}} />
                )}

                <article className="content-section">
                    <h2 style={{color: '#005ac1', borderBottom: '2px solid #eee', paddingBottom: '0.5rem'}}>The Story</h2>
                    <div style={{fontSize: '1.1rem', whiteSpace: 'pre-wrap', lineHeight: 1.8}}>{data.publicStory}</div>
                </article>

                <div className="cta-box">
                    <h2>How You Can Help</h2>
                    <p style={{marginBottom: '2rem', fontSize: '1.1rem'}}>Information is key. If you have seen {data.childName} or have any information, please reach out immediately.</p>
                    {data.contactInfo.includes('http') 
                        ? <a href={data.contactInfo} className="btn" style={{display:'inline-block', background:'#005ac1', color:'white', padding:'1rem 2rem', borderRadius:'50px', textDecoration:'none', fontWeight:'bold'}}>Visit Support Page / Donate</a>
                        : <a href={`mailto:${data.contactInfo}`} className="btn" style={{display:'inline-block', background:'#005ac1', color:'white', padding:'1rem 2rem', borderRadius:'50px', textDecoration:'none', fontWeight:'bold'}}>Contact: {data.contactInfo}</a>
                    }
                </div>
            </main>

            <footer style={{textAlign: 'center', padding: '2rem', borderTop: '1px solid #eee', color: '#666', fontSize: '0.9rem'}}>
                <p>Hosted by Recovery Hub &bull; Supporting Parents of International Abduction</p>
            </footer>
        </div>
    );
};

const CampaignSiteBuilder = ({ setView, profile }: { setView: (view: View) => void, profile: CaseProfile }) => {
    const [publicStory, setPublicStory] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [heroImage, setHeroImage] = useState<string | null>(null);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState('');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            // Resize to avoid massive Firestore docs (limit ~1MB total)
            const resized = await resizeImage(base64, 800);
            setHeroImage(resized);
        }
    };

    const draftStory = async () => {
        setIsDrafting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Write a 300-word "Public Story" for a missing child website.
            Child: ${profile.childName}, Missing Since: ${profile.abductionDate}, To: ${profile.toCountry}.
            Context: The parent needs help/tips. 
            Tone: Emotional but dignified, focusing on the child's humanity and the need for information. Avoid specific legal strategy.
            Output: Just the story text.`;
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            setPublicStory(response.text);
        } catch(e) { console.error(e); }
        finally { setIsDrafting(false); }
    };

    const publishSite = async () => {
        if (!publicStory || !contactInfo) return alert("Please fill in the story and contact info.");
        setIsPublishing(true);
        try {
            const daysMissing = Math.floor((new Date().getTime() - new Date(profile.abductionDate).getTime()) / (1000 * 60 * 60 * 24));
            
            const campaignData: CampaignData = {
                childName: profile.childName,
                fromCountry: profile.fromCountry,
                toCountry: profile.toCountry,
                abductionDate: profile.abductionDate,
                daysMissing,
                publicStory,
                contactInfo,
                heroImageBase64: heroImage, // Resized base64
                createdAt: new Date().toISOString()
            };

            // Save to Firestore 'campaigns' collection
            const docRef = await addDoc(collection(db, "campaigns"), campaignData);
            
            // Generate the link based on the current URL + query param
            const link = `${window.location.origin}${window.location.pathname}?c=${docRef.id}`;
            setPublishedUrl(link);

        } catch (e) {
            console.error(e);
            alert("Error publishing site. Please try again.");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <h2 style={{marginTop: '1rem'}}>Campaign Site Builder (Hosted)</h2>
            <p>Create and host a public webpage for your case instantly. Share this link with press and social media.</p>

            {publishedUrl ? (
                <div className="tool-card highlight" style={{textAlign: 'center', padding: '3rem'}}>
                    <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🎉</div>
                    <h3>Your Campaign is Live!</h3>
                    <p>Share this link with the world:</p>
                    <div style={{background: 'white', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', margin: '1rem 0', wordBreak: 'break-all', fontFamily: 'monospace'}}>
                        <a href={publishedUrl} target="_blank" rel="noreferrer">{publishedUrl}</a>
                    </div>
                    <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
                        <button className="button-primary" onClick={() => window.open(publishedUrl, '_blank')}>View Page</button>
                        <button className="button-secondary" onClick={() => setPublishedUrl('')}>Edit Page</button>
                    </div>
                </div>
            ) : (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                    <div className="form-grid">
                        <div className="full-width">
                            <h3>1. Public Story</h3>
                            <p style={{fontSize:'0.8rem', opacity:0.7}}>Different from your legal journal. Focus on the child.</p>
                            <textarea 
                                value={publicStory} 
                                onChange={e => setPublicStory(e.target.value)} 
                                rows={10} 
                                placeholder="Write your story here..."
                            />
                            <button className="button-ai" onClick={draftStory} disabled={isDrafting} style={{marginTop:'0.5rem'}}>
                                {isDrafting ? "Drafting..." : "✨ Auto-Draft with AI"}
                            </button>
                        </div>

                        <div className="full-width">
                            <h3>2. Contact Info (Call to Action)</h3>
                            <input 
                                type="text" 
                                placeholder="e.g. tips@findcharlotte.com OR GoFundMe Link" 
                                value={contactInfo} 
                                onChange={e => setContactInfo(e.target.value)} 
                            />
                        </div>

                        <div className="full-width">
                            <h3>3. Hero Photo</h3>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                            <p style={{fontSize:'0.75rem', opacity:0.6}}>Photo will be compressed for fast loading.</p>
                        </div>
                    </div>

                    <div className="builder-preview">
                        <div style={{border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', height: '600px', position: 'relative', backgroundColor: 'white'}}>
                             <div style={{background:'#005ac1', color:'white', padding:'1rem', textAlign:'center'}}>
                                 <h3 style={{margin:0}}>Bring {profile.childName} Home</h3>
                             </div>
                             <div style={{padding:'1rem', textAlign:'center'}}>
                                 {heroImage && <img src={heroImage} style={{width:'100%', borderRadius:'8px', maxHeight:'200px', objectFit:'cover'}} />}
                                 <p style={{fontSize:'0.8rem', textAlign:'left', whiteSpace:'pre-wrap', maxHeight:'200px', overflow:'hidden'}}>{publicStory || "(Story preview...)"}</p>
                                 <div style={{marginTop:'1rem', background:'#e1e2ec', padding:'1rem', borderRadius:'8px'}}>
                                     <strong>How to Help:</strong><br/>
                                     {contactInfo || "(Contact Info)"}
                                 </div>
                             </div>
                             <div style={{position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.8)', color:'white', padding:'0.5rem', textAlign:'center', fontSize:'0.8rem'}}>
                                 PREVIEW MODE
                             </div>
                        </div>
                        <button className="button-primary full-width" style={{marginTop: '1rem'}} onClick={publishSite} disabled={isPublishing}>
                            {isPublishing ? "Publishing to Cloud..." : "Publish to Web 🚀"}
                        </button>
                        <p style={{fontSize:'0.8rem', textAlign:'center', opacity:0.7}}>This will create a public link hosted on Recovery Hub.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const CorrespondenceHelper = ({ setView, profile }: { setView: (view: View) => void, profile: CaseProfile }) => {
    const [recipient, setRecipient] = useState('');
    const [purpose, setPurpose] = useState('');
    const [tone, setTone] = useState('Professional & Firm (As Parent)');
    const [additionalContext, setAdditionalContext] = useState('');
    const [includeOverview, setIncludeOverview] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
    const [selectedVaultDocId, setSelectedVaultDocId] = useState<string>('');
    const [generatedDraft, setGeneratedDraft] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getFilesFromVault().then(setVaultDocs);
    }, []);

    const handleDraft = async () => {
        if (!recipient || !purpose) return alert("Please fill in who and why.");
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let contextString = `
            Child: ${profile.childName}
            From: ${profile.fromCountry} -> To: ${profile.toCountry}
            Date Taken: ${profile.abductionDate}
            Case IDs: ${JSON.stringify(profile.caseNumbers || {})}
            `;

            const parts: any[] = [];
            
            // Add uploaded file content if available
            if (file) {
                const base64 = await fileToBase64(file);
                parts.push({ inlineData: { mimeType: file.type, data: base64 } });
                contextString += "\n\n[ATTACHED FILE CONTEXT PROVIDED]";
            }

            // Add Vault Doc context
            if (selectedVaultDocId) {
                const doc = vaultDocs.find(d => d.id === selectedVaultDocId);
                if (doc) {
                    contextString += `\n\n[REFERENCED DOCUMENT FROM VAULT]:\nType: ${doc.type}\nDate: ${doc.date}\nSummary: ${doc.summary}\nExtracted Text: ${doc.extractedText}`;
                    
                    // If we have the blob, we could attach it, but for text generation, the extracted text is safer/faster
                }
            }

            const prompt = `
            You are assisting a parent of an abducted child in drafting an email.
            Write the email FROM THE PERSPECTIVE OF THE PARENT.
            DO NOT write as a lawyer or legal representative.
            
            Recipient: ${recipient}
            Goal: ${purpose}
            Tone: ${tone}
            
            CASE FACTS (Must be included naturally if relevant):
            Child Name: ${profile.childName}
            Missing From: ${profile.fromCountry} -> Taken To: ${profile.toCountry}
            Date Taken: ${profile.abductionDate}
            Case Reference Numbers: ${JSON.stringify(profile.caseNumbers || {})}
            
            USER PROVIDED CONTEXT (Past emails, specific details to include):
            "${additionalContext}"
            
            ATTACHED DOCUMENT CONTEXT:
            Use the attached/referenced document info above to support the email if relevant.
            
            INSTRUCTIONS:
            1. Start with a clear subject line including the Child's Name and relevant Case ID.
            2. Be professional, clear, and factual. Avoid overly emotional or dramatic language unless the tone specifically requests urgency.
            3. If "Include Case Overview" is requested (${includeOverview}), start with a brief 2-sentence summary of the abduction facts (Who, When, Where) to orient the reader.
            4. Ensure the Child's Name (${profile.childName}) and any relevant IDs are explicitly mentioned in the body text.
            5. Sign off simply as the parent.
            `;

            parts.push({ text: prompt });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: parts }
            });

            setGeneratedDraft(response.text);

        } catch (e) {
            console.error(e);
            alert("Failed to generate draft. If attaching a large file, try a smaller one.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedDraft);
        alert("Copied to clipboard!");
    };

    return (
        <div>
             <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
             <h2 style={{marginTop: '1rem'}}>Comms HQ</h2>
             <p>Draft emails, request updates, and communicate effectively with authorities.</p>

             <div className="correspondence-container" style={{display: 'grid', gap: '2rem', gridTemplateColumns: '1fr'}}>
                <div className="form-grid">
                    <div className="full-width"><h3>Email Details</h3></div>
                    
                    <label>To (Recipient Name/Role)</label>
                    <input type="text" placeholder="e.g. State Dept Desk Officer, Detective Smith" value={recipient} onChange={e => setRecipient(e.target.value)} />
                    
                    <label>Goal / Purpose</label>
                    <input type="text" placeholder="e.g. Request update on warrant, Submit new evidence" value={purpose} onChange={e => setPurpose(e.target.value)} />
                    
                    <label>Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)}>
                        <option value="Professional & Firm (As Parent)">Professional & Firm (As Parent)</option>
                        <option value="Urgent & Pleading (Emergency)">Urgent & Pleading (Emergency)</option>
                        <option value="Neutral & Informative (Update)">Neutral & Informative (Update)</option>
                    </select>
                    
                    <div className="full-width">
                        <label>Past Emails / Context / Notes</label>
                        <p style={{fontSize: '0.8rem', margin:'0 0 0.5rem 0', opacity: 0.7}}>Paste previous email chains or messy notes here. The AI will use this to write the reply.</p>
                        <textarea 
                            placeholder="Paste context here..." 
                            value={additionalContext} 
                            onChange={e => setAdditionalContext(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="full-width" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                        <input 
                            type="checkbox" 
                            id="includeOverview" 
                            checked={includeOverview} 
                            onChange={e => setIncludeOverview(e.target.checked)} 
                            style={{width: 'auto', margin: 0}}
                        />
                        <label htmlFor="includeOverview" style={{margin: 0, fontWeight: 'normal'}}>Include Case Overview (Best for new recipients)</label>
                    </div>

                    <div className="full-width">
                        <label>Attach Context</label>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem'}}>
                            <div style={{padding:'1rem', border:'1px dashed var(--md-sys-color-outline)', borderRadius:'8px'}}>
                                <div style={{fontWeight:'bold', fontSize:'0.85rem', marginBottom:'0.5rem'}}>Option A: Upload New</div>
                                <input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                            </div>
                            <div style={{padding:'1rem', border:'1px solid var(--md-sys-color-outline)', borderRadius:'8px', backgroundColor:'var(--md-sys-color-surface-variant)'}}>
                                <div style={{fontWeight:'bold', fontSize:'0.85rem', marginBottom:'0.5rem'}}>Option B: From Vault</div>
                                {vaultDocs.length > 0 ? (
                                    <select value={selectedVaultDocId} onChange={e => setSelectedVaultDocId(e.target.value)} style={{fontSize:'0.85rem', padding:'0.5rem'}}>
                                        <option value="">-- Select Document --</option>
                                        {vaultDocs.map(d => (
                                            <option key={d.id} value={d.id}>{d.type} - {d.date}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{fontSize:'0.8rem', opacity:0.6}}>No docs in Vault yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button className="button-primary full-width" onClick={handleDraft} disabled={loading}>
                        {loading ? 'Drafting...' : 'Generate Email Draft'}
                    </button>
                </div>

                {generatedDraft && (
                    <div className="draft-preview animate-fade-in">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                            <h3>Draft Preview</h3>
                            <button className="button-secondary" onClick={copyToClipboard}>Copy Text</button>
                        </div>
                        <textarea 
                            value={generatedDraft} 
                            onChange={e => setGeneratedDraft(e.target.value)}
                            style={{width: '100%', height: '400px', fontFamily: 'monospace', fontSize: '0.9rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline)'}}
                        />
                    </div>
                )}
             </div>
        </div>
    );
};


const CriticalTasksWidget = ({ setView }: { setView: (view: View) => void }) => {
    const [tasks, setTasks] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('recovery_plan_v2');
        if (saved) {
            const allTasks: ActionItem[] = JSON.parse(saved);
            // Filter incomplete, high priority tasks
            const critical = allTasks
                .filter(t => !t.completed)
                .sort((a, b) => {
                    const priorityMap = { 'Immediate': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                    return priorityMap[a.priority] - priorityMap[b.priority];
                })
                .slice(0, 3);
            setTasks(critical);
        }
        setLoading(false);
    }, []);

    if (loading) return null;

    if (tasks.length === 0) {
        return (
            <div className="critical-tasks-empty" onClick={() => setView('myChecklist')} style={{cursor:'pointer'}}>
                <h4>⚠️ Action Plan Not Started</h4>
                <p>Initialize your recovery checklist to see critical next steps here.</p>
                <button className="button-primary">Start Action Plan</button>
            </div>
        );
    }

    return (
        <div className="critical-tasks-list">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
                <h4 style={{margin:0}}>Top Priorities</h4>
                <span style={{fontSize:'0.8rem', color: 'var(--md-sys-color-primary)', cursor:'pointer'}} onClick={() => setView('myChecklist')}>View All &rarr;</span>
            </div>
            {tasks.map(task => (
                <div key={task.id} className="mini-task-card" onClick={() => setView('myChecklist')}>
                    <span className={`mini-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className="mini-task-text">{task.task}</span>
                </div>
            ))}
        </div>
    );
};

const SimilarCasesWidget = ({ profile }: { profile: CaseProfile }) => {
    const [stories, setStories] = useState<{title: string, source: string, url: string}[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile.isSkipped || !profile.fromCountry || !profile.toCountry) return;
        
        const fetchStories = async () => {
            setLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: `Find 3 recent news stories or legal summaries of international parental abduction cases specifically between ${profile.fromCountry} and ${profile.toCountry}. Return only the results, do not give advice.`,
                    config: {
                        tools: [{googleSearch: {}}],
                    }
                });
                
                const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (chunks) {
                   const foundStories = chunks
                        .filter(c => c.web?.uri && c.web?.title)
                        .map(c => ({
                            title: c.web!.title!,
                            source: new URL(c.web!.uri!).hostname,
                            url: c.web!.uri!
                        }))
                        .slice(0, 3);
                   setStories(foundStories);
                }
            } catch (e) {
                console.error("Error fetching stories", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStories();
    }, [profile]);

    if (!stories.length && !loading) return null;

    return (
        <div className="similar-cases-widget">
            <h4 style={{margin:'0 0 0.5rem 0'}}>Related Cases & News</h4>
            {loading && <p style={{fontSize: '0.8rem', opacity: 0.7}}>Searching for similar cases...</p>}
            {stories.map((story, idx) => (
                <a key={idx} href={story.url} target="_blank" rel="noreferrer" className="story-link-card">
                    <div className="story-title">{story.title}</div>
                    <div className="story-source">{story.source}</div>
                </a>
            ))}
        </div>
    );
};

const FlyerGenerator = ({ setView, profile }: { setView: (view: View) => void, profile: CaseProfile }) => {
    const [image, setImage] = useState<string | null>(null);
    const [details, setDetails] = useState({
        height: '',
        weight: '',
        hairColor: '',
        eyeColor: '',
        lastSeenLocation: profile.fromCountry,
        lastSeenDate: profile.abductionDate,
        contactPhone: ''
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const downloadFlyer = () => {
        const element = document.getElementById('flyer-preview');
        if (element) {
            html2canvas(element).then(canvas => {
                const link = document.createElement('a');
                link.download = `MISSING-${profile.childName}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    };

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem'}}>
                <div>
                    <h3>Enter Details</h3>
                    <div className="form-grid">
                        <label>Height</label>
                        <input type="text" value={details.height} onChange={e => setDetails({...details, height: e.target.value})} placeholder="e.g. 3'5\"" />
                        <label>Weight</label>
                        <input type="text" value={details.weight} onChange={e => setDetails({...details, weight: e.target.value})} placeholder="e.g. 45 lbs" />
                        <label>Hair Color</label>
                        <input type="text" value={details.hairColor} onChange={e => setDetails({...details, hairColor: e.target.value})} />
                        <label>Eye Color</label>
                        <input type="text" value={details.eyeColor} onChange={e => setDetails({...details, eyeColor: e.target.value})} />
                        <label>Last Seen Location</label>
                        <input type="text" value={details.lastSeenLocation} onChange={e => setDetails({...details, lastSeenLocation: e.target.value})} />
                        <label>Contact Phone for Tips</label>
                        <input type="text" value={details.contactPhone} onChange={e => setDetails({...details, contactPhone: e.target.value})} placeholder="Police or Hotline #" />
                        <label>Upload Photo</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} />
                    </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <div id="flyer-preview" className="flyer-preview">
                        <div className="flyer-header">MISSING</div>
                        <div className="flyer-photo-area">
                            {image ? <img src={image} alt="Missing Child" /> : <span>PHOTO</span>}
                        </div>
                        <div className="flyer-name">{profile.childName}</div>
                        <div className="flyer-details-grid">
                            <div><strong>DOB/AGE:</strong> Unknown</div>
                            <div><strong>HEIGHT:</strong> {details.height}</div>
                            <div><strong>WEIGHT:</strong> {details.weight}</div>
                            <div><strong>EYES:</strong> {details.eyeColor}</div>
                            <div><strong>HAIR:</strong> {details.hairColor}</div>
                        </div>
                        <div className="flyer-section">
                            <strong>LAST SEEN:</strong> {details.lastSeenDate} in {details.lastSeenLocation}
                        </div>
                         <div className="flyer-section" style={{color: 'red', fontWeight: 'bold'}}>
                            MAY BE IN: {profile.toCountry.toUpperCase()}
                        </div>
                        <div className="flyer-footer">
                            CALL: {details.contactPhone || "911"}
                        </div>
                    </div>
                    <button className="button-primary" style={{marginTop: '1rem'}} onClick={downloadFlyer}>Download Image</button>
                </div>
            </div>
        </div>
    );
};


const KnowledgeBaseBuilder = ({ setView }: { setView: (view: View) => void }) => {
    const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const q = query(collection(db, "knowledge_base"));
                const querySnapshot = await getDocs(q);
                const data: KnowledgeBaseEntry[] = [];
                querySnapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() } as KnowledgeBaseEntry);
                });
                setEntries(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const allTags = Array.from(new Set(entries.flatMap(e => e.tags || [])));

    const filteredEntries = entries.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              e.summary?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = selectedTag ? e.tags?.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    return (
        <div>
             <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
             <h2 style={{marginTop: '1rem'}}>Community Knowledge Base</h2>
             <p>Shared resources, templates, and guides from parents and experts.</p>

             <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                 <input 
                    type="text" 
                    placeholder="Search resources..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{flexGrow: 1}}
                />
                <select onChange={e => setSelectedTag(e.target.value || null)} style={{width: '200px'}}>
                    <option value="">All Tags</option>
                    {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
             </div>

             {loading ? <p>Loading community data...</p> : (
                 <div className="tools-grid">
                     {filteredEntries.map(entry => (
                         <div key={entry.id} className="tool-card">
                             <h3>{entry.name}</h3>
                             <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
                                 <span className="journal-badge">{entry.entryType}</span>
                                 {entry.tags?.map(tag => <span key={tag} className="journal-badge" style={{backgroundColor:'#e0e0e0', color:'#333'}}>{tag}</span>)}
                             </div>
                             <p>{entry.summary || "No summary available."}</p>
                             {entry.url && <a href={entry.url} target="_blank" className="button-secondary" style={{marginTop: '1rem', fontSize: '0.8rem'}}>View Resource</a>}
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
};

const CaseJournal = ({ setView, user }: { setView: (view: View) => void, user: User | null }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [newLog, setNewLog] = useState<Partial<LogEntry>>({ type: 'Phone Call', date: new Date().toISOString().split('T')[0] });
    const [isPolishing, setIsPolishing] = useState(false);

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
                 if (doc.exists() && doc.data().journal) {
                     setLogs(doc.data().journal);
                 }
            });
            return () => unsub();
        } else {
            const savedLogs = localStorage.getItem('case_journal_logs');
            if (savedLogs) setLogs(JSON.parse(savedLogs));
        }
    }, [user]);

    const saveLog = async (log: LogEntry) => {
        const updated = [log, ...logs];
        setLogs(updated);
        
        if (user) {
             await setDoc(doc(db, "users", user.uid), { journal: updated }, { merge: true });
        } else {
             localStorage.setItem('case_journal_logs', JSON.stringify(updated));
        }
    };

    const handleAdd = () => {
        if (!newLog.description) return;
        const entry: LogEntry = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
            ...newLog as LogEntry
        };
        saveLog(entry);
        setNewLog({ type: 'Phone Call', date: new Date().toISOString().split('T')[0], description: '', peopleInvolved: '' });
    };

    const handlePolish = async () => {
        if (!newLog.description) return;
        setIsPolishing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Rewrite the following log entry to be objective, factual, and professional for a legal log. Remove emotional language but keep all facts. Input: "${newLog.description}"`
            });
            setNewLog({ ...newLog, description: response.text.trim() });
        } catch (e) {
            console.error(e);
        } finally {
            setIsPolishing(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Case Journal & Timeline", 20, 20);
        doc.setFontSize(12);
        let y = 40;
        logs.forEach(log => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(`${log.date} - ${log.type}`, 20, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            const splitText = doc.splitTextToSize(log.description, 170);
            doc.text(splitText, 20, y);
            y += (splitText.length * 7) + 10;
        });
        doc.save("case-journal.pdf");
    };

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                <h2>Evidence Locker (Timeline)</h2>
                <button className="button-download" onClick={exportPDF}>Export PDF for Lawyer</button>
            </div>
            {user && <p className="sync-badge">☁️ Cloud Sync Active</p>}
            
            <div className="tool-card" style={{marginTop: '1rem', marginBottom: '2rem'}}>
                <h3>Add New Entry</h3>
                <div className="form-grid">
                    <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    <select value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value as any})}>
                        <option>Phone Call</option>
                        <option>Email</option>
                        <option>Police Interaction</option>
                        <option>Sighting</option>
                        <option>Court</option>
                        <option>Other</option>
                    </select>
                    <input type="text" placeholder="People Involved (e.g. Officer Miller)" value={newLog.peopleInvolved || ''} onChange={e => setNewLog({...newLog, peopleInvolved: e.target.value})} />
                    <div className="full-width">
                        <textarea placeholder="Description of event..." rows={3} value={newLog.description || ''} onChange={e => setNewLog({...newLog, description: e.target.value})} />
                        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                            <button className="button-ai" onClick={handlePolish} disabled={isPolishing}>
                                {isPolishing ? "Polishing..." : "✨ Polish for Court (AI)"}
                            </button>
                            <button className="button-primary" onClick={handleAdd}>Save Entry</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="journal-timeline">
                {logs.map(log => (
                    <div key={log.id} className="journal-entry">
                        <div className="journal-meta">
                            <span style={{fontWeight: 700}}>{log.date}</span>
                            <span className="journal-badge">{log.type}</span>
                            {log.peopleInvolved && <span style={{fontSize: '0.85rem', color: 'var(--md-sys-color-secondary)'}}>w/ {log.peopleInvolved}</span>}
                        </div>
                        <p className="journal-description">{log.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MyChecklist = ({ setView, profile, user }: { setView: (view: View) => void, profile: CaseProfile, user: User | null }) => {
    const [tasks, setTasks] = useState<ActionItem[]>([]);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
                 if (doc.exists() && doc.data().tasks) {
                     setTasks(doc.data().tasks);
                 }
            });
            return () => unsub();
        } else {
            const saved = localStorage.getItem('recovery_plan_v2');
            if (saved) setTasks(JSON.parse(saved));
        }
    }, [user]);

    const saveTasks = async (updatedTasks: ActionItem[]) => {
        setTasks(updatedTasks);
        if (user) {
             await setDoc(doc(db, "users", user.uid), { tasks: updatedTasks }, { merge: true });
        } else {
             localStorage.setItem('recovery_plan_v2', JSON.stringify(updatedTasks));
        }
    };

    const generatePlan = async () => {
        setGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a specific recovery checklist for a parent whose child was taken from ${profile.fromCountry} to ${profile.toCountry}. 
            Custody Status: ${profile.custodyStatus}. 
            Return a JSON array of objects with: id, category, task, description, priority (Immediate, High, Medium, Low).`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const newTasks = JSON.parse(response.text);
            const tasksWithState = newTasks.map((t: any) => ({...t, completed: false}));
            await saveTasks(tasksWithState);
        } catch (e) {
            console.error(e);
            alert("Error generating plan.");
        } finally {
            setGenerating(false);
        }
    };

    const toggleTask = (id: string) => {
        const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        saveTasks(updated);
    };

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem'}}>
                <h2>Universal Task List</h2>
                {!tasks.length && <button className="button-primary" onClick={generatePlan} disabled={generating}>{generating ? "Generating..." : "Initialize Action Plan"}</button>}
            </div>
             {user && <p className="sync-badge">☁️ Cloud Sync Active</p>}
            
            <div style={{marginTop: '1.5rem'}}>
                {tasks.map(task => (
                    <div key={task.id} className={`action-item ${task.completed ? 'completed' : ''}`}>
                        <div className="action-item-header">
                            <div style={{display: 'flex', alignItems: 'flex-start'}}>
                                <input type="checkbox" className="action-item-checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
                                <div>
                                    <div style={{fontWeight: 600, fontSize: '1.05rem'}}>{task.task}</div>
                                    <div style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>{task.description}</div>
                                </div>
                            </div>
                            <span className={`action-item-priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExpensesTracker = ({ setView, user }: { setView: (view: View) => void, user: User | null }) => {
    const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
    const [newExp, setNewExp] = useState<Partial<ExpenseEntry>>({ currency: 'USD', date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
                 if (doc.exists() && doc.data().expenses) {
                     setExpenses(doc.data().expenses);
                 }
            });
            return () => unsub();
        } else {
            const saved = localStorage.getItem('expenses_log');
            if (saved) setExpenses(JSON.parse(saved));
        }
    }, [user]);

    const addExpense = async () => {
        if (!newExp.amount || !newExp.description) return;
        const entry: ExpenseEntry = {
            id: Date.now().toString(),
            category: 'Other',
            ...newExp as ExpenseEntry
        };
        const updated = [entry, ...expenses];
        setExpenses(updated);
        
        if (user) {
             await setDoc(doc(db, "users", user.uid), { expenses: updated }, { merge: true });
        } else {
             localStorage.setItem('expenses_log', JSON.stringify(updated));
        }
        
        setNewExp({ currency: 'USD', date: new Date().toISOString().split('T')[0], amount: 0, description: '' });
    };

    const total = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <h2 style={{marginTop: '1rem'}}>Expense Tracker</h2>
            {user && <p className="sync-badge">☁️ Cloud Sync Active</p>}
            <div className="tool-card" style={{marginBottom: '2rem'}}>
                <h3 style={{color: 'var(--md-sys-color-primary)'}}>Total: ${total.toLocaleString()}</h3>
                <div className="form-grid">
                    <input type="date" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
                    <input type="number" placeholder="Amount" value={newExp.amount || ''} onChange={e => setNewExp({...newExp, amount: Number(e.target.value)})} />
                    <input type="text" placeholder="Description (e.g. Lawyer Retainer)" value={newExp.description || ''} onChange={e => setNewExp({...newExp, description: e.target.value})} />
                    <button className="button-primary" onClick={addExpense}>Add Expense</button>
                </div>
            </div>
            
            {expenses.map(exp => (
                <div key={exp.id} className="action-item" style={{display:'flex', justifyContent:'space-between'}}>
                    <span>{exp.date} - {exp.description}</span>
                    <strong>${exp.amount}</strong>
                </div>
            ))}
        </div>
    );
};

const LiveGuide = ({ setView }: { setView: (view: View) => void }) => {
    const [connected, setConnected] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startSession = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(mediaStream);

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            let nextStartTime = 0;
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setConnected(true);
                        const source = inputAudioContext.createMediaStreamSource(mediaStream);
                        const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmData = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                pcmData[i] = inputData[i] * 32768;
                            }
                            const base64 = encode(new Uint8Array(pcmData.buffer));
                            sessionPromise.then(session => session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64 } }));
                        };
                        source.connect(processor);
                        processor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                         const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                         if (audioData) {
                             const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                             const source = outputAudioContext.createBufferSource();
                             source.buffer = audioBuffer;
                             source.connect(outputNode);
                             
                             const now = outputAudioContext.currentTime;
                             // Ensure we schedule after the current time and after the previous chunk
                             const startTime = Math.max(now, nextStartTime);
                             source.start(startTime);
                             // Update nextStartTime to be the end of this chunk
                             nextStartTime = startTime + audioBuffer.duration;
                         }
                    },
                    onclose: () => { setConnected(false); setStream(null); }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: "You are a supportive, calm, and knowledgeable guide for a parent whose child has been abducted internationally. You are not a lawyer, but you provide clear logistical steps, emotional grounding, and help them organize their thoughts. Keep answers concise and reassuring."
                }
            });

        } catch (e) {
            console.error(e);
            alert("Microphone access required.");
        }
    };

    return (
        <div style={{textAlign: 'center'}}>
            <button className="button-secondary" onClick={() => setView('dashboard')}>&larr; Dashboard</button>
            <h2 style={{marginTop: '1rem'}}>Talk with The Guide</h2>
            <p>A real-time voice companion to help you calm down and plan next steps.</p>
            
            <div style={{margin: '3rem auto', maxWidth: '400px'}}>
                <div className={`status-pill ${connected ? 'active' : ''}`} style={{margin: '0 auto 1rem', width: 'fit-content'}}>
                    {connected ? "● LIVE CONNECTION" : "○ READY TO CONNECT"}
                </div>

                {connected && <AudioVisualizer stream={stream} />}

                {!connected ? (
                    <button className="button-primary" onClick={startSession} style={{padding: '1.5rem 3rem', borderRadius: '50px', fontSize: '1.2rem'}}>
                        Start Conversation 🎙️
                    </button>
                ) : (
                    <button className="button-danger" onClick={() => window.location.reload()}>
                        End Call
                    </button>
                )}
                <p style={{fontSize: '0.8rem', marginTop: '2rem', opacity: 0.6}}>
                    Note: Audio is processed in real-time.
                </p>
            </div>
        </div>
    );
};

const Dashboard = ({ profile, setView, setCaseProfile, user }: { profile: CaseProfile, setView: (view: View) => void, setCaseProfile: (p: CaseProfile) => void, user: User | null }) => {
    const [dossierLoading, setDossierLoading] = useState(false);
    const [dossierData, setDossierData] = useState<DossierData | null>(profile.dossierData || null);
    const [loadingText, setLoadingText] = useState('Initializing Intelligence Scan...');

    useEffect(() => {
        if (!profile.dossierData && !profile.isSkipped && !dossierLoading) {
            generateDossier();
        }
    }, []);

    const generateDossier = async () => {
        setDossierLoading(true);
        
        const steps = [
            "Scanning Hague Convention compliance...",
            "Checking State Department warnings...",
            "Analyzing enforcement history...",
            "Compiling risk assessment..."
        ];
        let stepIdx = 0;
        const interval = setInterval(() => {
            setLoadingText(steps[stepIdx % steps.length]);
            stepIdx++;
        }, 1500);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a brief intelligence dossier for a child abduction case from ${profile.fromCountry} to ${profile.toCountry}.
            Return JSON with:
            - summary: 2 sentence overview of the legal difficulty between these two countries.
            - risk: "High", "Medium", or "Low" based on Hague compliance.
            - legalSystem: 1 sentence on the destination country's legal system (e.g. Civil Law, Sharia, etc).
            - redFlags: Array of 3 specific warning signs or challenges for this country pair.
            DO NOT provide fake statistics. Focus on qualitative difficulty.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const data = JSON.parse(response.text);
            setDossierData(data);
            
            const updatedProfile = { ...profile, dossierData: data };
            setCaseProfile(updatedProfile);
            
            if (user) {
                await setDoc(doc(db, "users", user.uid), { profile: updatedProfile }, { merge: true });
            } else {
                localStorage.setItem('case_profile', JSON.stringify(updatedProfile));
            }

        } catch (e) {
            console.error(e);
        } finally {
            clearInterval(interval);
            setDossierLoading(false);
        }
    };

    const handleReset = () => {
        if (confirm("This will clear your profile. Are you sure?")) {
            localStorage.removeItem('case_profile');
            // If user logged in, we might want to clear cloud too, or just detach. For now, just clear session.
            setCaseProfile({
                childName: '', fromCountry: '', toCountry: '', abductionDate: '', 
                custodyStatus: 'no-order', parentRole: 'other', isProfileComplete: false, caseNumbers: {}
            });
        }
    };

    const daysMissing = profile.abductionDate 
        ? Math.floor((new Date().getTime() - new Date(profile.abductionDate).getTime()) / (1000 * 60 * 60 * 24)) 
        : 0;

    return (
        <div className="dashboard-container animate-fade-in">
            {/* Hero / Status Section */}
            <div className="dashboard-hero">
                <div className="hero-top-bar">
                    <div>
                        <div className="day-counter">{profile.isSkipped ? "Research Mode" : `Day ${daysMissing} of Recovery`}</div>
                        <h2 style={{margin: 0, fontSize: '1.8rem'}}>{profile.childName}</h2>
                        <div style={{fontSize: '0.9rem', opacity: 0.8}}>
                            {profile.fromCountry} &rarr; {profile.toCountry}
                        </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <div className={`status-pill active`}>Active Case</div>
                        {user && <div style={{fontSize: '0.7rem', marginTop:'5px', opacity:0.8}}>☁️ Synced</div>}
                    </div>
                </div>

                <div className="hero-content-grid">
                    {/* Left: Critical Tasks */}
                    <div>
                        <div className="section-header">Immediate Actions</div>
                        <CriticalTasksWidget setView={setView} />
                    </div>

                    {/* Right: Intelligence Dossier */}
                    <div>
                        <div className="section-header">Intelligence Brief</div>
                        {dossierLoading ? (
                            <div className="loading-dossier">
                                <div className="pulse-ring"></div>
                                <p style={{fontSize: '0.9rem', opacity: 0.8}}>{loadingText}</p>
                            </div>
                        ) : dossierData ? (
                            <div className={`dossier-card risk-${dossierData.risk.toLowerCase()}`}>
                                <div className="dossier-header">
                                    <strong>Assessment</strong>
                                    <span className="risk-badge">{dossierData.risk} Risk</span>
                                </div>
                                <p className="dossier-summary">{dossierData.summary}</p>
                                <div className="dossier-stats-grid">
                                    <div className="stat-box">
                                        <span className="stat-label">Legal System</span>
                                        <span className="stat-value">{dossierData.legalSystem}</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-label">Compliance</span>
                                        <span className="stat-value">{dossierData.risk === 'High' ? 'Poor/None' : 'Variable'}</span>
                                    </div>
                                </div>
                                <div style={{fontSize: '0.85rem'}}>
                                    <strong>Red Flags:</strong>
                                    <ul style={{margin: '0.5rem 0 0 1rem', padding: 0}}>
                                        {dossierData.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                             !profile.isSkipped && <button onClick={generateDossier} className="button-secondary" style={{width:'100%', fontSize: '0.8rem'}}>Run Intelligence Scan</button>
                        )}
                    </div>
                    
                    {/* Similar Cases (Full Width in Mobile, span 2 in grid) */}
                    <div style={{gridColumn: '1 / -1'}}>
                         <SimilarCasesWidget profile={profile} />
                    </div>
                </div>
            </div>

            {/* Main Tools Grid */}
            <div className="tools-grid">
                <div className="tool-card" onClick={() => setView('myChecklist')}>
                    <h3>📋 Action Plan</h3>
                    <p>Your AI-generated step-by-step recovery checklist.</p>
                </div>
                <div className="tool-card" onClick={() => setView('correspondence')}>
                    <h3>✉️ Comms HQ</h3>
                    <p>Draft letters, organize case IDs, and manage outreach.</p>
                </div>
                <div className="tool-card" onClick={() => setView('caseJournal')}>
                    <h3>⚖️ Evidence Locker</h3>
                    <p>Log calls and events. AI polishes notes for court.</p>
                </div>
                <div className="tool-card" onClick={() => setView('documentVault')}>
                    <h3>🔒 Digital Vault</h3>
                    <p>Secure storage for court orders and reports.</p>
                </div>
                <div className="tool-card" onClick={() => setView('liveConversation')}>
                    <h3>🎙️ Live Guide</h3>
                    <p>Voice interface for calming strategy and planning.</p>
                </div>
                 <div className="tool-card" onClick={() => setView('campaignBuilder')}>
                    <h3>📢 Campaign Site</h3>
                    <p>Launch a public website for your case instantly.</p>
                </div>
                <div className="tool-card" onClick={() => setView('expenses')}>
                    <h3>💰 Expense Tracker</h3>
                    <p>Track legal fees and travel costs for reimbursement.</p>
                </div>
                <div className="tool-card" onClick={() => setView('knowledgeBase')}>
                    <h3>🌍 Knowledge Base</h3>
                    <p>Community resources, templates, and country guides.</p>
                </div>
                <div className="tool-card" onClick={() => setView('flyerGenerator')}>
                    <h3>🚨 Missing Poster</h3>
                    <p>Generate a standardized flyer for police/media.</p>
                </div>
            </div>

            {/* Footer Actions */}
            <div style={{textAlign: 'center', marginTop: '4rem', opacity: 0.6}}>
                <button onClick={handleReset} style={{background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer'}}>
                    Reset / Setup New Case
                </button>
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState<View>('onboarding');
    const [user, setUser] = useState<User | null>(null);
    const [caseProfile, setCaseProfile] = useState<CaseProfile>({
        childName: '', fromCountry: '', toCountry: '', abductionDate: '', 
        custodyStatus: 'no-order', parentRole: 'other', isProfileComplete: false, caseNumbers: {}
    });
    const [publicCampaignId, setPublicCampaignId] = useState<string | null>(null);

    useEffect(() => {
        // 1. Check for Public Campaign Link first
        const params = new URLSearchParams(window.location.search);
        const campaignId = params.get('c');
        if (campaignId) {
            setPublicCampaignId(campaignId);
            return;
        }

        // 2. Listen for Auth State
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // If user logged in, sync with Firestore
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    // Cloud has data -> Download it
                    const cloudProfile = userDoc.data().profile;
                    if (cloudProfile) {
                        setCaseProfile(cloudProfile);
                        setView('dashboard');
                        localStorage.setItem('case_profile', JSON.stringify(cloudProfile)); // Keep local sync
                    }
                } else {
                    // Cloud is empty -> Upload local data (if any)
                    const localProfile = localStorage.getItem('case_profile');
                    if (localProfile) {
                        const parsed = JSON.parse(localProfile);
                        const localTasks = localStorage.getItem('recovery_plan_v2');
                        const localJournal = localStorage.getItem('case_journal_logs');
                        const localExpenses = localStorage.getItem('expenses_log');

                        await setDoc(userDocRef, {
                            profile: parsed,
                            tasks: localTasks ? JSON.parse(localTasks) : [],
                            journal: localJournal ? JSON.parse(localJournal) : [],
                            expenses: localExpenses ? JSON.parse(localExpenses) : []
                        });
                        setCaseProfile(parsed);
                        setView('dashboard');
                    }
                }
            } else {
                // No user -> Read Local
                const saved = localStorage.getItem('case_profile');
                if (saved) {
                    setCaseProfile(JSON.parse(saved));
                    setView('dashboard');
                } else {
                    setView('onboarding');
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const updateProfile = (newProfile: CaseProfile) => {
        setCaseProfile(newProfile);
        localStorage.setItem('case_profile', JSON.stringify(newProfile));
        if (user) {
            setDoc(doc(db, "users", user.uid), { profile: newProfile }, { merge: true });
        }
        if (newProfile.isProfileComplete) setView('dashboard');
    };

    // RENDER PUBLIC PAGE IF ID EXISTS
    if (publicCampaignId) {
        return <PublicCampaignViewer campaignId={publicCampaignId} />;
    }

    return (
        <div className="app-container">
            <Header setView={setView} caseProfile={caseProfile} user={user} />
            
            <main>
                {view === 'onboarding' && <OnboardingWizard onComplete={updateProfile} />}
                {view === 'dashboard' && <Dashboard profile={caseProfile} setView={setView} setCaseProfile={setCaseProfile} user={user} />}
                
                {/* Feature Views */}
                {view === 'myChecklist' && <MyChecklist setView={setView} profile={caseProfile} user={user} />}
                {view === 'caseJournal' && <CaseJournal setView={setView} user={user} />}
                {view === 'expenses' && <ExpensesTracker setView={setView} user={user} />}
                {view === 'liveConversation' && <LiveGuide setView={setView} />}
                {view === 'knowledgeBase' && <KnowledgeBaseBuilder setView={setView} />}
                {view === 'flyerGenerator' && <FlyerGenerator setView={setView} profile={caseProfile} />}
                {view === 'correspondence' && <CorrespondenceHelper setView={setView} profile={caseProfile} />}
                {view === 'caseSettings' && <CaseSettings setView={setView} profile={caseProfile} onUpdateProfile={updateProfile} user={user} />}
                {view === 'documentVault' && <DocumentVault setView={setView} />}
                {view === 'campaignBuilder' && <CampaignSiteBuilder setView={setView} profile={caseProfile} />}
            </main>

            <footer className="app-footer">
                <div className="footer-content">
                    <div>
                        <h4>Recovery Hub</h4>
                        <p style={{fontSize: '0.9rem', opacity: 0.8}}>
                            Built to support parents navigating the Hague Convention and international family law disputes.
                            This tool is an intelligent organizer, not a law firm.
                        </p>
                    </div>
                    <div className="footer-links">
                        <a href="#" onClick={() => setView('termsOfService')}>Terms of Service</a>
                        <a href="#" onClick={() => setView('dataManagement')}>Data & Privacy</a>
                        <a href="https://travel.state.gov" target="_blank" rel="noreferrer">US State Dept</a>
                        <a href="https://www.hcch.net" target="_blank" rel="noreferrer">Hague Conference</a>
                    </div>
                </div>
                <div className="disclaimer-block">
                    <strong>⚠️ LEGAL DISCLAIMER:</strong> This AI tool provides organizational support and general information. 
                    It does NOT provide legal advice. International abduction cases are complex. 
                    You must consult with a qualified attorney in both your home country and the destination country.
                </div>
            </footer>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
