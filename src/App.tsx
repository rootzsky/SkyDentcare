/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { PatientList } from './components/PatientList';
import { MedicalRecordForm } from './components/MedicalRecordForm';
import { Reports } from './components/Reports';
import { Appointments } from './components/Appointments';
import { Security } from './components/Security';
import { Settings } from './components/Settings';
import { MasterData } from './components/MasterData';
import { DiagnosisGuidelines } from './components/DiagnosisGuidelines';
import { BillingList } from './components/Billing';
import { Login } from './components/Login';
import { PatientRegistration } from './components/PatientRegistration';
import { PatientDashboard } from './components/PatientDashboard';
import { InformedConsent } from './components/InformedConsent';
import { Education } from './components/Education';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { auth, onAuthStateChanged, User, doc, getDoc, db, OperationType, handleFirestoreError, setDoc, Timestamp } from './firebase';
import { UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Default profile for new users (e.g. from Google login)
            const defaultProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              role: currentUser.email === 'rudisetiawan935@gmail.com' ? 'admin' : 'patient',
              createdAt: Timestamp.now(),
            };
            
            // Save the new profile to Firestore
            try {
              await setDoc(userDocRef, defaultProfile);
              setUserProfile(defaultProfile);
            } catch (saveError) {
              handleFirestoreError(saveError, OperationType.WRITE, `users/${currentUser.uid}`);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUser(currentUser);
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      setCurrentView(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-pop-bg flex items-center justify-center relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pop-pink/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pop-blue/10 rounded-full blur-[120px] animate-pulse delay-700" />
        
        <div className="flex flex-col items-center space-y-8 relative z-10">
          <div className="h-24 w-24 border-8 border-pop-blue border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_40px_rgba(0,212,255,0.3)]" />
          <div className="text-center">
            <h2 className="text-4xl font-black text-pop-text uppercase italic tracking-tighter">DentaCare <span className="text-pop-blue">RME</span></h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-4 animate-bounce">Menyiapkan sistem keamanan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Login onLogin={() => {}} />
        <Toaster position="top-right" richColors theme="light" />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout userProfile={userProfile} onLogout={() => auth.signOut()}>
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            userProfile?.role === 'patient' ? <PatientDashboard userProfile={userProfile} /> : <Dashboard />
          )}
          {currentView === 'patients' && <PatientList />}
          {currentView === 'medical-records' && <MedicalRecordForm />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'appointments' && <Appointments />}
          {currentView === 'security' && userProfile?.role === 'admin' && <Security />}
          {currentView === 'settings' && userProfile?.role === 'admin' && <Settings />}
          {currentView === 'master-data' && userProfile?.role === 'admin' && <MasterData />}
          {currentView === 'diagnosis-guidelines' && <DiagnosisGuidelines />}
          {currentView === 'billing' && <BillingList />}
          {currentView === 'informed-consent' && <InformedConsent />}
          {currentView === 'education' && <Education />}
          {currentView === 'registration' && userProfile && <PatientRegistration userProfile={userProfile} />}
          
          {/* Placeholder views for other routes */}
          {['non-existent-view'].includes(currentView) && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
              <div className="bg-white p-16 rounded-[4rem] border-2 border-gray-100 shadow-2xl relative group overflow-hidden">
                <div className="absolute -inset-1 bg-pop-blue/10 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <span className="text-9xl relative z-10 animate-bounce block">🏗️</span>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-pop-text uppercase italic tracking-tighter">Modul {currentView.replace('-', ' ')}</h2>
                <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] max-w-sm mx-auto leading-relaxed">Modul ini sedang dalam tahap pengembangan sesuai standar Kemenkes RI.</p>
              </div>
            </div>
          )}
        </div>
        <Toaster position="top-right" richColors theme="light" />
      </Layout>
    </ErrorBoundary>
  );
}
