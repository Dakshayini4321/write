import React, { useState, useRef, useEffect } from 'react';
import { 
    User, CheckCircle, Upload, AlertTriangle, ArrowRight, Loader2, Book, Code 
} from 'lucide-react';
import { Track, WriterProfile, ApplicationStatus, WritingSample, RubricCriterion } from '../types';
import { saveApplicant, getRubric } from '../services/storageService';
import { analyzeWritingStyle, compareAuthorship, checkPlagiarism } from '../services/geminiService';

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  
  // Safe ID generation
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Form State initialized with ID and date immediately
  const [formData, setFormData] = useState<WriterProfile>({
    id: generateId(),
    fullName: '',
    email: '',
    experienceYears: 0,
    bio: '',
    track: undefined,
    samples: [],
    status: ApplicationStatus.PROFILE_SUBMITTED,
    appliedDate: new Date().toISOString()
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTrackSelect = (track: Track) => {
    setFormData({ ...formData, track });
  };

  const saveProgress = (status: ApplicationStatus) => {
      const updatedProfile = { ...formData, status };
      setFormData(updatedProfile);
      saveApplicant(updatedProfile);
  };

  const nextStep = (next: number, status?: ApplicationStatus) => {
      if (status) {
          saveProgress(status);
      } else {
          saveApplicant(formData);
      }
      setStep(next);
  };

  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const newSample: WritingSample = {
            id: generateId(),
            title: file.name,
            content: text,
            type: 'UPLOADED_SAMPLE',
            dateSubmitted: new Date().toISOString()
        };
        const updated = {
            ...formData,
            samples: [...(formData.samples || []), newSample]
        };
        setFormData(updated);
        saveApplicant(updated); // Save immediately on upload
      };
      reader.readAsText(file);
    }
  };

  const startAssessment = () => {
    setStartTime(Date.now());
    // Move to status ASSESSMENT_PENDING when they enter the assessment phase
    nextStep(4, ApplicationStatus.ASSESSMENT_PENDING);
  };

  // Assessment State
  const [assessmentText, setAssessmentText] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);

  const handlePaste = () => {
    setPasteCount(prev => prev + 1);
  };

  const submitApplication = async () => {
    if (!formData.fullName || !formData.email || !formData.track) return;
    
    setLoading(true);

    try {
        const currentRubric = getRubric();

        // 1. Analyze Assessment Task
        setProgressStatus('Analyzing writing style & rubric scoring...');
        const assessmentAnalysis = await analyzeWritingStyle(assessmentText, currentRubric);
        
        // 2. Plagiarism Check
        setProgressStatus('Checking for plagiarism...');
        const plagiarismResult = await checkPlagiarism(assessmentText);

        // 3. Compare against uploaded samples (if any)
        setProgressStatus('Verifying authorship...');
        // Pass the full sample objects, not just strings, for better analysis
        const authorshipCheck = await compareAuthorship(formData.samples || [], assessmentText);

        // Calculate Overall Score from Rubric
        const totalPoints = currentRubric.reduce((acc, r) => acc + r.maxPoints, 0);
        const earnedPoints = assessmentAnalysis.rubricScores.reduce((acc, r) => acc + r.score, 0);
        const normalizedScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        const newProfile: WriterProfile = {
            ...formData,
            status: ApplicationStatus.REVIEWING,
            assessment: {
                taskPrompt: getPromptForTrack(formData.track),
                submission: assessmentText,
                result: {
                    overallScore: normalizedScore,
                    rubricScores: assessmentAnalysis.rubricScores,
                    plagiarism: plagiarismResult,
                    feedback: assessmentAnalysis.feedback,
                    authorshipMatchScore: authorshipCheck.matchScore,
                    metrics: assessmentAnalysis.metrics,
                    timeTakenSeconds: (Date.now() - startTime) / 1000,
                    pasteCount: pasteCount
                },
                meta: {
                    startTime,
                    endTime: Date.now(),
                    pasteCount
                }
            }
        };

        saveApplicant(newProfile);
        setStep(5);
    } catch (error) {
        console.error("Submission failed", error);
        alert("There was an error processing your application. Please check your connection and try again.");
    } finally {
        setLoading(false);
        setProgressStatus('');
    }
  };

  const getPromptForTrack = (track?: Track) => {
      switch(track) {
          case Track.TECHNICAL: return "Explain the concept of 'Recursion' to a 10-year-old, then provide a Python example for a technical audience.";
          case Track.ACADEMIC: return "Critically analyze the impact of Remote Work on urban planning in post-2020 cities. Cite hypothetical sources.";
          default: return "Discuss the ethical implications of Artificial Intelligence in creative industries.";
      }
  };

  // Render Steps
  const renderStep = () => {
    switch (step) {
      case 1: // Personal Details
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-slate-800">Writer Profile</h2>
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jane Doe" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="jane@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                    <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Short Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleInputChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32" placeholder="Tell us about your expertise..." />
                </div>
            </div>
            <button 
                onClick={() => nextStep(2, ApplicationStatus.PROFILE_SUBMITTED)} 
                disabled={!formData.fullName || !formData.email} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
                Next: Select Track
            </button>
          </div>
        );
      case 2: // Track Selection
        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <h2 className="text-2xl font-bold text-slate-800">Select Your Track</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[Track.ACADEMIC, Track.TECHNICAL, Track.BOTH].map((t) => (
                        <div 
                            key={t}
                            onClick={() => handleTrackSelect(t)}
                            className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${formData.track === t ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-center mb-4 text-blue-600">
                                {t === Track.ACADEMIC ? <Book size={32} /> : t === Track.TECHNICAL ? <Code size={32} /> : <div className="flex"><Book/><Code/></div>}
                            </div>
                            <h3 className="text-lg font-semibold text-center capitalize">{t.toLowerCase()} Writing</h3>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={() => nextStep(3)} // Keep current status or just save profile update
                    disabled={!formData.track} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                    Next: Provide Samples
                </button>
            </div>
        );
      case 3: // Sample Upload
        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <h2 className="text-2xl font-bold text-slate-800">Previous Work Samples</h2>
                <p className="text-slate-600">Please upload at least 1 previous work sample (Text/Markdown files) or paste content. This helps us build your style profile.</p>
                
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                    <input type="file" id="sample-upload" onChange={handleSampleUpload} className="hidden" accept=".txt,.md" />
                    <label htmlFor="sample-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload size={40} className="text-slate-400" />
                        <span className="text-blue-600 font-medium">Click to upload .txt file</span>
                        <span className="text-xs text-slate-500">Max 5MB</span>
                    </label>
                </div>

                {formData.samples && formData.samples.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium text-slate-700">Uploaded Samples:</h4>
                        {formData.samples.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-sm">
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-sm truncate flex-1">{s.title}</span>
                                <span className="text-xs text-slate-400">{s.content.length} chars</span>
                            </div>
                        ))}
                    </div>
                )}

                <button 
                    onClick={startAssessment} 
                    disabled={!formData.samples?.length} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                    Next: Take Live Assessment
                </button>
            </div>
        );
      case 4: // Assessment
        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Live Assessment</h2>
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <AlertTriangle size={16} />
                        <span>Anti-Cheating Enabled</span>
                    </div>
                </div>
                
                <div className="bg-slate-100 p-4 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-semibold text-slate-800 mb-2">Prompt:</h3>
                    <p className="text-slate-700">{getPromptForTrack(formData.track)}</p>
                </div>

                <div>
                    <textarea 
                        value={assessmentText}
                        onChange={(e) => setAssessmentText(e.target.value)}
                        onPaste={handlePaste}
                        className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
                        placeholder="Start writing here..."
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>{assessmentText.length} characters</span>
                        <span>Pastes detected: {pasteCount}</span>
                    </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
                    Note: We analyze typing patterns and paste events. Please write naturally.
                </div>

                <button 
                    onClick={submitApplication} 
                    disabled={assessmentText.length < 100 || loading} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            <span>{progressStatus}</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle />
                            Submit Application
                        </>
                    )}
                </button>
            </div>
        );
      case 5: // Success
         return (
             <div className="text-center py-12 animate-in zoom-in duration-500">
                 <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                     <CheckCircle size={40} className="text-green-600" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-800 mb-4">Application Submitted!</h2>
                 <p className="text-slate-600 mb-8 max-w-md mx-auto">
                     Our AI system is currently analyzing your writing fingerprint and checking against our rubric. You will receive an email once the verification is complete.
                 </p>
                 <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
                     Return to Home
                 </button>
             </div>
         );
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500">Step {step} of 4</span>
            <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                    <div key={i} className={`h-2 w-8 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />
                ))}
            </div>
        </div>
        <div className="p-8">
            {renderStep()}
        </div>
    </div>
  );
};

export default OnboardingFlow;