const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('IneqMath_Judge_Private/data/leaderboard/all_leaderboard_results.json', 'utf8'));

// Process the data
const models = [];
for (const [modelKey, modelData] of Object.entries(data)) {
  const model = {
    name: modelData.model_name || modelKey,
    type: modelData.model_type || 'N/A',
    source: modelData.model_source || 'N/A',
    date: modelData.model_date || 'N/A',
    overallAcc: modelData.overall_accuracy || 0,
    isCorrect: modelData.is_correct?.accuracy || 0,
    toyCase: modelData.toy_case_judge?.accuracy || 0,
    logicalGap: modelData.logical_gap_judge?.accuracy || 0,
    approx: modelData.approx_judge?.accuracy || 0,
    calc: modelData.calc_judge?.accuracy || 0
  };
  models.push(model);
}

// Sort by overall accuracy (descending)
models.sort((a, b) => b.overallAcc - a.overallAcc);

// Helper function to determine accuracy class
function getAccuracyClass(accuracy) {
  if (accuracy >= 80) return '#28a745'; // Green
  if (accuracy >= 60) return '#ffc107'; // Yellow
  return '#dc3545'; // Red
}

// Helper function to format date
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

// Generate HTML table rows for all models
models.forEach((model, index) => {
  const rank = index + 1;
  let rankStyle = '';
  if (rank === 1) rankStyle = 'font-weight: bold; color: #ffd700;'; // Gold
  else if (rank === 2) rankStyle = 'font-weight: bold; color: #c0c0c0;'; // Silver
  else if (rank === 3) rankStyle = 'font-weight: bold; color: #cd7f32;'; // Bronze

  console.log(`                  <tr>
                    <td${rankStyle ? ` style="${rankStyle}"` : ''}>${rank}</td>
                    <td><strong>${model.name}</strong></td>
                    <td>${model.type}</td>
                    <td>${model.source}</td>
                    <td>${formatDate(model.date)}</td>
                    <td style="font-weight: bold; color: ${getAccuracyClass(model.overallAcc)};">${model.overallAcc.toFixed(1)}%</td>
                    <td style="color: ${getAccuracyClass(model.isCorrect)};">${model.isCorrect.toFixed(1)}%</td>
                    <td style="color: ${getAccuracyClass(model.toyCase)};">${model.toyCase.toFixed(1)}%</td>
                    <td style="color: ${getAccuracyClass(model.logicalGap)};">${model.logicalGap.toFixed(1)}%</td>
                    <td style="color: ${getAccuracyClass(model.approx)};">${model.approx.toFixed(1)}%</td>
                    <td style="color: ${getAccuracyClass(model.calc)};">${model.calc.toFixed(1)}%</td>
                  </tr>`);
}); 