// Add this function to fetch and populate problem types
var problem_names = [];
var currProblemId = 0;
function loadProblemNames() {
    fetch('/problems')
        .then(response => response.json())
        .then(problems => {
            const select = document.getElementById('problems-select');
            select.innerHTML = ''; // Clear existing options
            
            // Sort the problems numerically
            problems.sort((a, b) => a - b);
            problem_names = problems;
            console.log(problems);

            problems.forEach(problemId => {
                const option = document.createElement('option');
                option.value = problemId;
                option.textContent = `${problemId}`;
                select.appendChild(option);
            });

            // If there are problems, select the first one by default
            if (problems.length > 0) {
                currProblemId = 0;
                loadProblem(problem_names[currProblemId]);
            }
        })
        .catch(error => {
            console.error('Error loading problems:', error);
            alert('Error loading problems');
        });
}

// problems-select
document.getElementById('problems-select').addEventListener('change', function() {
    loadProblem(document.getElementById('problems-select').value);
});

// Call this when the page loads
document.addEventListener('DOMContentLoaded', loadProblemNames);

// Only keep problem, answer, solution
var sections = ["problem", "answer", "solution"];
var currData = {};
var currProblemName = "";

// Add this function to generate the latex sections
function createLatexSection(title, content) {
    const displayTitles = {
        "problem": "Problem",
        "answer": "Answer",
        "solution": "Solution"
    };

    const container = document.getElementById('dynamicLatexSections');
    const sectionHtml = `
        <div class="latex-section" style="grid-column: 1 / -1;">
            <h3>${displayTitles[title] || title}</h3>
            <div style="display: flex; gap: 20px;">
                <textarea class="textbox latex-input editor" id="latexInput${title}" 
                    style="min-height: 0; height: auto; overflow-y: hidden; flex: 1;"
                    placeholder="Type text and LaTeX here... Use $$ to wrap LaTeX expressions">${content}</textarea>
                <div class="latex-render" id="latexOutput${title}" 
                    style="flex: 1; min-height: 0; border: 1px solid #ccc; padding: 8px;"></div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', sectionHtml);
    
    // Add event listeners for the new textarea
    const textarea = document.getElementById(`latexInput${title}`);
    const outputDiv = document.getElementById(`latexOutput${title}`);
    
    textarea.addEventListener('input', function() {
        // Auto-resize the textarea
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        // Match output div height
        outputDiv.style.height = this.style.height;
        // Process LaTeX
        processLatex(`latexInput${title}`, `latexOutput${title}`);
    });
    
    // Initial height adjustment
    textarea.style.height = (textarea.scrollHeight) + 'px';
    outputDiv.style.height = textarea.style.height;
    
    // Add event listener for the new textarea
    document.getElementById(`latexInput${title}`).addEventListener('input', function() {
        processLatex(`latexInput${title}`, `latexOutput${title}`);
    });
}

function createAnswerSection(answer) {
    const container = document.getElementById('dynamicLatexSections');
    const sectionHtml = `
    <div id="relationAnswerEditor" class="editor" style="display: flex; flex-direction: column; gap: 10px;">
        <h3>Answer</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <label><input type="radio" class="relation-radio" name="relation" value="(A) $\\leq$"> (A) ≤</label>
            <label><input type="radio" class="relation-radio" name="relation" value="(B) $\\geq$"> (B) ≥</label>
            <label><input type="radio" class="relation-radio" name="relation" value="(C) $=$"> (C) =</label>
            <label><input type="radio" class="relation-radio" name="relation" value="(D) $<$"> (D) &lt;</label>
            <label><input type="radio" class="relation-radio" name="relation" value="(E) $>$"> (E) &gt;</label>
            <label><input type="radio" class="relation-radio" name="relation" value="(F) None of the above"> (F) None of the above</label>
        </div>
    </div>
    `;
    container.insertAdjacentHTML('beforeend', sectionHtml);

    // select the input with the value of the answer
    for (let radio of document.querySelectorAll('.relation-radio')) {
        if (radio.value == answer)
            radio.checked = true;
    }
}


function processLatex(inputId, outputId) {
    var input = document.getElementById(inputId).value;
    
    // Handle display math ($$...$$) first
    var output = input.replace(/\$\$\n?(.*?)\n?\$\$/g, function(match, latex) {
        // Use \[ \] for display math mode - creates centered, larger equations
        return `<div style="text-align: center; margin: 1em 0;">\\[${latex}\\]</div>`;
    });
    
    // Then handle inline math ($...$)
    output = output.replace(/\$(.*?)\$/g, function(match, latex) {
        // Use \( \) for inline math mode
        return `\\(${latex}\\)`;
    });
    
    // Handle line breaks
    output = output.replace(/\n/g, '<br>');
    
    // Add some spacing between paragraphs
    output = output.replace(/<br><br>/g, '</p><p style="margin: 1em 0;">');
    
    document.getElementById(outputId).innerHTML = output;
    
    // Re-render the LaTeX with custom configuration
    MathJax.typesetPromise([document.getElementById(outputId)]).then(() => {
        // Optional: Adjust the size of all math elements
        const mathElements = document.getElementById(outputId).getElementsByClassName('MathJax');
        for (let elem of mathElements) {
            elem.style.fontSize = '1.1em'; // Slightly larger font size
        }
    });
}

// Update the theme toggle code
document.getElementById('toggleTheme').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
});

// // Update this part of the toggle button functionality
// document.getElementById('togglePanel').addEventListener('click', function() {
//     const rightPanel = document.querySelector('.right-panel');
//     const leftPanel = document.querySelector('.left-panel');
//     const container = document.querySelector('.container');
    
//     rightPanel.classList.toggle('collapsed');
    
//     if (rightPanel.classList.contains('collapsed')) {
//         // container.style.justifyContent = 'flex-start';
//         leftPanel.style.flexGrow = '1';
//         rightPanel.style.flexGrow = '0';
//     } else {
//         // container.style.justifyContent = 'space-between';
//         leftPanel.style.flexGrow = '1';
//         rightPanel.style.flexGrow = '0';
//     }
// });

function saveCurrentProblem() {
    // iterate through all editor class elements and get the values
    for (let editor of document.querySelectorAll('.editor')) {
        if (editor.id == "relationAnswerEditor") {
            let ans = "";
            for (let radio of document.querySelectorAll('.relation-radio')) {
                if (radio.checked) {
                    ans = radio.value;
                    break;
                }
            }
            currData["Answer"] = ans;
        } else {
            currData[editor.id.replace('latexInput', '')] = editor.value;
        }
    }

    // save the comments
    const selectedTags = Array.from(document.querySelectorAll('#commentTags input[type="checkbox"]:checked'))
                            .map(checkbox => checkbox.value);
    currData["comments"] = {
        tags: selectedTags,
        text: document.getElementById('commentText').value
    };
    currData["Filename"] = currProblemName;

    return fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(currData),
    })
    .then(response => response.json())
    .then(result => {
        console.log('Save result:', result);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error saving data');
    });
}

function loadProblem(problemName) {
    fetch(`/problem/${problemName.replace('/', '&')}`)
        .then(response => response.json())
        .then(data => {
            currData = data;
            currProblemName = problemName;
            currProblemId = problem_names.indexOf(problemName);

            console.log(data);
            // reset latex sections
            document.getElementById('dynamicLatexSections').innerHTML = '';

            let latex_sections = sections;
            if (data.Type == "relation")
                latex_sections = sections.filter(sec => sec !== "Answer");

            for (let sec of sections) {
                let sec_data = '';
                if (sec === 'solution') {
                    // Handle multiple solutions
                    if (Array.isArray(data.solution)) {
                        sec_data = data.solution.map((sol, index) => 
                            `[Solution ${index + 1}]\n${sol}`
                        ).join('\n\n');
                    } else {
                        sec_data = data.solution || '';
                    }
                } else {
                    sec_data = data[sec] || '';
                }

                if (latex_sections.includes(sec))
                    createLatexSection(sec, sec_data);
                if (sec == "Answer" && data.Type == "relation") 
                    createAnswerSection(sec_data);
            }

            // render latex
            let latex_inputs = document.querySelectorAll('.latex-input');
            for (let latex_input of latex_inputs) {
                processLatex(latex_input.id, latex_input.id.replace('latexInput', 'latexOutput'));
            }

            // Update comment tags and text
            if (data.comments) {
                // Clear existing checkboxes
                document.querySelectorAll('#commentTags input[type="checkbox"]').forEach(cb => {
                    cb.checked = data.comments.tags.includes(cb.value);
                });
                
                // Update comment text
                document.getElementById('commentText').value = data.comments.text || '';
            }
            
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading problem');
        });
}

// next problem
document.getElementById('nextNavButton').addEventListener('click', function() {
    console.log("next button clicked");
    currProblemId = (currProblemId + 1) % problem_names.length;
    const select = document.getElementById('problems-select');
    select.value = problem_names[currProblemId];
    loadProblem(problem_names[currProblemId]);
});

// prev problem
document.getElementById('prevNavButton').addEventListener('click', function() {
    console.log("prev button clicked");
    currProblemId = (currProblemId - 1 + problem_names.length) % problem_names.length;
    const select = document.getElementById('problems-select');
    select.value = problem_names[currProblemId];
    loadProblem(problem_names[currProblemId]);
});

// save current problem
document.getElementById('saveButton').addEventListener('click', function() {
    console.log("save button clicked");
    saveCurrentProblem();
});

// save and next problem
document.getElementById('nextButton').addEventListener('click', function() {
    console.log("save and next button clicked");
    saveCurrentProblem();
    currProblemId = (currProblemId + 1) % problem_names.length;
    const select = document.getElementById('problems-select');
    select.value = problem_names[currProblemId];
    loadProblem(problem_names[currProblemId]);
});

