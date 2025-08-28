class DynamicLeaderboard {
    constructor() {
        this.dataUrl = './static/data/all_leaderboard_results.json';
        this.tableBody = null;
        this.tableHead = null;
        this.models = [];
        this.sortColumn = 'overallAcc';
        this.sortDirection = 'desc';
        this.wasRankClicked = false;
        // Filter state
        this.sizeFilters = new Set(['<1B','1-7B','7-13B','13-30B','30-70B','>70B','UNK']);
        this.typeFilter = 'all';
        this.sourceFilter = 'all';
        this.modelSearch = '';
        // New filters for date range and step accuracies
        this.dateStart = null;   // JavaScript Date object or null
        this.dateEnd = null;     // JavaScript Date object or null
        // Minimum thresholds (0-100) for step accuracies; null means no threshold
        this.stepAccMin = {
            toyCase: null,       // Step Acc (NTC)
            logicalGap: null,    // Step Acc (NLG)
            approx: null,        // Step Acc (NAE)
            calc: null           // Step Acc (NCE)
        };
        // Column visibility (hidden columns set)
        this.hiddenCols = new Set();
    }

    async loadData() {
        try {
            console.log('Attempting to load data from:', this.dataUrl);
            const response = await fetch(this.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Data loaded successfully:', data.length, 'models');
            return data;
        } catch (error) {
            console.error('Error loading leaderboard data:', error);
            return null;
        }
    }

    processData(data) {
        const models = [];
        
        // The data is an array of model objects
        data.forEach((modelData, index) => {
            const model = {
                name: modelData.Model || `Model ${index + 1}`,
                size: modelData.Size || 'UNK',
                type: modelData.Type || 'N/A',
                source: modelData["Model Source"] || 'N/A',
                sourceUrl: modelData.Source || null,
                date: modelData.Date || 'N/A',
                maxTokens: modelData["Max Tokens"] || 'N/A',
                reasoningEffort: modelData["Reasoning effort"] || null,
                overallAcc: modelData.all_true?.total?.accuracy || 0,
                isCorrect: modelData.is_correct?.total?.accuracy || 0,
                toyCase: modelData.toy_case_judge?.total?.accuracy || 0,
                logicalGap: modelData.logical_gap_judge?.total?.accuracy || 0,
                approx: modelData.approx_judge?.total?.accuracy || 0,
                calc: modelData.calc_judge?.total?.accuracy || 0
            };
            
            // Format the display name with reasoning effort and max tokens
            model.displayName = this.formatModelName(model);
            
            models.push(model);
        });

        console.log('Processed models:', models.slice(0, 3)); // Log first 3 models for debugging
        
        // Sort by overall accuracy (descending) to establish original ranking
        models.sort((a, b) => {
            if (b.overallAcc !== a.overallAcc) return b.overallAcc - a.overallAcc;
            return b.isCorrect - a.isCorrect;
        });
        
        // Assign original rank based on overall accuracy
        models.forEach((model, index) => {
            model.originalRank = index + 1;
            // Do NOT append static medal icons to displayName here!
        });
        
        return models;
    }

    formatModelName(model) {
        let displayName = model.name;
        let parenthesisContent = [];
        
        // Add reasoning effort for reasoning models
        if (model.type && model.type.toLowerCase().includes('reasoning') && 
            model.reasoningEffort && model.reasoningEffort !== 'not applicable') {
            parenthesisContent.push(model.reasoningEffort);
        }
        
        // Add max tokens if not 10K or if it's a reasoning model
        if (model.maxTokens && model.maxTokens !== 'N/A') {
            const maxTokensValue = model.maxTokens.toString();
            const isReasoningModel = model.type && model.type.toLowerCase().includes('reasoning');
            
            // Show max tokens if it's not 10K, or if it's a reasoning model (always show for reasoning models)
            if (maxTokensValue !== '10000' || isReasoningModel) {
                // Format tokens nicely (10000 -> 10K, 30000 -> 30K, etc.)
                const formattedTokens = this.formatTokens(maxTokensValue);
                parenthesisContent.push(formattedTokens);
            }
        }
        
        // Add parenthesis content if any
        if (parenthesisContent.length > 0) {
            displayName += ` (${parenthesisContent.join(', ')})`;
        }
        
        // Add medal icons for top 3 models (will be set later when originalRank is available)
        return displayName;
    }

    addMedalToDisplayName(model) {
        let displayName = model.displayName;
        
        // Add medal icons for top 3 models
        if (model.originalRank === 1) {
            displayName += ' 🥇';
        } else if (model.originalRank === 2) {
            displayName += ' 🥈';
        } else if (model.originalRank === 3) {
            displayName += ' 🥉';
        }
        
        return displayName;
    }

    formatTokens(tokens) {
        const numTokens = parseInt(tokens);
        if (isNaN(numTokens)) return tokens;
        
        if (numTokens >= 1000 && numTokens % 1000 === 0) {
            return `${numTokens / 1000}K`;
        }
        return tokens;
    }

    getAccuracyColor(accuracy) {
        if (accuracy >= 80) return '#28a745'; // Green
        if (accuracy >= 60) return '#ffc107'; // Yellow
        return '#dc3545'; // Red
    }

    getAccuracyBackgroundColor(accuracy) {
        // Convert accuracy (0-100) to a color from blue (low) to red (high)
        const normalizedValue = Math.max(0, Math.min(100, accuracy)) / 100;
        
        // Use specific RGB values: Blue (0, 123, 255) to Red (255, 0, 0)
        const startBlue = { r: 0, g: 123, b: 255 };
        const endRed = { r: 255, g: 0, b: 0 };
        
        // Interpolate between blue and red
        const red = Math.round(startBlue.r + (endRed.r - startBlue.r) * normalizedValue);
        const green = Math.round(startBlue.g + (endRed.g - startBlue.g) * normalizedValue);
        const blue = Math.round(startBlue.b + (endRed.b - startBlue.b) * normalizedValue);
        
        // Create a lighter version for better text readability
        const lightness = 0.7; // Adjust this to make colors lighter (0.5-0.9)
        const finalRed = Math.round(red + (255 - red) * lightness);
        const finalGreen = Math.round(green + (255 - green) * lightness);
        const finalBlue = Math.round(blue + (255 - blue) * lightness);
        
        return `rgb(${finalRed}, ${finalGreen}, ${finalBlue})`;
    }

    sortModels(column) {
        // Track if rank column was clicked for indicator display
        this.wasRankClicked = (column === 'rank');
        
        // Special handling for rank column - treat it as sorting by overall accuracy
        let actualSortColumn = column;
        if (column === 'rank') {
            actualSortColumn = 'overallAcc';
        }

        // Toggle sort direction if clicking the same column
        if (this.sortColumn === actualSortColumn) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = actualSortColumn;
            this.sortDirection = actualSortColumn === 'name' || actualSortColumn === 'type' || actualSortColumn === 'source' || actualSortColumn === 'date' ? 'asc' : 'desc';
        }

        // Update the displayed sort column for indicators
        this.sortColumn = actualSortColumn;

        // Only update indicators and re-render table (do NOT sort this.models here)
        this.updateSortIndicators();
        this.renderTableBody();
    }

    updateSortIndicators() {
        // Remove existing sort indicators
        this.tableHead.querySelectorAll('.sort-indicator').forEach(el => el.remove());
        
        // Add sort indicator to current column
        const headers = this.tableHead.querySelectorAll('th');
        const columnMap = ['rank', 'name', 'size', 'type', 'source', 'date', 'overallAcc', 'isCorrect', 'toyCase', 'logicalGap', 'approx', 'calc'];
        
        // Find the column index for the indicator
        let indicatorColumnIndex = columnMap.indexOf(this.sortColumn);
        
        // If sorting by overallAcc but user clicked rank, show indicator on rank column
        if (this.sortColumn === 'overallAcc' && this.wasRankClicked) {
            indicatorColumnIndex = 0; // Rank column index
        }
        
        if (indicatorColumnIndex !== -1 && headers[indicatorColumnIndex]) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.innerHTML = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
            indicator.style.fontSize = '0.8em';
            headers[indicatorColumnIndex].appendChild(indicator);
        }
    }

    setupColumnSorting() {
        const headers = this.tableHead.querySelectorAll('th');
        const columnMap = ['rank', 'name', 'size', 'type', 'source', 'date', 'overallAcc', 'isCorrect', 'toyCase', 'logicalGap', 'approx', 'calc'];
        
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.addEventListener('click', () => {
                const column = columnMap[index];
                if (column) {
                    this.sortModels(column);
                }
            });
        });
    }

    formatDate(dateStr) {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        try {
            const date = new Date(dateStr);
            // Format as YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return dateStr;
        }
    }

    getTypeIcon(type) {
        if (typeof type !== 'string') return type;
        if (type.toLowerCase().includes('reasoning')) {
            return '🧠';
        } else if (type.toLowerCase().includes('chat')) {
            return '📝';
        } else if (type.toLowerCase().includes('tool')) {
            return '🔧';
        }
        return type; // Return original if no match
    }

    getSourceIcon(source) {
        if (typeof source !== 'string') return source;
        const processedSource = source.trim().toLowerCase();
        if (processedSource === 'proprietary') {
            return '🔒';
        } else if (processedSource === 'open-source') {
            return '🌐';
        }
        return source; // Return original if no match
    }

    getTypeTooltip(type) {
        if (typeof type !== 'string') return '';
        if (type.toLowerCase().includes('reasoning')) {
            return 'Reasoning Model';
        } else if (type.toLowerCase().includes('chat')) {
            return 'Chat Model';
        } else if (type.toLowerCase().includes('tool')) {
            return 'Tool-augmented Model';
        }
        return type;
    }

    getSourceTooltip(source) {
        if (typeof source !== 'string') return '';
        const processedSource = source.trim().toLowerCase();
        if (processedSource === 'proprietary') {
            return 'Proprietary Model';
        } else if (processedSource === 'open-source') {
            return 'Open-source Model';
        }
        return source;
    }

    createTableRow(model, currentPosition) {
        const row = document.createElement('tr');
        let rankStyle = '';
        let medal = '';
        // Apply special styling and medal for filtered ranks 1, 2, 3
        if (currentPosition === 1) {
            rankStyle = 'font-weight: bold; color: #ffd700;'; // Gold
            medal = ' 🥇';
        } else if (currentPosition === 2) {
            rankStyle = 'font-weight: bold; color: #c0c0c0;'; // Silver
            medal = ' 🥈';
        } else if (currentPosition === 3) {
            rankStyle = 'font-weight: bold; color: #cd7f32;'; // Bronze
            medal = ' 🥉';
        }

        // Helper to create a cell
        function td(content, style = '', isIcon = false, tooltip = '', isLink = false, linkUrl = '') {
            const cell = document.createElement('td');
            if (style) cell.style.cssText = style;
            
            if (isIcon && tooltip) {
                // Create a span for the icon with custom tooltip
                const span = document.createElement('span');
                span.textContent = content;
                span.className = 'tooltip-icon';
                span.setAttribute('data-tooltip', tooltip);
                span.setAttribute('title', tooltip); // Fallback for default browser tooltip
                cell.appendChild(span);
            } else if (isLink && linkUrl) {
                // Create a clickable link
                const link = document.createElement('a');
                link.textContent = content;
                link.href = linkUrl;
                link.target = '_blank';
                link.style.color = '#007bff'; // Blue color to indicate it's clickable
                link.style.textDecoration = 'none';
                link.addEventListener('mouseenter', () => {
                    link.style.textDecoration = 'underline';
                    link.style.color = '#0056b3'; // Darker blue on hover
                });
                link.addEventListener('mouseleave', () => {
                    link.style.textDecoration = 'none';
                    link.style.color = '#007bff'; // Back to original blue
                });
                cell.appendChild(link);
            } else {
                cell.textContent = content;
            }
            return cell;
        }

        // Format rank - use the passed currentPosition and add medal if top 3
        let rankDisplay = currentPosition.toString() + medal;

        row.appendChild(td(rankDisplay, rankStyle)); // Use currentPosition for rank display
        row.appendChild(td(model.displayName, '', false, '', true, model.sourceUrl));
        row.appendChild(td(model.size));
        row.appendChild(td(this.getTypeIcon(model.type), '', true, this.getTypeTooltip(model.type)));
        row.appendChild(td(this.getSourceIcon(model.source), '', true, this.getSourceTooltip(model.source)));
        row.appendChild(td(model.date));
        
        // Helper function to create partial fill style
        const getPartialFillStyle = (accuracy, isBold = false) => {
            const fillPercentage = Math.max(0, Math.min(100, accuracy));
            const fillColor = this.getAccuracyBackgroundColor(accuracy);
            const baseStyle = `
                color: #333; 
                padding: 8px; 
                background: linear-gradient(to right, 
                    ${fillColor} 0%, 
                    ${fillColor} ${fillPercentage}%, 
                    transparent ${fillPercentage}%, 
                    transparent 100%);
                ${isBold ? 'font-weight: bold;' : ''}
            `;
            return baseStyle;
        };
        
        // Accuracy columns with partial fill based on percentage
        row.appendChild(td(`${model.overallAcc.toFixed(1)}%`, getPartialFillStyle(model.overallAcc, true)));
        row.appendChild(td(`${model.isCorrect.toFixed(1)}%`, getPartialFillStyle(model.isCorrect)));
        row.appendChild(td(`${model.toyCase.toFixed(1)}%`, getPartialFillStyle(model.toyCase)));
        row.appendChild(td(`${model.logicalGap.toFixed(1)}%`, getPartialFillStyle(model.logicalGap)));
        row.appendChild(td(`${model.approx.toFixed(1)}%`, getPartialFillStyle(model.approx)));
        row.appendChild(td(`${model.calc.toFixed(1)}%`, getPartialFillStyle(model.calc)));

        return row;
    }

    showLoading() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 20px;">
                        <i class="fas fa-spinner fa-spin"></i> Loading leaderboard data...
                    </td>
                </tr>
            `;
        }
    }

    showError() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 20px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> Error loading leaderboard data
                    </td>
                </tr>
            `;
        }
    }

    async renderLeaderboard() {
        this.tableBody = document.querySelector('#leaderboard-table tbody');
        this.tableHead = document.querySelector('#leaderboard-table thead');
        
        if (!this.tableBody || !this.tableHead) {
            console.error('Leaderboard table body or head not found');
            return;
        }

        this.showLoading();

        const data = await this.loadData();
        if (!data) {
            this.showError();
            return;
        }

        this.models = this.processData(data);
        
        // Setup column sorting
        this.setupColumnSorting();
        
        // Setup filter listeners
        this.setupFilters();
        
        // Ensure default sort is by overall accuracy (descending) and update indicators
        this.sortColumn = 'overallAcc';
        this.sortDirection = 'desc';
        this.updateSortIndicators();
        this.renderTableBody();
    }

    renderTableBody() {
        // Clear the table body
        this.tableBody.innerHTML = '';

        // 1. Apply all row filters (except search)
        let rowFilteredModels = this.models.filter(model => {
            // Size filter
            const sizeCat = this.getSizeCategory(model.size);
            if (!this.sizeFilters.has(sizeCat)) return false;
            // Type filter
            if (this.typeFilter !== 'all') {
                if (!model.type || model.type.toLowerCase() !== this.typeFilter) return false;
            }
            // Source filter
            if (this.sourceFilter !== 'all') {
                const srcLower = model.source.toLowerCase();
                if (this.sourceFilter === 'proprietary' && srcLower !== 'proprietary') return false;
                if (this.sourceFilter === 'open-source' && srcLower !== 'open-source') return false;
            }
            // Date range filter
            if (this.dateStart || this.dateEnd) {
                const modelDate = (model.date && model.date !== 'N/A') ? new Date(model.date) : null;
                if (!modelDate) return false;
                if (this.dateStart && modelDate < this.dateStart) return false;
                if (this.dateEnd && modelDate > this.dateEnd) return false;
            }
            // Step accuracy minimum filters
            const stepFilters = this.stepAccMin;
            if (stepFilters.toyCase !== null && model.toyCase < stepFilters.toyCase) return false;
            if (stepFilters.logicalGap !== null && model.logicalGap < stepFilters.logicalGap) return false;
            if (stepFilters.approx !== null && model.approx < stepFilters.approx) return false;
            if (stepFilters.calc !== null && model.calc < stepFilters.calc) return false;
            return true;
        });

        // --- Assign true rank by overallAcc among filtered models ---
        const sortedByOverallAcc = [...rowFilteredModels].sort((a, b) => {
            if (b.overallAcc !== a.overallAcc) return b.overallAcc - a.overallAcc;
            return b.isCorrect - a.isCorrect;
        });
        sortedByOverallAcc.forEach((model, idx) => {
            model._trueRank = idx + 1;
        });
        // ----------------------------------------------------------

        // 2. Sort by the currently selected column / direction
        const getComparable = (model) => {
            switch (this.sortColumn) {
                case 'name':
                    return (model.name || '').toLowerCase();
                case 'size': {
                    const sizeStr = model.size || 'UNK';
                    if (!sizeStr || sizeStr.toLowerCase() === 'unk') return Infinity;
                    const axb = sizeStr.match(/([0-9]+(?:\.[0-9]+)?)\s*x\s*([0-9]+(?:\.[0-9]+)?)B/i);
                    if (axb) {
                        const a = parseFloat(axb[1]);
                        const b = parseFloat(axb[2]);
                        return isNaN(a * b) ? Infinity : a * b;
                    }
                    const num = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
                    return isNaN(num) ? Infinity : num;
                }
                case 'type':
                    return (model.type || '').toLowerCase();
                case 'source':
                    return (model.source || '').toLowerCase();
                case 'date': {
                    if (!model.date || model.date === 'N/A') return new Date(0);
                    const d = new Date(model.date);
                    return isNaN(d.getTime()) ? new Date(0) : d;
                }
                default:
                    // Numeric accuracy columns
                    return parseFloat(model[this.sortColumn]) || 0;
            }
        };

        rowFilteredModels.sort((a, b) => {
            const aVal = getComparable(a);
            const bVal = getComparable(b);

            let cmp = 0;
            if (aVal < bVal) cmp = -1;
            else if (aVal > bVal) cmp = 1;
            else if (this.sortColumn === 'overallAcc') {
                // Tie-break by isCorrect (Answer Acc) if sorting by overallAcc
                if (b.isCorrect !== a.isCorrect) return this.sortDirection === 'desc' ? b.isCorrect - a.isCorrect : a.isCorrect - b.isCorrect;
                cmp = a.originalRank - b.originalRank;
            } else {
                cmp = a.originalRank - b.originalRank; // stable tie-break
            }

            return this.sortDirection === 'desc' ? -cmp : cmp;
        });

        // Assign new ranks for the filtered and sorted set (not used for display anymore)
        rowFilteredModels.forEach((model, idx) => {
            model._filteredRank = idx + 1;
        });

        // 3. If search is active, filter the already sorted set by search
        let modelsToDisplay = rowFilteredModels;
        if (this.modelSearch && this.modelSearch.trim() !== '') {
            const searchTerm = this.modelSearch.trim().toLowerCase();
            modelsToDisplay = rowFilteredModels.filter(model =>
                (model.name && model.name.toLowerCase().includes(searchTerm))
            );
        }

        if (modelsToDisplay.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:#777;">No models match the current filters.</td></tr>`;
            this.tableBody.parentElement.style.maxHeight = '700px';
            this.tableBody.parentElement.style.overflowY = 'auto';
            return;
        }

        // 4. Render the table with the current order, but always use true rank by Overall Acc
        modelsToDisplay.forEach((model) => {
            const row = this.createTableRow(model, model._trueRank); // Pass true rank for display
            this.tableBody.appendChild(row);
        });

        this.tableBody.parentElement.style.maxHeight = '700px';
        this.tableBody.parentElement.style.overflowY = 'auto';
        this.applyColumnVisibility();
    }

    setupFilters() {
        // Size checkboxes
        document.querySelectorAll('.size-filter').forEach(cb => {
            cb.addEventListener('change', () => {
                const val = cb.getAttribute('data-size');
                if (cb.checked) this.sizeFilters.add(val);
                else this.sizeFilters.delete(val);
                this.renderTableBody();
            });
        });
        // Type radios
        document.querySelectorAll('.type-filter').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.typeFilter = radio.value; // all, reasoning, chat, tool
                    this.renderTableBody();
                }
            });
        });
        // Source radios
        document.querySelectorAll('.source-filter').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.sourceFilter = radio.value; // all, proprietary, open-source
                    this.renderTableBody();
                }
            });
        });
        // Model search input
        const searchInput = document.getElementById('model-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.modelSearch = searchInput.value.trim();
                this.renderTableBody();
            });
        }

        // Date range inputs
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');
        if (dateStartInput) {
            dateStartInput.addEventListener('change', () => {
                const val = dateStartInput.value;
                this.dateStart = val ? new Date(val) : null;
                this.renderTableBody();
            });
        }
        if (dateEndInput) {
            dateEndInput.addEventListener('change', () => {
                const val = dateEndInput.value;
                this.dateEnd = val ? new Date(val) : null;
                this.renderTableBody();
            });
        }

        // Step accuracy minimum inputs
        const ntcInput = document.getElementById('step-ntc-min');
        const nlgInput = document.getElementById('step-nlg-min');
        const naeInput = document.getElementById('step-nae-min');
        const nceInput = document.getElementById('step-nce-min');

        const handleStepInput = (key, inputEl) => {
            if (!inputEl) return;
            inputEl.addEventListener('input', () => {
                const val = parseFloat(inputEl.value);
                this.stepAccMin[key] = isNaN(val) ? null : val;
                this.renderTableBody();
            });
        };

        handleStepInput('toyCase', ntcInput);
        handleStepInput('logicalGap', nlgInput);
        handleStepInput('approx', naeInput);
        handleStepInput('calc', nceInput);

        // Column visibility toggles
        document.querySelectorAll('.col-toggle').forEach(cb => {
            const colKey = cb.getAttribute('data-col');
            if (!colKey) return;
            // Initialize based on default checked state
            if (!cb.checked) {
                this.hiddenCols.add(colKey);
            }
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    this.hiddenCols.delete(colKey);
                } else {
                    this.hiddenCols.add(colKey);
                }
                this.applyColumnVisibility();
            });
        });
    }

    getSizeCategory(sizeStr) {
        if (!sizeStr || sizeStr === 'UNK') return 'UNK';
        // Handle 'a x bB' pattern (e.g., '16 x 17B')
        const axbMatch = sizeStr.match(/([0-9]+(?:\.[0-9]+)?)\s*x\s*([0-9]+(?:\.[0-9]+)?)B/i);
        let val;
        if (axbMatch) {
            // Multiply a and b, treat as (a*b)B
            const a = parseFloat(axbMatch[1]);
            const b = parseFloat(axbMatch[2]);
            if (!isNaN(a) && !isNaN(b)) {
                val = a * b;
            } else {
                return 'UNK';
            }
        } else {
            // Extract first numeric value
            const match = sizeStr.match(/([0-9]+(\.[0-9]+)?)/);
            if (!match) return 'UNK';
            val = parseFloat(match[1]);
            if (isNaN(val)) return 'UNK';
        }
        if (val < 1) return '<1B';
        if (val < 7) return '1-7B';
        if (val < 13) return '7-13B';
        if (val < 30) return '13-30B';
        if (val < 70) return '30-70B';
        return '>70B';
    }

    getFilteredModels() {
        return this.models.filter(model => {
            // Model search filter
            if (this.modelSearch && !(model.displayName.toLowerCase().includes(this.modelSearch.toLowerCase()) || model.name.toLowerCase().includes(this.modelSearch.toLowerCase()))) {
                return false;
            }
            // Size filter
            const sizeCat = this.getSizeCategory(model.size);
            if (!this.sizeFilters.has(sizeCat)) return false;
            // Type filter
            if (this.typeFilter !== 'all') {
                if (!model.type || model.type.toLowerCase() !== this.typeFilter) return false;
            }
            // Source filter
            if (this.sourceFilter !== 'all') {
                const srcLower = model.source.toLowerCase();
                if (this.sourceFilter === 'proprietary' && srcLower !== 'proprietary') return false;
                if (this.sourceFilter === 'open-source' && srcLower !== 'open-source') return false;
            }
            // Date range filter
            if (this.dateStart || this.dateEnd) {
                const modelDate = (model.date && model.date !== 'N/A') ? new Date(model.date) : null;
                if (!modelDate) return false; // Exclude models without valid date when filter is active
                if (this.dateStart && modelDate < this.dateStart) return false;
                if (this.dateEnd && modelDate > this.dateEnd) return false;
            }
            // Step accuracy minimum filters
            const stepFilters = this.stepAccMin;
            if (stepFilters.toyCase !== null && model.toyCase < stepFilters.toyCase) return false;
            if (stepFilters.logicalGap !== null && model.logicalGap < stepFilters.logicalGap) return false;
            if (stepFilters.approx !== null && model.approx < stepFilters.approx) return false;
            if (stepFilters.calc !== null && model.calc < stepFilters.calc) return false;
            return true;
        });
    }

    // Method to refresh the leaderboard (useful when JSON file is updated)
    async refresh() {
        await this.renderLeaderboard();
    }

    // Show/hide columns based on hiddenCols set
    applyColumnVisibility() {
        const colIndexes = {
            size: 2,
            type: 3,
            source: 4,
            date: 5,
            ntc: 8,
            nlg: 9,
            nae: 10,
            nce: 11
        };

        const allRows = document.querySelectorAll('#leaderboard-table tr');
        Object.entries(colIndexes).forEach(([key, idx]) => {
            const show = !this.hiddenCols.has(key);
            allRows.forEach(row => {
                const cell = row.children[idx];
                if (cell) {
                    cell.style.display = show ? '' : 'none';
                }
            });
        });
    }
}

// Initialize the leaderboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const leaderboard = new DynamicLeaderboard();
    leaderboard.renderLeaderboard();
    
    // Make it globally accessible for manual refresh if needed
    window.leaderboard = leaderboard;
}); 