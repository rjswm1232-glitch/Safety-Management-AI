
import React from 'react';
import { Plus, Trash2, Clipboard, ChevronUp, ChevronDown } from 'lucide-react';
import { SafetyTableRow } from '../types';

interface RiskTableProps {
  rows: SafetyTableRow[];
  setRows: React.Dispatch<React.SetStateAction<SafetyTableRow[]>>;
}

const RiskTable: React.FC<RiskTableProps> = ({ rows, setRows }) => {
  const addRow = () => {
    const newRow: SafetyTableRow = {
      id: crypto.randomUUID(),
      unitTask: '',
      potentialHazard: '',
      safetyMeasure: '',
      reflectedItems: ''
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    const newRows = [...rows];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRows.length) return;
    
    [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
    setRows(newRows);
  };

  const updateRow = (id: string, field: keyof SafetyTableRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const lines = pasteData.trim().split(/\r?\n/);
    if (lines.length > 0 && lines[0].includes('\t')) {
      e.preventDefault();
      e.stopPropagation(); 
      
      const newRowsFromPaste: SafetyTableRow[] = lines.map(line => {
        const columns = line.split('\t');
        return {
          id: crypto.randomUUID(),
          unitTask: columns[0] || '',
          potentialHazard: columns[1] || '',
          safetyMeasure: columns[2] || '',
          reflectedItems: columns[3] || ''
        };
      });
      
      if (rows.length === 1 && !rows[0].unitTask && !rows[0].potentialHazard) {
        setRows(newRowsFromPaste);
      } else {
        setRows([...rows, ...newRowsFromPaste]);
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" onPaste={handlePaste}>
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Clipboard size={18} /> 위험성 평가표 작성 (순서 편집 가능)
        </h3>
        <div className="text-xs text-slate-500 italic">행 옆의 화살표로 순서를 변경할 수 있습니다.</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-sm font-medium">
              <th className="px-4 py-3 text-left border-b w-[18%]">단위작업명</th>
              <th className="px-4 py-3 text-left border-b w-[24%]">잠재위험</th>
              <th className="px-4 py-3 text-left border-b w-[24%]">안전대책</th>
              <th className="px-4 py-3 text-left border-b w-[22%] bg-blue-50/50 text-blue-700">반영사항 추가</th>
              <th className="px-4 py-3 text-center border-b w-24">순서/관리</th>
            </tr>
          </thead>
          <tbody className="text-black">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-1 border-b">
                  <textarea
                    className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-black text-sm"
                    rows={2}
                    value={row.unitTask}
                    onChange={(e) => updateRow(row.id, 'unitTask', e.target.value)}
                    placeholder="작업명"
                  />
                </td>
                <td className="p-1 border-b border-l">
                  <textarea
                    className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-black text-sm"
                    rows={2}
                    value={row.potentialHazard}
                    onChange={(e) => updateRow(row.id, 'potentialHazard', e.target.value)}
                    placeholder="위험요인"
                  />
                </td>
                <td className="p-1 border-b border-l">
                  <textarea
                    className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-black text-sm"
                    rows={2}
                    value={row.safetyMeasure}
                    onChange={(e) => updateRow(row.id, 'safetyMeasure', e.target.value)}
                    placeholder="안전대책"
                  />
                </td>
                <td className="p-1 border-b border-l bg-blue-50/20">
                  <textarea
                    className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-black text-sm font-medium"
                    rows={2}
                    value={row.reflectedItems}
                    onChange={(e) => updateRow(row.id, 'reflectedItems', e.target.value)}
                    placeholder="높이, 공구 등 입력"
                  />
                </td>
                <td className="p-2 border-b text-center align-middle">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveRow(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-20"
                        title="위로 이동"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveRow(index, 'down')}
                        disabled={index === rows.length - 1}
                        className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-20"
                        title="아래로 이동"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                      title="행 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 bg-slate-50 flex justify-start">
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
        >
          <Plus size={16} /> 행 추가하기
        </button>
      </div>
    </div>
  );
};

export default RiskTable;
