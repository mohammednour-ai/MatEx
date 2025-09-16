// Industrial Dashboard JavaScript
// Handles all interactive functionality including theme switching, charts, modals, and real-time updates

class IndustrialDashboard {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.initializeCharts();
        this.startRealTimeUpdates();
    }

    init() {
        // Initialize theme
        this.currentTheme = localStorage.getItem('dashboard-theme') || 'light';
        this.applyTheme(this.currentTheme);
        
        // Initialize sidebar state
        this.sidebarCollapsed = window.innerWidth <= 1024;
        this.updateSidebarState();
        
        // Initialize notification state
        this.notificationDropdownOpen = false;
        
        // Initialize modal state
        this.modalOpen = false;
        
        // Sample data for real-time updates
        this.kpiData = {
            production: { value: 2847, trend: 12.5, history: [] },
            efficiency: { value: 94.2, trend: 2.1, history: [] },
            energy: { value: 1234, trend: -5.3, history: [] },
            safety: { value: 98.7, trend: 0.8, history: [] }
        };
        
        // Generate initial history data
        this.generateInitialData();
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Notifications dropdown
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationsBtn && notificationDropdown) {
            notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationDropdown();
            });
        }

        // Modal functionality
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');
        if (modalOverlay && modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Table row clicks to open modal
        const tableRows = document.querySelectorAll('.data-table tbody tr');
        tableRows.forEach(row => {
            row.addEventListener('click', () => this.openModal());
        });

        // Search functionality
        const tableSearch = document.getElementById('tableSearch');
        if (tableSearch) {
            tableSearch.addEventListener('input', (e) => this.filterTable(e.target.value));
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (this.notificationDropdownOpen && !e.target.closest('.notifications')) {
                this.closeNotificationDropdown();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(link);
            });
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            this.updateSidebarState();
        }
    }

    updateSidebarState() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('dashboard-theme', this.currentTheme);
    }

    applyTheme(theme) {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');
        
        if (theme === 'dark') {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
        
        // Update charts with new theme
        if (this.charts) {
            this.updateChartsTheme();
        }
    }

    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            this.notificationDropdownOpen = !this.notificationDropdownOpen;
            if (this.notificationDropdownOpen) {
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        }
    }

    closeNotificationDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            this.notificationDropdownOpen = false;
            dropdown.classList.remove('show');
        }
    }

    openModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            this.modalOpen = true;
            modalOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            this.modalOpen = false;
            modalOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    filterTable(searchTerm) {
        const table = document.getElementById('productionTable');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    handleNavigation(link) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        link.closest('.nav-item').classList.add('active');
        
        // Update breadcrumbs
        const breadcrumbs = document.querySelector('.breadcrumbs');
        if (breadcrumbs) {
            const linkText = link.querySelector('span').textContent;
            breadcrumbs.innerHTML = `
                <span class="breadcrumb-item">Dashboard</span>
                <i class="fas fa-chevron-right"></i>
                <span class="breadcrumb-item active">${linkText}</span>
            `;
        }
    }

    handleKeyboardNavigation(e) {
        // ESC key closes modal and dropdowns
        if (e.key === 'Escape') {
            if (this.modalOpen) {
                this.closeModal();
            }
            if (this.notificationDropdownOpen) {
                this.closeNotificationDropdown();
            }
        }
        
        // Ctrl/Cmd + K for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    handleResize() {
        // Auto-collapse sidebar on mobile
        if (window.innerWidth <= 1024 && !this.sidebarCollapsed) {
            this.sidebarCollapsed = true;
            this.updateSidebarState();
        }
        
        // Resize charts
        if (this.charts) {
            Object.values(this.charts).forEach(chart => {
                chart.resize();
            });
        }
    }

    initializeCharts() {
        this.charts = {};
        
        // Production Trends Chart
        this.initProductionChart();
        
        // Equipment Status Chart
        this.initEquipmentChart();
        
        // Initialize sparklines
        this.initSparklines();
    }

    initProductionChart() {
        const ctx = document.getElementById('productionChart');
        if (!ctx) return;

        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f7fafc' : '#2d3748';
        const gridColor = isDark ? '#4a5568' : '#e2e8f0';

        this.charts.production = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Production Output',
                    data: [2100, 2300, 2500, 2700, 2600, 2847],
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3182ce',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Target',
                    data: [2200, 2400, 2400, 2600, 2600, 2800],
                    borderColor: '#38a169',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#2d3748' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return value.toLocaleString() + ' units';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    initEquipmentChart() {
        const ctx = document.getElementById('equipmentChart');
        if (!ctx) return;

        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f7fafc' : '#2d3748';

        this.charts.equipment = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Running', 'Maintenance', 'Offline', 'Standby'],
                datasets: [{
                    data: [65, 15, 10, 10],
                    backgroundColor: [
                        '#38a169',
                        '#d69e2e',
                        '#e53e3e',
                        '#718096'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 15,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const dataset = data.datasets[0];
                                        const value = dataset.data[i];
                                        const total = dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: dataset.backgroundColor[i],
                                            strokeStyle: dataset.backgroundColor[i],
                                            lineWidth: 0,
                                            pointStyle: 'circle',
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#2d3748' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#4a5568' : '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${context.label}: ${percentage}% (${context.parsed} units)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    initSparklines() {
        // Simple sparkline implementation using canvas
        const sparklines = document.querySelectorAll('.kpi-sparkline');
        sparklines.forEach((sparkline, index) => {
            this.createSparkline(sparkline, this.generateSparklineData(), index);
        });
    }

    createSparkline(container, data, index) {
        const canvas = document.createElement('canvas');
        canvas.width = container.offsetWidth * 2; // For retina displays
        canvas.height = container.offsetHeight * 2;
        canvas.style.width = container.offsetWidth + 'px';
        canvas.style.height = container.offsetHeight + 'px';
        
        container.innerHTML = '';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2); // For retina displays
        
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const padding = 4;
        
        // Calculate points
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        const points = data.map((value, i) => ({
            x: padding + (i / (data.length - 1)) * (width - padding * 2),
            y: padding + ((max - value) / range) * (height - padding * 2)
        }));
        
        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = index % 2 === 0 ? '#3182ce' : '#38a169';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        
        ctx.stroke();
        
        // Draw area fill
        ctx.beginPath();
        ctx.fillStyle = index % 2 === 0 ? 'rgba(49, 130, 206, 0.1)' : 'rgba(56, 161, 105, 0.1)';
        
        points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, height - padding);
                ctx.lineTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        
        ctx.lineTo(points[points.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fill();
    }

    generateSparklineData() {
        const data = [];
        let value = 50 + Math.random() * 50;
        
        for (let i = 0; i < 20; i++) {
            value += (Math.random() - 0.5) * 10;
            value = Math.max(10, Math.min(100, value));
            data.push(value);
        }
        
        return data;
    }

    generateInitialData() {
        // Generate 24 hours of historical data for KPIs
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            
            Object.keys(this.kpiData).forEach(key => {
                const baseValue = this.kpiData[key].value;
                const variation = (Math.random() - 0.5) * 0.1 * baseValue;
                this.kpiData[key].history.push({
                    timestamp,
                    value: baseValue + variation
                });
            });
        }
    }

    updateChartsTheme() {
        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f7fafc' : '#2d3748';
        const gridColor = isDark ? '#4a5568' : '#e2e8f0';

        Object.values(this.charts).forEach(chart => {
            // Update text colors
            if (chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            
            if (chart.options.plugins.tooltip) {
                chart.options.plugins.tooltip.backgroundColor = isDark ? '#2d3748' : '#ffffff';
                chart.options.plugins.tooltip.titleColor = textColor;
                chart.options.plugins.tooltip.bodyColor = textColor;
                chart.options.plugins.tooltip.borderColor = gridColor;
            }
            
            // Update scales colors
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.grid) {
                        scale.grid.color = gridColor;
                    }
                    if (scale.ticks) {
                        scale.ticks.color = textColor;
                    }
                });
            }
            
            chart.update('none');
        });
    }

    startRealTimeUpdates() {
        // Update KPI values every 30 seconds
        setInterval(() => {
            this.updateKPIValues();
        }, 30000);
        
        // Update charts every 5 minutes
        setInterval(() => {
            this.updateChartData();
        }, 300000);
        
        // Update timestamps every minute
        setInterval(() => {
            this.updateTimestamps();
        }, 60000);
    }

    updateKPIValues() {
        Object.keys(this.kpiData).forEach(key => {
            const kpi = this.kpiData[key];
            const variation = (Math.random() - 0.5) * 0.05 * kpi.value;
            const newValue = Math.max(0, kpi.value + variation);
            
            // Update the displayed value with animation
            this.animateKPIValue(key, kpi.value, newValue);
            
            kpi.value = newValue;
            
            // Add to history
            kpi.history.push({
                timestamp: new Date(),
                value: newValue
            });
            
            // Keep only last 24 hours
            if (kpi.history.length > 24) {
                kpi.history.shift();
            }
        });
    }

    animateKPIValue(key, fromValue, toValue) {
        const element = document.querySelector(`[data-kpi="${key}"] .kpi-number`);
        if (!element) return;
        
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = fromValue + (toValue - fromValue) * this.easeOutQuart(progress);
            
            if (key === 'production') {
                element.textContent = Math.round(currentValue).toLocaleString();
            } else {
                element.textContent = currentValue.toFixed(1);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    updateChartData() {
        if (this.charts.production) {
            // Add new data point to production chart
            const chart = this.charts.production;
            const newValue = 2500 + Math.random() * 500;
            
            chart.data.labels.push(this.getTimeLabel());
            chart.data.datasets[0].data.push(newValue);
            
            // Keep only last 6 data points
            if (chart.data.labels.length > 6) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
            
            chart.update('active');
        }
    }

    getTimeLabel() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    updateTimestamps() {
        // Update "time ago" displays
        const timeElements = document.querySelectorAll('.alert-time, .notification-time');
        timeElements.forEach(element => {
            // This would normally calculate actual time differences
            // For demo purposes, we'll just update some of them
            if (Math.random() > 0.7) {
                const currentText = element.textContent;
                if (currentText.includes('minutes')) {
                    const minutes = parseInt(currentText) + 1;
                    element.textContent = `${minutes} minutes ago`;
                } else if (currentText.includes('hour')) {
                    element.textContent = currentText.replace(/(\d+)/, (match, p1) => parseInt(p1) + 1);
                }
            }
        });
    }

    // Utility method to add loading states
    showLoading(element) {
        element.classList.add('loading');
    }

    hideLoading(element) {
        element.classList.remove('loading');
    }

    // Method to simulate data fetching
    async fetchData(endpoint) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // Return mock data based on endpoint
        switch (endpoint) {
            case 'kpi':
                return this.kpiData;
            case 'alerts':
                return this.generateMockAlerts();
            case 'production':
                return this.generateMockProductionData();
            default:
                return {};
        }
    }

    generateMockAlerts() {
        return [
            {
                id: 1,
                type: 'high',
                title: 'Temperature Warning',
                message: 'Furnace 2 temperature exceeding threshold',
                timestamp: new Date(Date.now() - 2 * 60 * 1000)
            },
            {
                id: 2,
                type: 'medium',
                title: 'Maintenance Scheduled',
                message: 'Routine maintenance for Line A tomorrow',
                timestamp: new Date(Date.now() - 60 * 60 * 1000)
            }
        ];
    }

    generateMockProductionData() {
        return {
            batches: [
                {
                    id: 'B2847',
                    product: 'Steel Pipes',
                    quantity: 250,
                    status: 'completed',
                    quality: 98.5,
                    duration: '2h 15m'
                }
            ]
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new IndustrialDashboard();
});

// Add data attributes to KPI cards for easier targeting
document.addEventListener('DOMContentLoaded', () => {
    const kpiCards = document.querySelectorAll('.kpi-card');
    const kpiKeys = ['production', 'efficiency', 'energy', 'safety'];
    
    kpiCards.forEach((card, index) => {
        if (kpiKeys[index]) {
            card.setAttribute('data-kpi', kpiKeys[index]);
        }
    });
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndustrialDashboard;
}
