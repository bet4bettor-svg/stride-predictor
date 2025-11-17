import React, { useState, useMemo } from 'react';
import { defaultData } from './data/trainingData';
export default () => {
  const [view, setView] = useState('import');
  const [selectedAge, setSelectedAge] = useState('4plus');
  const [predictInputs, setPredictInputs] = useState({
    age: 3,
    spsAvg: 2.30,
    slAvg: 7.5,
    distance2yo: 7.0,
    ageTarget: 3
  });
  const [importText, setImportText] = useState('');
  const [customData, setCustomData] = useState(null);
  const [forecastImportText, setForecastImportText] = useState('');
  const [forecastData, setForecastData] = useState(null);

  
  const data = customData || defaultData;
  const data3yo = useMemo(() => data.filter(h => h.age === 3), [data]);
  const data4plus = useMemo(() => data.filter(h => h.age >= 4), [data]);

  const handleImportData = () => {
    try {
      const lines = importText.trim().split('\n');
      const parsed = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 12) {
          parsed.push({
            horse: parts[1],
            distance: parseFloat(parts[3]),
            age: parseInt(parts[6]),
            spsAvg: parseFloat(parts[8]),
            slAvg: parseFloat(parts[11])
          });
        }
      }
      
      if (parsed.length > 0) {
        setCustomData(parsed);
        setView('comparison');
        setImportText('');
        alert(`Successfully imported ${parsed.length} horses!`);
      }
    } catch (error) {
      alert('Error parsing data.');
    }
  };

  const handleImportForecastData = () => {
    try {
      const lines = forecastImportText.trim().split('\n');
      const parsed = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length >= 5) {
          parsed.push({
            horse: parts[0],
            spsAvg2yo: parseFloat(parts[1]),
            slAvg2yo: parseFloat(parts[2]),
            distance2yo: parseFloat(parts[3]),
            distance3yo: parseFloat(parts[4])
          });
        }
      }
      
      if (parsed.length > 0) {
        setForecastData(parsed);
        setView('forecast-model');
        setForecastImportText('');
        alert(`Successfully imported ${parsed.length} horses for Model B!`);
      }
    } catch (error) {
      alert('Error parsing forecast data.');
    }
  };

  const calculateModelStats = (dataset) => {
    const n = dataset.length;
    if (n < 10) return null;
    
    const correlation = (x, y) => {
      const meanX = x.reduce((a, b) => a + b) / n;
      const meanY = y.reduce((a, b) => a + b) / n;
      const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
      const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
      return num / (denX * denY);
    };

    const distances = dataset.map(d => d.distance);
    const spsAvgCorr = correlation(dataset.map(d => d.spsAvg), distances);
    const slAvgCorr = correlation(dataset.map(d => d.slAvg), distances);

    const X = dataset.map(d => [1, d.spsAvg, d.slAvg]);
    const y = distances;
    
    const XtX = [
      [n, X.reduce((s, row) => s + row[1], 0), X.reduce((s, row) => s + row[2], 0)],
      [X.reduce((s, row) => s + row[1], 0), X.reduce((s, row) => s + row[1] * row[1], 0), X.reduce((s, row) => s + row[1] * row[2], 0)],
      [X.reduce((s, row) => s + row[2], 0), X.reduce((s, row) => s + row[1] * row[2], 0), X.reduce((s, row) => s + row[2] * row[2], 0)]
    ];
    
    const Xty = [
      y.reduce((s, yi) => s + yi, 0),
      X.reduce((s, row, i) => s + row[1] * y[i], 0),
      X.reduce((s, row, i) => s + row[2] * y[i], 0)
    ];

    const det = XtX[0][0] * (XtX[1][1] * XtX[2][2] - XtX[1][2] * XtX[2][1]) -
                XtX[0][1] * (XtX[1][0] * XtX[2][2] - XtX[1][2] * XtX[2][0]) +
                XtX[0][2] * (XtX[1][0] * XtX[2][1] - XtX[1][1] * XtX[2][0]);

    const inv = [
      [(XtX[1][1] * XtX[2][2] - XtX[1][2] * XtX[2][1]) / det,
       -(XtX[0][1] * XtX[2][2] - XtX[0][2] * XtX[2][1]) / det,
       (XtX[0][1] * XtX[1][2] - XtX[0][2] * XtX[1][1]) / det],
      [-(XtX[1][0] * XtX[2][2] - XtX[1][2] * XtX[2][0]) / det,
       (XtX[0][0] * XtX[2][2] - XtX[0][2] * XtX[2][0]) / det,
       -(XtX[0][0] * XtX[1][2] - XtX[0][2] * XtX[1][0]) / det],
      [(XtX[1][0] * XtX[2][1] - XtX[1][1] * XtX[2][0]) / det,
       -(XtX[0][0] * XtX[2][1] - XtX[0][1] * XtX[2][0]) / det,
       (XtX[0][0] * XtX[1][1] - XtX[0][1] * XtX[1][0]) / det]
    ];

    const coefficients = [
      inv[0][0] * Xty[0] + inv[0][1] * Xty[1] + inv[0][2] * Xty[2],
      inv[1][0] * Xty[0] + inv[1][1] * Xty[1] + inv[1][2] * Xty[2],
      inv[2][0] * Xty[0] + inv[2][1] * Xty[1] + inv[2][2] * Xty[2]
    ];

    const predictions = X.map(row => coefficients[0] + coefficients[1] * row[1] + coefficients[2] * row[2]);
    const meanY = y.reduce((a, b) => a + b) / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { spsAvgCorr, slAvgCorr, coefficients, rSquared, n };
  };

  const calculateForecastModelStats = (dataset) => {
    const n = dataset.length;
    if (n < 10) return null;
    
    const correlation = (x, y) => {
      const meanX = x.reduce((a, b) => a + b) / n;
      const meanY = y.reduce((a, b) => a + b) / n;
      const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
      const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
      const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
      return num / (denX * denY);
    };

    const distances = dataset.map(d => d.distance3yo);
    const spsAvgCorr = correlation(dataset.map(d => d.spsAvg2yo), distances);
    const slAvgCorr = correlation(dataset.map(d => d.slAvg2yo), distances);
    const distance2yoCorr = correlation(dataset.map(d => d.distance2yo), distances);

    const X = dataset.map(d => [1, d.spsAvg2yo, d.slAvg2yo, d.distance2yo]);
    const y = distances;
    
    const XtX = [
      [n, 
       X.reduce((s, row) => s + row[1], 0), 
       X.reduce((s, row) => s + row[2], 0),
       X.reduce((s, row) => s + row[3], 0)],
      [X.reduce((s, row) => s + row[1], 0), 
       X.reduce((s, row) => s + row[1] * row[1], 0), 
       X.reduce((s, row) => s + row[1] * row[2], 0),
       X.reduce((s, row) => s + row[1] * row[3], 0)],
      [X.reduce((s, row) => s + row[2], 0), 
       X.reduce((s, row) => s + row[1] * row[2], 0), 
       X.reduce((s, row) => s + row[2] * row[2], 0),
       X.reduce((s, row) => s + row[2] * row[3], 0)],
      [X.reduce((s, row) => s + row[3], 0),
       X.reduce((s, row) => s + row[1] * row[3], 0),
       X.reduce((s, row) => s + row[2] * row[3], 0),
       X.reduce((s, row) => s + row[3] * row[3], 0)]
    ];
    
    const Xty = [
      y.reduce((s, yi) => s + yi, 0),
      X.reduce((s, row, i) => s + row[1] * y[i], 0),
      X.reduce((s, row, i) => s + row[2] * y[i], 0),
      X.reduce((s, row, i) => s + row[3] * y[i], 0)
    ];

    const inv = invertMatrix4x4(XtX);
    
    const coefficients = [
      inv[0][0] * Xty[0] + inv[0][1] * Xty[1] + inv[0][2] * Xty[2] + inv[0][3] * Xty[3],
      inv[1][0] * Xty[0] + inv[1][1] * Xty[1] + inv[1][2] * Xty[2] + inv[1][3] * Xty[3],
      inv[2][0] * Xty[0] + inv[2][1] * Xty[1] + inv[2][2] * Xty[2] + inv[2][3] * Xty[3],
      inv[3][0] * Xty[0] + inv[3][1] * Xty[1] + inv[3][2] * Xty[2] + inv[3][3] * Xty[3]
    ];

    const predictions = X.map(row => coefficients[0] + coefficients[1] * row[1] + coefficients[2] * row[2] + coefficients[3] * row[3]);
    const meanY = y.reduce((a, b) => a + b) / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { spsAvgCorr, slAvgCorr, distance2yoCorr, coefficients, rSquared, n };
  };

  const invertMatrix4x4 = (matrix) => {
    const m = matrix.map(row => [...row]);
    const inv = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    for (let i = 0; i < 4; i++) {
      let maxRow = i;
      for (let k = i + 1; k < 4; k++) {
        if (Math.abs(m[k][i]) > Math.abs(m[maxRow][i])) {
          maxRow = k;
        }
      }

      [m[i], m[maxRow]] = [m[maxRow], m[i]];
      [inv[i], inv[maxRow]] = [inv[maxRow], inv[i]];

      const pivot = m[i][i];
      for (let j = 0; j < 4; j++) {
        m[i][j] /= pivot;
        inv[i][j] /= pivot;
      }

      for (let k = 0; k < 4; k++) {
        if (k !== i) {
          const factor = m[k][i];
          for (let j = 0; j < 4; j++) {
            m[k][j] -= factor * m[i][j];
            inv[k][j] -= factor * inv[i][j];
          }
        }
      }
    }

    return inv;
  };

  const stats3yo = useMemo(() => calculateModelStats(data3yo), [data3yo]);
  const stats4plus = useMemo(() => calculateModelStats(data4plus), [data4plus]);
  const statsForecast = useMemo(() => forecastData ? calculateForecastModelStats(forecastData) : null, [forecastData]);

  const residualsForecast = useMemo(() => {
    if (!forecastData || !statsForecast) return [];
    return forecastData
      .map(horse => {
        const predicted = statsForecast.coefficients[0] + 
                         statsForecast.coefficients[1] * horse.spsAvg2yo + 
                         statsForecast.coefficients[2] * horse.slAvg2yo +
                         statsForecast.coefficients[3] * horse.distance2yo;
        const residual = horse.distance3yo - predicted;
        return { ...horse, predicted, residual, absResidual: Math.abs(residual) };
      })
      .sort((a, b) => b.absResidual - a.absResidual);
  }, [forecastData, statsForecast]);

  const convertToRaceDistance = (furlongs) => {
    const distances = [
      { f: 5, name: "5f" }, { f: 6, name: "6f" }, { f: 7, name: "7f" },
      { f: 8, name: "1m" }, { f: 9, name: "1m1f" }, { f: 10, name: "1m2f" },
      { f: 11, name: "1m3f" }, { f: 12, name: "1m4f" }, { f: 13, name: "1m5f" },
      { f: 14, name: "1m6f" }, { f: 15, name: "1m7f" }, { f: 16, name: "2m" }
    ];
    
    let closest = distances[0];
    let minDiff = Math.abs(furlongs - distances[0].f);
    
    for (const dist of distances) {
      const diff = Math.abs(furlongs - dist.f);
      if (diff < minDiff) {
        minDiff = diff;
        closest = dist;
      }
    }
    
    return closest.name;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            🐎 Racehorse Distance Predictor
          </h1>
          <p className="text-center text-gray-600 mb-4 text-sm">
            Model B: Biomechanics + Race Context Analysis
          </p>
          
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <button onClick={() => setView('import')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              📥 Import Data (3yo/4+yo)
            </button>
            <button onClick={() => setView('comparison')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              📊 3yo & 4+yo Models
            </button>
            <button onClick={() => setView('predictor')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'predictor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              🎯 Predict (Current)
            </button>
            <button onClick={() => setView('forecast-import')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'forecast-import' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              📥 Import 2yo→3yo
            </button>
            <button onClick={() => setView('forecast-model')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'forecast-model' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              🔮 Model B Stats
            </button>
            <button onClick={() => setView('forecast-predictor')} className={`px-3 py-2 rounded-lg font-semibold transition-colors ${view === 'forecast-predictor' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              🎯 Forecast 3yo
            </button>
          </div>
        </div>

      {view === 'import' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-3">Import Current Performance Data</h2>
          <p className="text-sm text-gray-600 mb-3">For 3yo & 4+yo models</p>
          <textarea
            className="w-full h-48 p-3 border rounded-lg font-mono text-xs"
            placeholder="Paste tab-separated data here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button onClick={handleImportData} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold mt-3">
            Import Data
          </button>
        </div>
      )}

      {view === 'forecast-import' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-3">Import 2yo → 3yo Data (Model B)</h2>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-3">
            <p className="font-semibold text-sm mb-1">📋 Format (5 columns, tab-separated):</p>
            <pre className="text-xs bg-white p-2 rounded">Horse  2yo_SPS  2yo_SL  2yo_Race_Dist  3yo_Optimal</pre>
          </div>
          <textarea
            className="w-full h-48 p-3 border rounded-lg font-mono text-xs"
            placeholder="Paste 5-column data..."
            value={forecastImportText}
            onChange={(e) => setForecastImportText(e.target.value)}
          />
          <button onClick={handleImportForecastData} className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold mt-3">
            Import Model B Data
          </button>
        </div>
      )}

      {view === 'comparison' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-center">Current Performance Models</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border-2 border-blue-300 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-700 mb-2">3-Year-Olds</h3>
              {stats3yo ? (
                <>
                  <div className="text-4xl font-bold text-blue-600">{(stats3yo.rSquared * 100).toFixed(1)}%</div>
                  <p className="text-xs text-gray-600">R² • {stats3yo.n} horses</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Need 10+ horses</p>
              )}
            </div>

            <div className="p-4 rounded-lg border-2 border-green-300 bg-green-50">
              <h3 className="text-lg font-bold text-green-700 mb-2">4+ Year-Olds</h3>
              {stats4plus ? (
                <>
                  <div className="text-4xl font-bold text-green-600">{(stats4plus.rSquared * 100).toFixed(1)}%</div>
                  <p className="text-xs text-gray-600">R² • {stats4plus.n} horses</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Need 10+ horses</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'predictor' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-3">Predict Current Optimal Distance</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1">Age</label>
              <select value={predictInputs.age} onChange={(e) => setPredictInputs({...predictInputs, age: parseInt(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm">
                <option value={3}>3yo</option>
                <option value={4}>4+yo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">SPS (Hz)</label>
              <input type="number" step="0.01" value={predictInputs.spsAvg} onChange={(e) => setPredictInputs({...predictInputs, spsAvg: parseFloat(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1">SL (m)</label>
              <input type="number" step="0.01" value={predictInputs.slAvg} onChange={(e) => setPredictInputs({...predictInputs, slAvg: parseFloat(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm" />
            </div>
          </div>

          {(() => {
            const currentStats = predictInputs.age === 3 ? stats3yo : stats4plus;
            if (!currentStats) return <p className="text-center text-gray-500 text-sm">Not enough data</p>;

            const prediction = currentStats.coefficients[0] + currentStats.coefficients[1] * predictInputs.spsAvg + currentStats.coefficients[2] * predictInputs.slAvg;

            return (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg text-center border-2 border-blue-300">
                <p className="text-xs text-gray-600 mb-1">PREDICTED DISTANCE</p>
                <p className="text-4xl font-bold text-blue-600 mb-1">{prediction.toFixed(1)}f</p>
                <p className="text-xl text-gray-700 font-semibold">{convertToRaceDistance(prediction)}</p>
                <p className="text-xs text-gray-500 mt-2">R²: {(currentStats.rSquared * 100).toFixed(1)}%</p>
              </div>
            );
          })()}
        </div>
      )}

      {view === 'forecast-model' && (
        <div className="bg-white rounded-lg shadow p-6">
          {statsForecast ? (
            <>
              <h2 className="text-xl font-bold mb-4 text-center">Model B: 2yo → 3yo Forecast</h2>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-300 mb-4">
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-purple-600 mb-1">{(statsForecast.rSquared * 100).toFixed(1)}%</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">R² Accuracy</p>
                  <p className="text-xs text-gray-600">{statsForecast.n} horses • With Race Context</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">SPS Corr</p>
                    <p className="text-sm font-bold text-purple-700">{statsForecast.spsAvgCorr.toFixed(3)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">SL Corr</p>
                    <p className="text-sm font-bold text-purple-700">{statsForecast.slAvgCorr.toFixed(3)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">Dist Corr</p>
                    <p className="text-sm font-bold text-green-700">{statsForecast.distance2yoCorr.toFixed(3)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-sm mb-3">🔢 Model B Coefficients:</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">Intercept</p>
                    <p className="text-lg font-bold">{statsForecast.coefficients[0].toFixed(4)}</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">2yo SPS</p>
                    <p className="text-lg font-bold text-blue-600">{statsForecast.coefficients[1].toFixed(4)}</p>
                    <p className="text-xs text-gray-500">Per 0.1Hz: {(statsForecast.coefficients[1] * 0.1).toFixed(2)}f</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">2yo SL ⭐</p>
                    <p className="text-lg font-bold text-green-600">{statsForecast.coefficients[2].toFixed(4)}</p>
                    <p className="text-xs text-gray-500">Per 0.5m: {(statsForecast.coefficients[2] * 0.5).toFixed(2)}f</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="text-gray-600">2yo Distance ⭐</p>
                    <p className="text-lg font-bold text-orange-600">{statsForecast.coefficients[3].toFixed(4)}</p>
                    <p className="text-xs text-gray-500">Per furlong: {statsForecast.coefficients[3].toFixed(2)}f</p>
                  </div>
                </div>
              </div>

              {residualsForecast.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-purple-700 mb-2">Top 5 Prediction Errors</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-purple-100">
                          <th className="border border-purple-300 px-2 py-1 text-left">Horse</th>
                          <th className="border border-purple-300 px-2 py-1 text-right">2yo Dist</th>
                          <th className="border border-purple-300 px-2 py-1 text-right">Actual 3yo</th>
                          <th className="border border-purple-300 px-2 py-1 text-right">Predicted</th>
                          <th className="border border-purple-300 px-2 py-1 text-right">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residualsForecast.slice(0, 5).map((horse, idx) => (
                          <tr key={idx} className={horse.absResidual > 2 ? 'bg-red-50' : 'bg-white'}>
                            <td className="border border-purple-200 px-2 py-1 font-medium">{horse.horse}</td>
                            <td className="border border-purple-200 px-2 py-1 text-right">{horse.distance2yo.toFixed(1)}f</td>
                            <td className="border border-purple-200 px-2 py-1 text-right">{horse.distance3yo.toFixed(1)}f</td>
                            <td className="border border-purple-200 px-2 py-1 text-right">{horse.predicted.toFixed(1)}f</td>
                            <td className="border border-purple-200 px-2 py-1 text-right font-bold">
                              {horse.residual > 0 ? '+' : ''}{horse.residual.toFixed(2)}f
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <p className="text-lg text-gray-600 mb-2">No Data Loaded</p>
              <p className="text-sm text-gray-500 mb-3">Import 2yo → 3yo data to see Model B</p>
              <button onClick={() => setView('forecast-import')} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold">
                Import Data
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'forecast-predictor' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-3">Forecast 3yo Distance (Model B)</h2>
          
          {statsForecast ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1">2yo SPS (Hz)</label>
                  <input type="number" step="0.01" value={predictInputs.spsAvg} onChange={(e) => setPredictInputs({...predictInputs, spsAvg: parseFloat(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1">2yo SL (m)</label>
                  <input type="number" step="0.01" value={predictInputs.slAvg} onChange={(e) => setPredictInputs({...predictInputs, slAvg: parseFloat(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1">2yo Race Dist (f)</label>
                  <input type="number" step="0.5" value={predictInputs.distance2yo} onChange={(e) => setPredictInputs({...predictInputs, distance2yo: parseFloat(e.target.value)})} className="w-full px-2 py-2 border rounded text-sm" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg text-center border-2 border-purple-300">
                <p className="text-xs text-gray-600 mb-1">PREDICTED 3YO DISTANCE</p>
                <p className="text-xs text-gray-500 mb-2">(Model B: Bio + Race Context)</p>
                <p className="text-4xl font-bold text-purple-600 mb-1">
                  {(() => {
                    const prediction = statsForecast.coefficients[0] + 
                                     statsForecast.coefficients[1] * predictInputs.spsAvg + 
                                     statsForecast.coefficients[2] * predictInputs.slAvg +
                                     statsForecast.coefficients[3] * predictInputs.distance2yo;
                    return prediction.toFixed(1);
                  })()}f
                </p>
                <p className="text-xl text-gray-700 font-semibold">
                  {(() => {
                    const prediction = statsForecast.coefficients[0] + 
                                     statsForecast.coefficients[1] * predictInputs.spsAvg + 
                                     statsForecast.coefficients[2] * predictInputs.slAvg +
                                     statsForecast.coefficients[3] * predictInputs.distance2yo;
                    return convertToRaceDistance(prediction);
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-2">R²: {(statsForecast.rSquared * 100).toFixed(1)}% • {statsForecast.n} horses</p>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <p className="text-sm text-gray-600 mb-3">No Model B data loaded</p>
              <button onClick={() => setView('forecast-import')} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm">
                Import Data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
};
