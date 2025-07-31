import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import './App.css';

// Interface for a single row of data from the CSV
interface ProbeData {
  epoch: number;
  question_id: number;
  token_idx: number;
  token_id: number;
  token_text: string;
  prob_A: number;
  prob_B: number;
  prob_C: number;
  prob_D: number;
  pred_letter: 'A' | 'B' | 'C' | 'D';
  target_letter: 'A' | 'B' | 'C' | 'D';
}

// Data grouped by question ID
type GroupedData = Record<string, ProbeData[]>;

const MemoizedBarChart = React.memo(({ chartData, hoveredToken }: { chartData: any[], hoveredToken: ProbeData | null }) => {
  return (
    <div className="chart-container">
      {hoveredToken ? (
         <>
          <h3>Token: "{hoveredToken.token_text.replace(/Ġ/g, ' ')}" (Index: {hoveredToken.token_idx})</h3>
          <p>
            Prediction: <b>{hoveredToken.pred_letter}</b>, Target: <b>{hoveredToken.target_letter}</b>
          </p>
          <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip isAnimationActive={false} />
                  <Legend />
                  <Bar dataKey="probability" isAnimationActive={false}>
                      {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </Bar>
              </BarChart>
          </ResponsiveContainer>
         </>
      ) : (
        <div className="placeholder-text">Hover over a token to see details</div>
      )}
    </div>
  );
});

const MemoizedMovingAverageChart = React.memo(({ movingAverageData }: { movingAverageData: any[] }) => {
  return (
    <div className="moving-average-chart-container chart-container">
      <h3>Correct Predictions in Window (size=10)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={movingAverageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="token_idx" label={{ value: 'Token Index', position: 'insideBottom', offset: -5 }} />
          <YAxis domain={[0, 10]} allowDecimals={false} />
          <Tooltip isAnimationActive={false} />
          <Legend />
          <Line type="monotone" dataKey="Correct in window" stroke="#8884d8" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

const App: React.FC = () => {
  const [data, setData] = useState<GroupedData | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [hoveredToken, setHoveredToken] = useState<ProbeData | null>(null);
  const [fileName, setFileName] = useState<string>('Default: val_details_epoch64_lstm.csv');
  const [colorMode, setColorMode] = useState<'binary' | 'probability'>('binary');

  const processData = (results: Papa.ParseResult<ProbeData>) => {
    const grouped: GroupedData = {};
    for (const row of results.data) {
      if (row.question_id === null || row.question_id === undefined) continue;
      
      const sanitizedRow = {
        ...row,
        token_text: String(row.token_text ?? ''),
      };

      const key = String(sanitizedRow.question_id);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(sanitizedRow);
    }
    for (const key in grouped) {
      grouped[key].sort((a, b) => a.token_idx - b.token_idx);
    }
    setData(grouped);
    setSelectedQuestion(Object.keys(grouped)[0] || null);
  };

  useEffect(() => {
    Papa.parse<ProbeData>('/val_details_epoch64_lstm.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: processData,
    });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse<ProbeData>(file, {
        header: true,
        dynamicTyping: true,
        complete: processData,
      });
    }
  };

  const getBackgroundColor = useCallback((token: ProbeData): string => {
    const probabilityColor = `rgba(50, 100, 255, 1)`; // Full blue
    
    if (colorMode === 'binary') {
      return token.pred_letter === token.target_letter 
        ? probabilityColor
        : '#ffffff'; // White for incorrect
    } else {
      const targetProbKey = `prob_${token.target_letter}` as keyof ProbeData;
      const probability = (token[targetProbKey] as number) || 0;
      return `rgba(50, 100, 255, ${probability})`;
    }
  }, [colorMode]);

  const chartData = useMemo(() => {
    if (!hoveredToken) return [];
    return [
      { name: 'A', probability: hoveredToken.prob_A, fill: '#8884d8' },
      { name: 'B', probability: hoveredToken.prob_B, fill: '#82ca9d' },
      { name: 'C', probability: hoveredToken.prob_C, fill: '#ffc658' },
      { name: 'D', probability: hoveredToken.prob_D, fill: '#ff8042' },
    ];
  }, [hoveredToken]);
  
  const questionList = useMemo(() => Object.keys(data || {}), [data]);

  const movingAverageData = useMemo(() => {
    if (!selectedQuestion || !data || !data[selectedQuestion]) return [];
    
    const windowSize = 10;
    const questionData = data[selectedQuestion];
    const averages = [];
    
    // Efficiently calculate sliding window sum
    let correctCount = 0;
    for (let i = 0; i < questionData.length; i++) {
        if (questionData[i].pred_letter === questionData[i].target_letter) {
            correctCount++;
        }
        if (i >= windowSize) {
            if (questionData[i - windowSize].pred_letter === questionData[i - windowSize].target_letter) {
                correctCount--;
            }
        }
        averages.push({
            token_idx: questionData[i].token_idx,
            'Correct in window': correctCount,
        });
    }
    return averages;
  }, [selectedQuestion, data]);

  const selectPreviousQuestion = useCallback(() => {
    if (!selectedQuestion) return;
    const currentIndex = questionList.indexOf(selectedQuestion);
    if (currentIndex > 0) {
      setSelectedQuestion(questionList[currentIndex - 1]);
    }
  }, [selectedQuestion, questionList]);

  const selectNextQuestion = useCallback(() => {
    if (!selectedQuestion) return;
    const currentIndex = questionList.indexOf(selectedQuestion);
    if (currentIndex < questionList.length - 1) {
      setSelectedQuestion(questionList[currentIndex + 1]);
    }
  }, [selectedQuestion, questionList]);


  return (
    <div className="App">
      <header className="App-header">
        <h1>Probe Prediction Visualizer</h1>
        <div className="controls">
            <div className="color-mode-toggle">
                <label>
                    <input 
                        type="radio" 
                        value="binary" 
                        checked={colorMode === 'binary'} 
                        onChange={() => setColorMode('binary')} 
                    />
                    Binary
                </label>
                <label>
                    <input 
                        type="radio" 
                        value="probability" 
                        checked={colorMode === 'probability'} 
                        onChange={() => setColorMode('probability')} 
                    />
                    Probability
                </label>
            </div>
            <label className="file-upload">
              {fileName || 'Upload CSV File'}
              <input type="file" accept=".csv" onChange={handleFileUpload} />
            </label>
        </div>
      </header>

      {data && (
        <main className="main-content">
          <div className="question-selector">
            <button onClick={selectPreviousQuestion} disabled={!selectedQuestion || questionList.indexOf(selectedQuestion) === 0}>
              &larr; Previous
            </button>
            <select 
              value={selectedQuestion || ''} 
              onChange={(e) => setSelectedQuestion(e.target.value)}
            >
              <option value="" disabled>Select a question</option>
              {questionList.map(qId => (
                <option key={qId} value={qId}>Question ID: {qId}</option>
              ))}
            </select>
             <button onClick={selectNextQuestion} disabled={!selectedQuestion || questionList.indexOf(selectedQuestion) === questionList.length - 1}>
              Next &rarr;
            </button>
          </div>

          {selectedQuestion && data[selectedQuestion] && (
            <div className="visualization-area">
              <div className="token-sequence-container" onMouseLeave={() => setHoveredToken(null)}>
                <h2>
                  Question {selectedQuestion} (Target Answer: {data[selectedQuestion][0]?.target_letter})
                </h2>
                <div className="token-sequence">
                  {data[selectedQuestion].map((token) => (
                    <span
                      key={token.token_idx}
                      className="token"
                      style={{ backgroundColor: getBackgroundColor(token) }}
                      onMouseEnter={() => setHoveredToken(token)}
                    >
                      {token.token_text.replace(/Ġ/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="side-panel">
                <MemoizedBarChart chartData={chartData} hoveredToken={hoveredToken} />
                <MemoizedMovingAverageChart movingAverageData={movingAverageData} />
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
};

export default App;
