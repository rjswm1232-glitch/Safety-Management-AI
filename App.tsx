
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Upload, 
  RefreshCcw, 
  Search, 
  Info,
  RotateCcw,
  Save,
  PlusCircle,
  Clock,
  Sparkles,
  Download,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import RiskTable from './components/RiskTable';
import { SafetyTableRow, SavedProcess, SupplementRow } from './types';
import { performFullSafetyAnalysis, analyzeSafetyTable, summarizeOverallProcess } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'analysis'>('analysis');
  
  // Analysis/Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workProcessTitle, setWorkProcessTitle] = useState('');
  const [procedureText, setProcedureText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [legalClauses, setLegalClauses] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<SafetyTableRow[]>([
    { id: '1', unitTask: '', potentialHazard: '', safetyMeasure: '', reflectedItems: '' }
  ]);
  const [tableAnalysis, setTableAnalysis] = useState<SupplementRow[] | null>(null);
  
  // UI Status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingSupplement, setIsAnalyzingSupplement] = useState(false);
  
  // Saved Data State
  const [savedProcesses, setSavedProcesses] = useState<SavedProcess[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset to empty for new entry
  const resetAnalysisState = () => {
    setEditingId(null);
    setWorkProcessTitle('');
    setProcedureText('');
    setImage(null);
    setTableRows([{ id: '1', unitTask: '', potentialHazard: '', safetyMeasure: '', reflectedItems: '' }]);
    setTableAnalysis(null);
    setLegalClauses(null);
    setActiveTab('analysis');
  };

  // Load existing entry for editing
  const handleEditProcess = (process: SavedProcess) => {
    setEditingId(process.id);
    setWorkProcessTitle(process.title);
    setTableRows([...process.rows]);
    setProcedureText(""); 
    setImage(null);
    setTableAnalysis(null);
    setLegalClauses(null);
    setActiveTab('analysis');
  };

  const moveProcess = (index: number, direction: 'up' | 'down') => {
    const newItems = [...savedProcesses];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setSavedProcesses(newItems);
  };

  const handleExportToExcel = () => {
    if (savedProcesses.length === 0) return alert("내보낼 데이터가 없습니다.");
    
    // Updated HTML format for Excel: Excluded 'Reflected Items' column, header color Yellow
    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>SafetyPlan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #FFFF00; border: 1px solid #000000; font-weight: bold; text-align: center; }
          td { border: 1px solid #000000; vertical-align: top; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>순번</th>
              <th>시공 절차 항목</th>
              <th>단위작업명</th>
              <th>잠재위험</th>
              <th>안전대책</th>
            </tr>
          </thead>
          <tbody>
    `;

    savedProcesses.forEach((process, pIdx) => {
      process.rows.forEach(row => {
        excelTemplate += `
          <tr>
            <td>${pIdx + 1}</td>
            <td>${process.title}</td>
            <td>${row.unitTask}</td>
            <td>${row.potentialHazard}</td>
            <td>${row.safetyMeasure}</td>
          </tr>
        `;
      });
    });

    excelTemplate += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `시공절차_안전계획서_${new Date().toLocaleDateString()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePerformAnalysis = async () => {
    if (!workProcessTitle.trim()) return alert("작업 공정명을 입력해주세요.");
    setIsAnalyzing(true);
    try {
      const base64Data = image ? image.split(',')[1] : null;
      const result = await performFullSafetyAnalysis(workProcessTitle, base64Data, procedureText);
      setTableRows(result.tableData);
      setLegalClauses(result.legalClauses);
      setTableAnalysis(null);
    } catch (error) {
      alert("분석 중 오류 발생");
    } finally { setIsAnalyzing(false); }
  };

  const handleSaveProcess = async () => {
    if (!workProcessTitle.trim()) return alert("작업 공정명을 입력해주세요.");
    const validRows = tableRows.filter(r => r.unitTask.trim() !== '');
    if (validRows.length === 0) return alert("저장할 데이터가 없습니다.");

    setIsAnalyzingSupplement(true);
    try {
      const summary = await summarizeOverallProcess(workProcessTitle, validRows);
      const processData: SavedProcess = {
        id: editingId || crypto.randomUUID(),
        title: workProcessTitle,
        summary,
        rows: [...tableRows],
        createdAt: new Date().toLocaleString('ko-KR')
      };

      if (editingId) {
        setSavedProcesses(prev => prev.map(p => p.id === editingId ? processData : p));
        alert("수정사항이 반영되었습니다.");
      } else {
        setSavedProcesses(prev => [...prev, processData]);
        alert("시공절차 리스트에 추가되었습니다.");
      }
      setActiveTab('history');
    } catch (e) { alert("저장 중 오류"); }
    finally { setIsAnalyzingSupplement(false); }
  };

  const handleDeleteHistory = (id: string) => {
    if (confirm("해당 시공절차를 삭제하시겠습니까?")) {
      setSavedProcesses(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAnalyzeSupplement = async () => {
    const validRows = tableRows.filter(r => r.unitTask.trim() !== '');
    if (validRows.length === 0) return alert("분석할 내용이 없습니다.");
    setIsAnalyzingSupplement(true);
    try {
      const result = await analyzeSafetyTable(validRows);
      setTableAnalysis(result);
    } catch (error) { alert("보완 분석 오류"); }
    finally { setIsAnalyzingSupplement(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => setImage(event.target?.result as string);
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-2xl">
        <div className="p-8">
          {/* Logo Section: Styled to have white text on navy background and perfectly aligned */}
          <div className="mb-12 flex flex-col items-start">
            <h1 className="font-black text-3xl text-white tracking-tighter leading-none mb-2">
              포스코DX
            </h1>
            <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              Safety Management AI
            </div>
          </div>

          <nav className="space-y-3">
            <button onClick={() => setActiveTab('history')} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <div className="flex items-center gap-3"><LayoutDashboard size={20} /> <span className="font-bold">시공절차</span></div>
              {savedProcesses.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{savedProcesses.length}</span>}
            </button>
            <button onClick={() => setActiveTab('analysis')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <ClipboardList size={20} /> <span className="font-bold">상세 절차 분석</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-slate-800/50">
           <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">K-Safety Standard v5.3</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10">
        {activeTab === 'history' ? (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-end border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">시공절차 및 방법</h2>
                <p className="text-slate-500 mt-2 font-medium">현장 공정 흐름에 따른 안전 관리 타임라인입니다.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleExportToExcel} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm">
                  <Download size={20} className="text-emerald-500" /> Excel 내보내기
                </button>
                <button onClick={resetAnalysisState} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  <PlusCircle size={20} /> 새 작업 추가
                </button>
              </div>
            </header>

            {savedProcesses.length === 0 ? (
              <div className="bg-white rounded-[40px] py-32 text-center border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LayoutDashboard className="text-slate-200" size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-300">등록된 공정 절차가 없습니다.</h3>
                <p className="text-slate-400 mt-2">상세 절차 분석 탭에서 새로운 작업을 등록해주세요.</p>
              </div>
            ) : (
              <div className="relative space-y-8 pl-8 border-l-2 border-slate-200 ml-4">
                {savedProcesses.map((p, index) => (
                  <div key={p.id} className="relative group animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Timeline Dot */}
                    <div className="absolute -left-[45px] top-4 w-8 h-8 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-md">
                        <span className="text-[10px] font-black text-blue-600">{index + 1}</span>
                    </div>
                    
                    {/* Item Card */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group-hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">Phase {index + 1}</span>
                                <span className="text-xs text-slate-400 font-medium">{p.createdAt}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800">{p.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveProcess(index, 'up')} disabled={index === 0} className="p-2 text-slate-400 hover:text-blue-500 disabled:opacity-10"><ChevronUp size={20}/></button>
                            <button onClick={() => moveProcess(index, 'down')} disabled={index === savedProcesses.length - 1} className="p-2 text-slate-400 hover:text-blue-500 disabled:opacity-10"><ChevronDown size={20}/></button>
                            <div className="w-px h-6 bg-slate-100 mx-1"></div>
                            <button onClick={() => handleEditProcess(p)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black text-sm transition-all shadow-md"><Edit3 size={16}/> 수정하기</button>
                            <button onClick={() => handleDeleteHistory(p.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>
                        </div>
                      </div>
                      <p className="text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">{p.summary}</p>
                      
                      <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-400">
                        <div className="flex gap-4">
                            <span>단위작업: <span className="text-slate-600">{p.rows.length}건</span></span>
                            <span>상태: <span className="text-emerald-500">분석 완료</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{editingId ? "Editing" : "New Analysis"}</span>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Work Process Title</label>
                </div>
                <input 
                  type="text" 
                  value={workProcessTitle}
                  onChange={(e) => setWorkProcessTitle(e.target.value)}
                  placeholder="예) 타워크레인 자재 인양 및 설치"
                  className="w-full text-4xl font-black text-slate-900 placeholder:text-slate-200 focus:outline-none bg-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-3 self-end">
                <button onClick={resetAnalysisState} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50">
                    취소
                </button>
                <button 
                  onClick={handleSaveProcess} 
                  disabled={isAnalyzingSupplement} 
                  className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:bg-slate-400 transition-all active:scale-95"
                >
                   <Save size={22} className="text-blue-200" /> {editingId ? "수정 완료" : "시공절차 저장"}
                </button>
              </div>
            </header>

            {/* Analysis Input Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`relative min-h-[420px] border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all overflow-hidden ${image ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200 bg-white hover:border-blue-400'}`}>
                {image ? (
                  <img src={image} alt="Site preview" className="absolute inset-0 w-full h-full object-contain p-4" />
                ) : (
                  <div className="text-center p-10">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Upload className="text-slate-300" size={32} />
                    </div>
                    <h4 className="text-xl font-black text-slate-700">작업 현장 이미지</h4>
                    <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">작업장 사진, 조감도, 도면 등을<br/>클릭하여 업로드하거나 붙여넣으세요.</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-8 px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black font-black text-sm shadow-xl">이미지 선택</button>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[420px]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <h3 className="font-black text-slate-700">상세 작업절차 텍스트</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Input Area</span>
                </div>
                <div className="flex-1 p-0">
                  <textarea 
                    value={procedureText}
                    onChange={(e) => setProcedureText(e.target.value)}
                    placeholder="해당 시공절차의 작업 순서와 내용을 상세히 입력해주세요. AI가 이를 바탕으로 위험성 평가표 초안을 구성합니다."
                    className="w-full h-full p-8 text-slate-900 text-base font-medium leading-relaxed focus:outline-none resize-none placeholder:text-slate-300 bg-white"
                  />
                </div>
              </div>
            </section>

            {/* Analysis Logic */}
            <div className="flex flex-col items-center gap-6">
               <div className="flex gap-4 w-full max-w-2xl">
                  <button onClick={handlePerformAnalysis} disabled={isAnalyzing} className="flex-1 py-6 bg-blue-600 text-white rounded-[24px] font-black text-2xl flex items-center justify-center gap-4 hover:bg-blue-700 shadow-2xl shadow-blue-200 disabled:bg-slate-300 transition-all active:scale-95">
                    {isAnalyzing ? <RefreshCcw className="animate-spin" /> : <Sparkles size={28} />}
                    분석 실행
                  </button>
                  <button onClick={() => {setImage(null); setProcedureText('');}} className="px-10 py-6 bg-white border border-slate-200 text-slate-500 rounded-[24px] font-black hover:bg-slate-50 transition-all">초기화</button>
               </div>
               {legalClauses && (
                 <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex gap-4 items-start animate-in fade-in slide-in-from-top-2">
                    <div className="bg-emerald-500/10 p-2 rounded-lg"><Info className="text-emerald-600" size={20} /></div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-700 uppercase mb-1 tracking-widest">AI 법규 가이드 (관련 조항)</h4>
                      <p className="text-emerald-900 text-sm leading-relaxed italic font-medium">{legalClauses}</p>
                    </div>
                 </div>
               )}
            </div>

            <RiskTable rows={tableRows} setRows={setTableRows} />
            
            <div className="flex justify-center flex-col items-center gap-6 pt-6">
              <div className="bg-blue-50 text-blue-700 text-sm px-6 py-3 rounded-full font-bold border border-blue-100 flex items-center gap-3 shadow-sm">
                <Info size={16} /> <span>'반영사항 추가' 열에 작업 환경 특수성(높이, 장비 등)을 입력하면 보완 기능이 활성화됩니다.</span>
              </div>
              <button 
                onClick={handleAnalyzeSupplement} 
                disabled={isAnalyzingSupplement} 
                className="px-16 py-6 bg-slate-900 text-white rounded-[24px] font-black text-xl flex items-center gap-4 hover:bg-black transition-all shadow-2xl shadow-slate-200 disabled:bg-slate-300 active:scale-95"
              >
                {isAnalyzingSupplement ? <RefreshCcw className="animate-spin" /> : <ShieldCheck size={28} />}
                데이터 분석 및 정밀 보완
              </button>
            </div>

            {/* Result Display */}
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden mb-20">
              <div className="p-8 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-xl text-white"><ShieldCheck size={24} /></div>
                <div>
                    <h3 className="font-black text-white text-xl">최종 보완 위험성 평가표</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Final Risk Assessment Table (AI Optimized)</p>
                </div>
              </div>
              <div className="p-0 overflow-x-auto min-h-[220px]">
                {isAnalyzingSupplement ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-6">
                     <div className="w-14 h-14 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                     <p className="text-slate-800 font-black text-lg">인적 요소를 반영한 정밀 안전 분석 중...</p>
                  </div>
                ) : tableAnalysis ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
                        <th className="px-8 py-5 text-left w-1/4">보완 단위작업</th>
                        <th className="px-8 py-5 text-left w-1/3">정밀 잠재위험 (반영사항 적용)</th>
                        <th className="px-8 py-5 text-left w-1/3">최종 안전대책 (기술지침 준수)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      {tableAnalysis.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-8 py-6 text-base font-black text-slate-800 align-top">{row.unitTask}</td>
                          <td className="px-8 py-6 text-base text-blue-700 font-bold leading-relaxed align-top">{row.potentialHazard}</td>
                          <td className="px-8 py-6 text-base text-blue-900 font-bold leading-relaxed align-top">{row.safetyMeasure}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300 h-64">
                    <AlertTriangle size={48} className="mb-4 opacity-10" />
                    <p className="font-bold">분석 및 보완 버튼을 클릭하면 최종 데이터가 생성됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
