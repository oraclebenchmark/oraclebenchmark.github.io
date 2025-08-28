class LeaderboardManager {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentSort = { column: 'overall_accuracy', direction: 'desc' };
        this.filters = {
            search: '',
            size: 'all',
            type: 'all',
            source: 'all'
        };
        
        this.judgeColumns = [
            { key: 'is_correct', name: 'Is Correct' },
            { key: 'toy_case_judge', name: 'Toy Case' },
            { key: 'logical_gap_judge', name: 'Logical Gap' },
            { key: 'approx_judge', name: 'Approx' },
            { key: 'calc_judge', name: 'Calc' }
        ];
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.renderTable();
        } catch (error) {
            console.error('Failed to initialize leaderboard:', error);
            this.showError('Failed to load leaderboard data');
        }
    }

    async loadData() {
        try {
            const response = await fetch('IneqMath_Judge_Private/data/leaderboard/all_leaderboard_results.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const rawData = await response.json();
            this.data = this.processData(rawData);
            this.filteredData = [...this.data];
            this.populateFilters();
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    processData(rawData) {
        return rawData.map((entry, index) => {
            const judges = entry.judges || {};
            const model = entry.model || {};
            
            // Calculate overall accuracy as average of all judge accuracies
            const accuracies = this.judgeColumns.map(judge => 
                judges[judge.key]?.accuracy || 0
            );
            const overallAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
            
            return {
                rank: index + 1,
                model_name: model.name || 'Unknown',
                model_type: model.type || 'Unknown',
                model_source: model.source || 'Unknown',
                model_size: this.categorizeModelSize(model.name),
                date: model.date || 'Unknown',
                overall_accuracy: overallAccuracy,
                judges: judges,
                source_url: model.source_url || '#'
            };
        }).sort((a, b) => b.overall_accuracy - a.overall_accuracy)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    categorizeModelSize(modelName) {
        const name = modelName.toLowerCase();
        if (name.includes('7b') || name.includes('7-b')) return '7B';
        if (name.includes('13b') || name.includes('13-b')) return '13B';
        if (name.includes('70b') || name.includes('70-b')) return '70B';
        if (name.includes('8b') || name.includes('8-b')) return '8B';
        if (name.includes('14b') || name.includes('14-b')) return '14B';
        if (name.includes('32b') || name.includes('32-b')) return '32B';
        if (name.includes('72b') || name.includes('72-b')) return '72B';
        if (name.includes('405b') || name.includes('405-b')) return '405B';
        if (name.includes('small')) return 'Small';
        if (name.includes('large')) return 'Large';
        if (name.includes('base')) return 'Base';
        return 'Unknown';
    }

    populateFilters() {
        // Populate size filter
        const sizes = [...new Set(this.data.map(item => item.model_size))].sort();
        this.populateSelectOptions('size-filter', sizes);

        // Populate type filter
        const types = [...new Set(this.data.map(item => item.model_type))].sort();
        this.populateSelectOptions('type-filter', types);

        // Populate source filter
        const sources = [...new Set(this.data.map(item => item.model_source))].sort();
        this.populateSelectOptions('source-filter', sources);
    }

    populateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }

    setupEventListeners() {
        // Search input
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Filter dropdowns
        document.getElementById('size-filter').addEventListener('change', (e) => {
            this.filters.size = e.target.value;
            this.applyFilters();
        });

        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        });

        document.getElementById('source-filter').addEventListener('change', (e) => {
            this.filters.source = e.target.value;
            this.applyFilters();
        });

        // Table header sorting
        document.querySelectorAll('#leaderboard-table th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(column);
            });
        });
    }

    applyFilters() {
        this.filteredData = this.data.filter(item => {
            const matchesSearch = !this.filters.search || 
                item.model_name.toLowerCase().includes(this.filters.search);
            const matchesSize = this.filters.size === 'all' || 
                item.model_size === this.filters.size;
            const matchesType = this.filters.type === 'all' || 
                item.model_type === this.filters.type;
            const matchesSource = this.filters.source === 'all' || 
                item.model_source === this.filters.source;

            return matchesSearch && matchesSize && matchesType && matchesSource;
        });

        this.sortFilteredData();
        this.renderTable();
    }

    sortTable(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'desc';
        }

        this.sortFilteredData();
        this.updateSortIcons();
        this.renderTable();
    }

    sortFilteredData() {
        this.filteredData.sort((a, b) => {
            const column = this.currentSort.column;
            let aVal, bVal;

            if (column.includes('_accuracy') && column !== 'overall_accuracy') {
                const judgeKey = column.replace('_accuracy', '');
                aVal = a.judges[judgeKey]?.accuracy || 0;
                bVal = b.judges[judgeKey]?.accuracy || 0;
            } else {
                aVal = a[column];
                bVal = b[column];
            }

            // Handle different data types
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                if (this.currentSort.direction === 'asc') {
                    return aStr.localeCompare(bStr);
                } else {
                    return bStr.localeCompare(aStr);
                }
            }
        });
    }

    updateSortIcons() {
        // Clear all sort classes
        document.querySelectorAll('#leaderboard-table th').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add sort class to current column
        const currentHeader = document.querySelector(`#leaderboard-table th[data-column="${this.currentSort.column}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${this.currentSort.direction}`);
        }
    }

    renderTable() {
        const tbody = document.querySelector('#leaderboard-table tbody');
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading-cell">No results found</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredData.map((item, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            return `
                <tr>
                    <td class="rank-cell ${rankClass}">${rank}</td>
                    <td class="model-cell">
                        <a href="${item.source_url}" target="_blank" title="${item.model_name}">
                            ${item.model_name}
                        </a>
                    </td>
                    <td class="size-cell">${item.model_size}</td>
                    <td class="type-cell">
                        <span class="type-icon tooltip" data-tooltip="${item.model_type}">
                            ${this.getTypeIcon(item.model_type)}
                        </span>
                    </td>
                    <td class="source-cell">
                        <span class="source-icon tooltip" data-tooltip="${item.model_source}">
                            ${this.getSourceIcon(item.model_source)}
                        </span>
                    </td>
                    <td class="date-cell">${this.formatDate(item.date)}</td>
                    <td class="accuracy-cell ${this.getAccuracyClass(item.overall_accuracy)}">
                        ${(item.overall_accuracy * 100).toFixed(1)}%
                    </td>
                    ${this.judgeColumns.map(judge => {
                        const accuracy = item.judges[judge.key]?.accuracy || 0;
                        return `<td class="accuracy-cell ${this.getAccuracyClass(accuracy)}">${(accuracy * 100).toFixed(1)}%</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');
    }

    getTypeIcon(type) {
        const icons = {
            'Chat': '💬',
            'Base': '🏗️',
            'Instruct': '📝',
            'Reasoning': '🧠',
            'Code': '💻'
        };
        return icons[type] || '🤖';
    }

    getSourceIcon(source) {
        const icons = {
            'Hugging Face': '🤗',
            'OpenAI': '🔓',
            'Anthropic': '🔹',
            'Google': '🔍',
            'Meta': '📘',
            'Microsoft': '🟦',
            'Cohere': '🌊',
            'Mistral': '🌪️'
        };
        return icons[source] || '🌐';
    }

    getAccuracyClass(accuracy) {
        if (accuracy >= 0.8) return 'accuracy-high';
        if (accuracy >= 0.6) return 'accuracy-medium';
        return 'accuracy-low';
    }

    formatDate(dateStr) {
        if (!dateStr || dateStr === 'Unknown') return 'Unknown';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    showError(message) {
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = `<tr><td colspan="11" class="loading-cell" style="color: #dc3545;">${message}</td></tr>`;
    }
}

// Initialize leaderboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = new LeaderboardManager();
    leaderboard.init();
}); 