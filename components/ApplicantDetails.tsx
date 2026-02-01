import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApplicantById, saveApplicant, getRubric } from '../services/storageService';
import { WriterProfile, ApplicationStatus } from '../types';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Fingerprint, Clock, FileText, Activity, Search, BookOpen, ExternalLink, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const ApplicantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [applicant, setApplicant] = useState<WriterProfile | undefined>(undefined);
  const [rubricDefinitions, setRubricDefinitions] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      setApplicant(getApplicantById(id));
      setRubricDefinitions(getRubric());
    }
  }, [id]);

  const updateStatus = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (applicant) {
          const newStatus = e.target.value as ApplicationStatus;
          const updated = { ...applicant, status: newStatus };
          saveApplicant(updated);
          setApplicant(updated);
      }
  };

  if (!applicant) return <div className="p-8 text-center">Loading or Applicant not found...</div>;

  const result = applicant.assessment?.result;
  const metrics = result?.metrics;

  const aiData = [
    { name: 'Human', value: 100 - (metrics?.detectedAiProbability || 0) },
    { name: 'AI', value: metrics?.detectedAiProbability || 0 },
  ];
  const AI_COLORS = ['#10b981', '#ef4444'];

  const rubricData = result?.rubricScores?.map(s => {
      const def = rubricDefinitions.find(r => r.id === s.criterionId);
      return {
          name: def ? def.category : s.criterionId,
          score: s.score,
          fullMark: def ? def.maxPoints : 100
      };
  }) || [];

  return (
    <div className="space-y-6 pb-12">
        <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-4">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>

        {/* Header Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">{applicant.fullName}</h1>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {result?.overallScore || 0}/100 Score
                    </span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                    <span className="flex items-center gap-1"><FileText size={16}/> {applicant.track || 'Pending Track'}</span>
                    <span className="flex items-center gap-1"><Clock size={16}/> {applicant.experienceYears} Years Exp.</span>
                </div>
                <div className="mt-4 flex gap-2">
                    {metrics?.keyTraits.map((trait, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">{trait}</span>
                    ))}
                </div>
            </div>
            <div className="flex gap-3 items-center">
                <label className="text-sm font-medium text-slate-700 mr-2">Status:</label>
                <div className="relative">
                    <select 
                        value={applicant.status} 
                        onChange={updateStatus}
                        className="appearance-none bg-white border border-slate-300 text-slate-900 py-2 pl-4 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    >
                        {Object.values(ApplicationStatus).map((status) => (
                            <option key={status} value={status}>
                                {status.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
                </div>
            </div>
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Plagiarism Card */}
            <div className={`p-6 rounded-xl border shadow-sm ${result?.plagiarism && result.plagiarism.score > 20 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Search className={result?.plagiarism && result.plagiarism.score > 20 ? 'text-red-600' : 'text-slate-600'} />
                    <h3 className="font-bold text-slate-800">Plagiarism Check</h3>
                </div>
                {result?.plagiarism ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-sm text-slate-600">Similarity Score</span>
                            <span className="text-2xl font-bold">{result.plagiarism.score}%</span>
                        </div>
                        {result.plagiarism.sources.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-700">Potential Sources:</p>
                                <ul className="text-xs space-y-1">
                                    {result.plagiarism.sources.slice(0, 3).map((s, i) => (
                                        <li key={i} className="truncate">
                                            <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                <ExternalLink size={10} /> {s.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="text-sm text-green-700 flex items-center gap-1">
                                <CheckCircle size={14} /> No web matches found.
                            </div>
                        )}
                        <p className="text-xs text-slate-500 italic mt-2">{result.plagiarism.analysis.substring(0, 100)}...</p>
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm">Not checked</div>
                )}
            </div>

            {/* AI Probability Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-blue-600" />
                    <h3 className="font-bold text-slate-800">AI Probability</h3>
                </div>
                <div className="flex-1 min-h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={aiData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {aiData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={AI_COLORS[index % AI_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Rubric Score Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Rubric Performance</h3>
                </div>
                <div className="space-y-3 mt-4">
                    {rubricData.length > 0 ? rubricData.map((r, i) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">{r.name}</span>
                                <span className="text-slate-500">{r.score}/{r.fullMark}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${(r.score / r.fullMark) * 100}%` }}
                                />
                            </div>
                        </div>
                    )) : (
                        <div className="text-sm text-slate-400 italic">No rubric data available.</div>
                    )}
                </div>
            </div>
        </div>

        {/* Content Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Assessment Submission</h3>
                <div className="p-4 bg-slate-50 rounded-lg h-96 overflow-y-auto text-sm text-slate-700 leading-relaxed font-serif border border-slate-200">
                    {applicant.assessment?.submission || <span className="text-slate-400 italic">No submission yet.</span>}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Detailed Feedback</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 text-blue-900 rounded-lg text-sm border border-blue-100">
                        <strong>System Feedback:</strong><br/>
                        {result?.feedback || "Feedback pending assessment completion."}
                    </div>
                    
                    {result?.rubricScores && (
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2">Rubric Comments:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {result?.rubricScores?.map((rs, i) => {
                                 const def = rubricDefinitions.find(r => r.id === rs.criterionId);
                                 return (
                                     <div key={i} className="text-sm border-b border-slate-100 pb-2">
                                         <span className="font-medium text-slate-800">{def?.category || rs.criterionId}: </span>
                                         <span className="text-slate-600">{rs.comments}</span>
                                     </div>
                                 )
                            })}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ApplicantDetails;
