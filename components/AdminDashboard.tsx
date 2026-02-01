import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplicants, getRubric, saveRubric } from '../services/storageService';
import { WriterProfile, ApplicationStatus, RubricCriterion } from '../types';
import { Check, X, Clock, ChevronRight, User, FileText, AlertTriangle, BarChart as BarChartIcon, Settings, Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Simple Word Cloud Component
const KeywordCloud = ({ applicants }: { applicants: WriterProfile[] }) => {
    const [words, setWords] = useState<{ text: string, count: number }[]>([]);

    useEffect(() => {
        const text = applicants.map(a => `${a.bio} ${a.track || ''} ${a.assessment?.submission || ''}`).join(' ').toLowerCase();
        // Removed explicit type annotation for tokens to avoid potential TS/JS parsing issues in some environments
        const tokens: string[] = text.match(/\b\w+\b/g) || [];
        const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'for', 'it', 'my', 'with', 'on', 'as', 'this', 'that', 'but', 'be', 'at', 'an']);
        
        const counts: Record<string, number> = {};
        tokens.forEach(t => {
            if (!stopWords.has(t) && t.length > 3) {
                counts[t] = (counts[t] || 0) + 1;
            }
        });

        const sorted = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([text, count]) => ({ text, count }));
        
        setWords(sorted);
    }, [applicants]);

    return (
        <div className="flex flex-wrap gap-2 p-4">
            {words.map((w, i) => (
                <span 
                    key={i} 
                    className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg"
                    style={{ fontSize: `${Math.max(0.75, Math.min(2, 0.75 + (w.count * 0.1)))}rem`, opacity: 0.6 + (w.count / words[0]?.count || 1) * 0.4 }}
                >
                    {w.text}
                </span>
            ))}
        </div>
    );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'applicants' | 'analytics' | 'rubric'>('applicants');
  const [applicants, setApplicants] = useState<WriterProfile[]>([]);
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);

  useEffect(() => {
    setApplicants(getApplicants());
    setRubric(getRubric());
  }, []);

  const handleRubricChange = (id: string, field: keyof RubricCriterion, value: any) => {
      const updated = rubric.map(r => r.id === id ? { ...r, [field]: value } : r);
      setRubric(updated);
  };

  const addRubricItem = () => {
      const newId = (Math.max(...rubric.map(r => parseInt(r.id) || 0), 0) + 1).toString();
      setRubric([...rubric, { id: newId, category: 'New Criterion', description: 'Description', maxPoints: 10 }]);
  };

  const deleteRubricItem = (id: string) => {
      setRubric(rubric.filter(r => r.id !== id));
  };

  const saveRubricSettings = () => {
      saveRubric(rubric);
      alert("Rubric saved!");
  };

  const getStatusColor = (status: ApplicationStatus) => {
      switch(status) {
          case ApplicationStatus.ONBOARDED: return 'bg-green-100 text-green-700';
          case ApplicationStatus.REJECTED: return 'bg-red-100 text-red-700';
          case ApplicationStatus.REVIEWING: return 'bg-blue-100 text-blue-700';
          case ApplicationStatus.ASSESSMENT_PENDING: return 'bg-amber-100 text-amber-700';
          case ApplicationStatus.PROFILE_SUBMITTED: return 'bg-slate-100 text-slate-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  const getAiRiskColor = (prob: number) => {
      if (prob > 75) return 'text-red-600 font-bold';
      if (prob > 40) return 'text-amber-600 font-medium';
      return 'text-green-600';
  };

  // Prepare Analytics Data
  const aiTrendData = applicants
      .sort((a, b) => new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime())
      .map(app => ({
          date: new Date(app.appliedDate).toLocaleDateString(),
          prob: app.assessment?.result?.metrics.detectedAiProbability || 0,
          name: app.fullName
      }));

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('applicants')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'applicants' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <User className="inline mr-2" size={18}/> Applicants
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <BarChartIcon className="inline mr-2" size={18}/> Analytics
                </button>
                <button onClick={() => setActiveTab('rubric')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'rubric' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <Settings className="inline mr-2" size={18}/> Rubric
                </button>
            </div>
        </div>

        {activeTab === 'applicants' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">Applicant</th>
                                <th className="p-4 font-semibold text-slate-600">Track</th>
                                <th className="p-4 font-semibold text-slate-600">Score</th>
                                <th className="p-4 font-semibold text-slate-600">AI Risk</th>
                                <th className="p-4 font-semibold text-slate-600">Status</th>
                                <th className="p-4 font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {applicants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No applicants found yet. Share the application link!
                                    </td>
                                </tr>
                            ) : (
                                applicants.map((app) => (
                                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{app.fullName}</div>
                                                    <div className="text-xs text-slate-500">{app.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {app.track || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {app.assessment?.result ? (
                                                <span className="font-bold text-slate-800">{app.assessment.result.overallScore}%</span>
                                            ) : (
                                                <span className="text-slate-400 text-sm">N/A</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {app.assessment?.result ? (
                                                <div className={`flex items-center gap-1 ${getAiRiskColor(app.assessment.result.metrics.detectedAiProbability)}`}>
                                                    {app.assessment.result.metrics.detectedAiProbability > 70 && <AlertTriangle size={14} />}
                                                    {app.assessment.result.metrics.detectedAiProbability}%
                                                </div>
                                            ) : <span className="text-slate-400">N/A</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(app.status)}`}>
                                                {app.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <Link 
                                                to={`/admin/applicant/${app.id}`} 
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                            >
                                                View <ChevronRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">AI Probability Trends</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={aiTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis domain={[0, 100]} fontSize={12} />
                                <Tooltip />
                                <Line type="monotone" dataKey="prob" stroke="#ef4444" strokeWidth={2} name="AI Probability %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Applicant Keyword Cloud</h3>
                    <div className="h-64 overflow-y-auto">
                        <KeywordCloud applicants={applicants} />
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'rubric' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Assessment Scoring Rubric</h3>
                    <button onClick={addRubricItem} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        <Plus size={16} /> Add Criterion
                    </button>
                </div>
                <div className="space-y-4">
                    {rubric.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start p-4 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input 
                                    className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                                    value={item.category} 
                                    onChange={(e) => handleRubricChange(item.id, 'category', e.target.value)}
                                    placeholder="Category Name"
                                />
                                <input 
                                    className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                    value={item.description} 
                                    onChange={(e) => handleRubricChange(item.id, 'description', e.target.value)}
                                    placeholder="Description"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-slate-500">Max Pts:</label>
                                    <input 
                                        type="number"
                                        className="w-20 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                        value={item.maxPoints} 
                                        onChange={(e) => handleRubricChange(item.id, 'maxPoints', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button onClick={() => deleteRubricItem(item.id)} className="text-slate-400 hover:text-red-600 p-2">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={saveRubricSettings} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                        Save Rubric
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;