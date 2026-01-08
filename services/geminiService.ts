
import { GoogleGenAI, Type } from "@google/genai";
import { SafetyTableRow, FullAnalysisResult, SupplementRow } from "../types";

export async function performFullSafetyAnalysis(
  title: string, 
  base64Image: string | null, 
  procedureText: string
): Promise<{ tableData: SafetyTableRow[], legalClauses: string }> {
  // Initialize GoogleGenAI inside the function to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    당신은 대한민국 최고의 산업안전보건 전문가입니다. 
    다음 정보를 바탕으로 위험성 평가표(Risk Assessment) 초안을 작성해주세요.

    1. 작업 공정명: "${title}"
    2. 상세 작업절차: "${procedureText}"
    ${base64Image ? "3. 현장 사진/조감도 정보가 이미지로 제공되었습니다." : ""}

    요구사항:
    - 작업 공정명과 상세 작업절차를 분석하여 핵심적인 '단위작업'들로 나누십시오.
    - 각 단위작업별로 발생 가능한 '잠재위험'과 그에 따른 실효성 있는 '안전대책'을 도출하십시오.
    - 'reflectedItems'(반영사항 추가) 필드는 반드시 빈 문자열("")로 반환하십시오. 이 필드는 나중에 사람이 직접 입력할 공간입니다.

    응답 형식: 반드시 JSON 형식으로만 답변하십시오.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        ...(base64Image ? [{ inlineData: { data: base64Image, mimeType: "image/jpeg" } }] : []),
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tableData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                unitTask: { type: Type.STRING },
                potentialHazard: { type: Type.STRING },
                safetyMeasure: { type: Type.STRING }
              },
              required: ["unitTask", "potentialHazard", "safetyMeasure"]
            }
          },
          legalClauses: { type: Type.STRING, description: "관련 법 조항 요약" }
        },
        required: ["tableData", "legalClauses"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text);
    const processedTableData = result.tableData.map((row: any) => ({
      ...row,
      id: crypto.randomUUID(),
      reflectedItems: "" // Ensure this is empty as requested
    }));
    return {
      tableData: processedTableData,
      legalClauses: result.legalClauses
    };
  } catch (e) {
    console.error("Analysis Parsing Error:", e);
    throw new Error("AI 분석 데이터 파싱에 실패했습니다.");
  }
}

export async function analyzeSafetyTable(rows: SafetyTableRow[]): Promise<SupplementRow[]> {
  // Initialize GoogleGenAI inside the function to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview'; // Use Pro for complex reasoning over human inputs
  const tableData = rows.map(r => 
    `단위작업: ${r.unitTask}, 잠재위험: ${r.potentialHazard}, 안전대책: ${r.safetyMeasure}, 사용자가 직접 입력한 현장 반영사항(중요): ${r.reflectedItems}`
  ).join('\n---\n');
  
  const prompt = `
    다음은 기존 위험성 평가표에 사용자가 직접 '반영사항 추가'(사용 공구, 장비, 작업 높이, 추가 위험 등)를 입력한 데이터입니다.
    사용자가 입력한 '반영사항 추가' 내용을 적극 반영하여, 최종적으로 수정 및 보완된 완벽한 위험성 평가표를 생성하십시오.
    
    데이터:
    ${tableData}

    지침:
    1. 사용자가 '반영사항'에 입력한 높이, 도구, 장비 특성을 고려하여 잠재위험을 더 구체화하십시오.
    2. 안전대책 역시 해당 장비나 높이에 맞는 법적/기술적 기준을 적용하여 강화하십시오.
    3. 결과는 각 행에 대해 보완된 단위작업, 보완된 잠재위험, 보완된 안전대책으로 구성하십시오.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            unitTask: { type: Type.STRING },
            potentialHazard: { type: Type.STRING },
            safetyMeasure: { type: Type.STRING }
          },
          required: ["unitTask", "potentialHazard", "safetyMeasure"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return [];
  }
}

export async function summarizeOverallProcess(title: string, rows: SafetyTableRow[]): Promise<string> {
  // Initialize GoogleGenAI inside the function to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  const tableData = rows.map(r => `- ${r.unitTask}`).join('\n');
  const prompt = `공정명: ${title}\n작업목록:\n${tableData}\n\n위 시공 절차를 안전 관점에서 2문장 이내로 요약해줘.`;
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }]
  });
  return response.text || "";
}
