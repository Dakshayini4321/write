import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, UserCheck, ShieldCheck, PenTool, LayoutDashboard } from 'lucide-react';
import OnboardingFlow from './components/OnboardingFlow';
import AdminDashboard from './components/AdminDashboard';
import ApplicantDetails from './components/ApplicantDetails';

const NavLink = ({ to, icon: Icon, children }: { to: string, icon: React.ElementType, children?: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
      }`}
    >
      <Icon size={18} />
      <span className="font-medium">{children}</span>
    </Link>
  );
};

const Landing = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="bg-blue-50 p-6 rounded-full mb-8 animate-pulse">
            <ShieldCheck size={64} className="text-blue-600" />
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            VeriScript <span className="text-blue-600">Secure</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed">
            The premier platform for authenticating academic and technical writing talent. 
            We use advanced AI fingerprinting to ensure integrity and quality.
        </p>
        <div className="flex gap-4">
            <Link 
                to="/apply" 
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center gap-2"
            >
                <PenTool size={20} />
                Start Application
            </Link>
            <Link 
                to="/admin" 
                className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <LayoutDashboard size={20} />
                Admin Portal
            </Link>
        </div>
    </div>
);

const App = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" size={28} />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-500">
                                VeriScript
                            </span>
                        </Link>
                    </div>
                    <nav className="hidden md:flex space-x-2">
                        <NavLink to="/" icon={BookOpen}>Home</NavLink>
                        <NavLink to="/apply" icon={PenTool}>Apply as Writer</NavLink>
                        <NavLink to="/admin" icon={UserCheck}>Admin Dashboard</NavLink>
                    </nav>
                </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/apply" element={<OnboardingFlow />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/applicant/:id" element={<ApplicantDetails />} />
            </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;