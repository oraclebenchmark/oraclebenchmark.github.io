/* <span class="ineq-blue">Ineq</span><span class="ineq-red">Math</span> Visualization Tool (static frontend version)
   Loads problem list and data from visualization_tool/data directory (served statically).
   Allows editing of problem and solution, live MathJax preview, and localStorage save.
   Updated for Problem Checker & Editor layout.
*/

(function(){
  console.log('Visualization tool script starting...');
  
  function waitForMathJax(callback) {
    if (window.MathJax && MathJax.typesetPromise) {
      callback();
    } else {
      setTimeout(() => waitForMathJax(callback), 50);
    }
  }

  // Wait for DOM to be ready and MathJax to be loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      waitForMathJax(initVisualizationTool);
    });
  } else {
    waitForMathJax(initVisualizationTool);
  }
  
  function initVisualizationTool() {
    console.log('Initializing visualization tool...');
    
    const DATA_BASE = './visualization_tool/data'; // relative path
    const INDEX_FILE = `${DATA_BASE}/index.json`;

    const selSplit = document.getElementById('split-select');
    const selId = document.getElementById('id-select');
    const btnPrev = document.getElementById('prev-problem');
    const btnNext = document.getElementById('next-problem');
    const renderProblem = document.getElementById('problem-render');
    const renderAnswer = document.getElementById('answer-render');
    const renderSolution = document.getElementById('solution-render');
    const renderTheorems = document.getElementById('theorems-render');
    const vizContent = document.getElementById('viz-content');
    const vizLoading = document.getElementById('viz-loading');

    if (!selSplit || !selId) {
      console.error('Could not find split-select or id-select elements');
      return;
    }
    
    console.log('Found all required DOM elements');

    let currentKey = null;
    let currentObj = null;
    let allProblems = {}; // Organized by split
    let currentSplit = null;
    let currentId = null;

    // Render with MathJax
    function updateRender(problemText, answerText, solutionText, theoremsHtml) {
      console.log('Updating render...');
      renderProblem.innerHTML = problemText || '';
      renderAnswer.innerHTML = answerText || '';
      renderSolution.innerHTML = solutionText || '';
      if (renderTheorems) renderTheorems.innerHTML = theoremsHtml || '';
      
      const elementsToRender = [renderProblem, renderAnswer, renderSolution];
      if (renderTheorems) elementsToRender.push(renderTheorems);
      
      if(window.MathJax && MathJax.typesetPromise){
        console.log('Typesetting with MathJax...');
        MathJax.typesetPromise(elementsToRender).catch(err => {
          console.error('MathJax error:', err);
        });
      } else {
        console.warn('MathJax not available');
      }
    }

    // Format theorems for display
    function formatTheorems(theorems) {
      if (!theorems || typeof theorems !== 'object' || Object.keys(theorems).length === 0) {
        return '<p style="color: #666; font-style: italic;">No theorems available for this problem.</p>';
      }

      let html = '';
      let theoremCount = 0;
      
      Object.keys(theorems).forEach(theoremKey => {
        const theoremData = theorems[theoremKey];
        theoremCount++;
        if (!theoremData) {
          html += `<div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #B22222; background-color: #F5F7FA;">
            <div style=\"color: #B22222; font-style: italic;\">No theorem information available.</div>
          </div>`;
          return;
        }
        const nickname = theoremData.Nickname && theoremData.Nickname.length > 0 ? theoremData.Nickname[0] : 'Unnamed Theorem';
        const category = theoremData.Theorem_Category || 'Uncategorized';
        const content = theoremData.Theorem || 'No content available';

        html += `
          <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #B22222; background-color: #F5F7FA;">
            <div style="margin-bottom: 8px;">
              <strong style="color: #B22222;">${theoremKey}: ${nickname}</strong>
            </div>
            <div style="margin-bottom: 8px; color: #666; font-size: 14px;">
              (<strong>Category:</strong> ${category})
            </div>
            <div style="margin-top: 10px;">
              ${content}
            </div>
          </div>
        `;
      });

      return html || '<p style="color: #666; font-style: italic;">No theorems available for this problem.</p>';
    }

    // Load index.json listing problem keys
    async function loadIndex(){
      console.log('Loading index from:', INDEX_FILE);
      try{
        const res = await fetch(INDEX_FILE);
        if(!res.ok) throw new Error(`index.json not found (${res.status})`);
        const keys = await res.json();
        console.log(`Loaded ${keys.length} problem keys`);
        organizeProblems(keys);
        
        // Auto-load default problem (train_0) after organizing problems
        await loadDefaultProblem();
      }catch(err){
        console.error('Unable to load index.json:', err);
        selSplit.innerHTML = '<option disabled>No index.json found</option>';
      }
    }

    function organizeProblems(keys) {
      allProblems = { dev: [], test: [], train: [] };
      
      keys.forEach(key => {
        const [split, id] = key.split('_');
        if (allProblems[split]) {
          allProblems[split].push(id);
        }
      });

      // Sort IDs numerically
      Object.keys(allProblems).forEach(split => {
        allProblems[split].sort((a, b) => parseInt(a) - parseInt(b));
      });

      console.log('Organized problems:', allProblems);
    }

    // Load default problem (train_0)
    async function loadDefaultProblem() {
      console.log('Loading default problem: train_0');
      
      // Set default values in dropdowns
      if (allProblems.train && allProblems.train.length > 0) {
        // Set split dropdown to "train"
        selSplit.value = 'train';
        
        // Populate ID dropdown for train split
        populateIdSelect('train');
        
        // Set ID dropdown to "0" if it exists
        const firstId = allProblems.train[0];
        if (firstId !== undefined) {
          selId.value = firstId;
          
          // Load the problem
          await loadProblem('train', firstId);
        }
      } else {
        console.warn('No training problems found for default load');
      }
    }

    function populateIdSelect(split) {
      console.log('Populating ID select for split:', split);
      selId.innerHTML = '<option value="" disabled selected>Select ID</option>';
      
      if (!allProblems[split]) {
        selId.disabled = true;
        return;
      }

      allProblems[split].forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        selId.appendChild(opt);
      });
      
      selId.disabled = false;
      
      // Auto-select ID 0 or the first available ID
      const firstId = allProblems[split][0];
      if (firstId !== undefined) {
        selId.value = firstId;
        console.log(`Auto-selected ID: ${firstId} for split: ${split}`);
      }
      
      console.log(`ID select populated with ${allProblems[split].length} options`);
    }

    async function loadProblem(split, id){
      if(!split || !id) return;
      
      const key = `${split}_${id}`;
      console.log('Loading problem:', key);
      
      const filePath = `${DATA_BASE}/${split}.json`;
      try{
        console.log('Fetching:', filePath);
        const res = await fetch(filePath);
        if(!res.ok) throw new Error(`file fetch failed (${res.status})`);
        const arr = await res.json();
        console.log(`Loaded ${arr.length} problems from ${split}.json`);
        const obj = arr.find(o=>String(o.data_id)===String(id));
        if(!obj) throw new Error('problem not found');
        console.log('Found problem object:', obj);
        
        currentKey = key;
        currentObj = obj;
        currentSplit = split;
        currentId = id;
        
        displayProblem(obj);
        updateNavigationButtons();
      }catch(err){
        console.error('Error loading problem:', err);
        alert('Error loading problem: '+err.message);
      }
    }

    function displayProblem(obj){
      console.log('Displaying problem:', obj);
      vizContent.style.display='block';
      vizLoading.style.display='none';
      
      const problemText = obj.problem || obj.source_proof_problem || '';
      const answerText = obj.answer || obj.answer_bound || '';
      const solutionText = obj.solution || obj.source_proof_solution || '';
      const theoremsHtml = obj.theorems ? formatTheorems(obj.theorems) : '';
      
      // Get the answer and solution sections
      const answerSection = document.querySelector('#viz-content > div:nth-child(2)'); // Answer section
      const theoremsSection = document.querySelector('#viz-content > div:nth-child(3)'); // Theorems section
      const solutionSection = document.querySelector('#viz-content > div:nth-child(4)'); // Solution section
      
      // Conditional display based on data split
      if (currentSplit === 'test') {
        // Test problems: Hide answer, solution, and theorems
        if (answerSection) answerSection.style.display = 'none';
        if (solutionSection) solutionSection.style.display = 'none';
        if (theoremsSection) theoremsSection.style.display = 'none';
        updateRender(problemText, '', '', '');
      } else if (currentSplit === 'dev') {
        // Dev problems: Show answer, hide solution and theorems
        if (answerSection) answerSection.style.display = 'block';
        if (solutionSection) solutionSection.style.display = 'none';
        if (theoremsSection) theoremsSection.style.display = 'none';
        updateRender(problemText, answerText, '', '');
      } else {
        // Train problems: Show all sections including theorems
        if (answerSection) answerSection.style.display = 'block';
        if (solutionSection) solutionSection.style.display = 'block';
        if (theoremsSection) theoremsSection.style.display = 'block';
        updateRender(problemText, answerText, solutionText, theoremsHtml);
      }
    }

    function updateNavigationButtons(){
      if (!currentSplit || !currentId) {
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
      }

      const currentIds = allProblems[currentSplit];
      const currentIndex = currentIds.indexOf(currentId);
      
      if (btnPrev) btnPrev.disabled = currentIndex <= 0;
      if (btnNext) btnNext.disabled = currentIndex >= currentIds.length - 1;
    }

    function navigateProblem(direction){
      if (!currentSplit || !currentId) return;
      
      const currentIds = allProblems[currentSplit];
      const currentIndex = currentIds.indexOf(currentId);
      let newIndex = currentIndex + direction;
      
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= currentIds.length) newIndex = currentIds.length - 1;
      
      const newId = currentIds[newIndex];
      selId.value = newId;
      loadProblem(currentSplit, newId);
    }

    // Event listeners
    selSplit?.addEventListener('change', ()=>{
      const selectedSplit = selSplit.value;
      if (selectedSplit) {
        populateIdSelect(selectedSplit);
        
        // Auto-load the first problem after populating IDs
        const firstId = allProblems[selectedSplit] && allProblems[selectedSplit][0];
        if (firstId !== undefined) {
          loadProblem(selectedSplit, firstId);
        } else {
          // Clear the current problem display if no problems available
          vizContent.style.display = 'none';
          vizLoading.style.display = 'block';
        }
      }
    });

    selId?.addEventListener('change', ()=>{
      const selectedSplit = selSplit.value;
      const selectedId = selId.value;
      if (selectedSplit && selectedId) {
        loadProblem(selectedSplit, selectedId);
      }
    });

    btnPrev?.addEventListener('click', ()=>{
      navigateProblem(-1);
    });

    btnNext?.addEventListener('click', ()=>{
      navigateProblem(1);
    });

    // Initialize
    console.log('Starting initialization...');
    loadIndex();
  }
})(); 