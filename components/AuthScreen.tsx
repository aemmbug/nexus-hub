
import React, { useState, useRef } from 'react';
import { GroupMember } from '../types';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

interface AuthScreenProps {
  onRegister: (user: GroupMember) => void;
}

const AVATAR_PRESETS = [
  'https://picsum.photos/150/150?u=101',
  'https://picsum.photos/150/150?u=102',
  'https://picsum.photos/150/150?u=103',
  'https://picsum.photos/150/150?u=104',
  'https://picsum.photos/150/150?u=105',
  'https://picsum.photos/150/150?u=106',
];

const AuthScreen: React.FC<AuthScreenProps> = ({ onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Auth, 2: Avatar
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalAvatar = customAvatarUrl.trim() || selectedAvatar;

  const handleAuth = async () => {
    setError(null);
    
    // Basic Validation
    if (!isLogin) {
      if (!name.trim()) {
        setError("Designation (Name) is required.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Security sequence must be at least 6 characters.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onRegister({
          id: user.uid,
          name: user.displayName || email.split('@')[0],
          avatar: user.photoURL || AVATAR_PRESETS[0],
          role: 'Member',
          status: 'online'
        });
      } else {
        // For registration, we move to step 2 for avatar after validating credentials
        // We don't create the user yet to avoid partial profiles
        setStep(2);
      }
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') message = "This email is already registered in the matrix.";
      if (err.code === 'auth/invalid-credential') message = "Invalid access credentials.";
      if (err.code === 'auth/user-not-found') message = "Identity not found in registry.";
      if (err.code === 'auth/wrong-password') message = "Incorrect decryption sequence.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterComplete = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: name,
        photoURL: finalAvatar
      });

      onRegister({
        id: user.uid,
        name: name,
        avatar: finalAvatar,
        role: 'Owner',
        status: 'online'
      });
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') message = "This email is already registered.";
      setError(message);
      setStep(1); // Go back to fix auth issues if any
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAvatar(reader.result as string);
        setCustomAvatarUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-950/40 backdrop-blur-3xl border border-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in fade-in zoom-in-95 duration-700">
        {/* Step Indicator */}
        {!isLogin && (
          <div className="flex justify-center gap-2 mb-10">
            {[1, 2].map((s) => (
              <div 
                key={s} 
                className={`h-1 rounded-full transition-all duration-500 ${step === s ? 'w-10 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.8)]' : step > s ? 'w-4 bg-indigo-900' : 'w-4 bg-slate-900'}`} 
              />
            ))}
          </div>
        )}

        {/* Phase 1: Auth Entry */}
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter text-glow">
                {isLogin ? 'Welcome Back' : 'Join Nexus'}
              </h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">
                {isLogin ? 'Access your digital hub' : 'Initialize your matrix profile'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                {!isLogin && (
                  <input 
                    id="user-name"
                    name="user-name"
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/30 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-700 shadow-inner uppercase"
                    placeholder="Designation (Name)"
                  />
                )}
                <input 
                  id="user-email"
                  name="user-email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/30 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-700 shadow-inner"
                  placeholder="Email Address"
                  autoFocus={isLogin}
                />
                <input 
                  id="user-password"
                  name="user-password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/30 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-700 shadow-inner"
                  placeholder="Password"
                />
                {!isLogin && (
                  <input 
                    id="user-confirm-password"
                    name="user-confirm-password"
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/30 border-2 border-slate-800 rounded-2xl px-6 py-5 text-lg text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-700 shadow-inner"
                    placeholder="Confirm Password"
                  />
                )}
              </div>
              
              {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}

              <button 
                onClick={handleAuth}
                disabled={!email || password.length < 6 || isLoading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] italic shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isLogin ? 'Authorize Access' : 'Proceed to Signature'}
              </button>

              <button 
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="w-full text-[9px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.3em] transition-colors"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Avatar Selection (Register Only) */}
        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Visual Signature</h2>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em]">Confirm Biological Representation</p>
            </div>

            <div className="flex flex-col items-center gap-8">
              <div className="relative group">
                <div className="absolute inset-0 rounded-[2.5rem] bg-indigo-600/10 blur-2xl animate-pulse" />
                <img 
                  src={finalAvatar} 
                  className="w-32 h-32 rounded-[2.5rem] border-2 border-indigo-500/50 relative z-10 object-cover shadow-2xl bg-slate-950 transition-all duration-500" 
                  alt="Identity Preview" 
                />
              </div>

              <div className="grid grid-cols-4 gap-3 w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center gap-1 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group"
                >
                  <span className="text-lg">📤</span>
                  <span className="text-[6px] font-black uppercase text-slate-600 group-hover:text-indigo-400">Upload</span>
                </button>
                <input id="avatar-upload" name="avatar-upload" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                
                {AVATAR_PRESETS.map((url) => (
                  <button
                    key={url}
                    onClick={() => { setSelectedAvatar(url); setCustomAvatarUrl(''); }}
                    className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${selectedAvatar === url && !customAvatarUrl ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-105' : 'border-slate-800 opacity-40 hover:opacity-100 hover:scale-105'}`}
                  >
                    <img src={url} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="px-8 py-5 text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-[0.2em] transition-colors"
              >
                Back
              </button>
              <button 
                onClick={handleRegisterComplete}
                disabled={isLoading}
                className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] italic shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Authorize Identity'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Metrics */}
        <div className="mt-12 pt-8 border-t border-slate-900/50 flex items-center justify-center gap-6 opacity-30">
          <div className="flex flex-col items-center">
            <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest mb-1">Security</span>
            <span className="text-[8px] font-black text-white uppercase tracking-tighter italic">FIREBASE_AUTH</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-900" />
          <div className="flex flex-col items-center">
            <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</span>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter italic">SYNCED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
