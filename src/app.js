        // Preset configurations
        const PRESETS = [
            {
                id: 'playwright',
                name: 'Playwright MCP',
                description: '瀏覽器自動化工具，可用於網頁測試和互動',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['@playwright/mcp@latest', '--allowed-hosts', '*'],
                    tools: ['*']
                }
            },
            {
                id: 'brave-search',
                name: 'Brave Search MCP',
                description: '網路搜尋功能，使用 Brave Search API',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-brave-search'],
                    env: {
                        BRAVE_API_KEY: '<YOUR_API_KEY>'
                    },
                    tools: ['*']
                }
            },
            {
                id: 'puppeteer',
                name: 'Puppeteer MCP',
                description: '另一個瀏覽器自動化工具，基於 Chrome',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
                    tools: ['*']
                }
            },
            {
                id: 'sqlite',
                name: 'SQLite MCP',
                description: 'SQLite 資料庫操作',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/database.db'],
                    tools: ['*']
                }
            },
            {
                id: 'sequential-thinking',
                name: 'Sequential Thinking MCP',
                description: '增強推理能力，支援複雜思考過程',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
                    tools: ['*']
                }
            },
            {
                id: 'memory',
                name: 'Memory MCP',
                description: '持久化記憶，跨對話保存資訊',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory'],
                    tools: ['*']
                }
            }
        ];

        // State management
        let selectedPresets = new Set();
        let customConfigs = [];
        let presetOverrides = {}; // Store preset parameter overrides
        let editingCustomId = null;
        let editingPresetId = null;

        // HTML escape function to prevent XSS
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Initialize
        function init() {
            loadState();
            renderPresets();
            renderCustomConfigs();
            updateJsonOutput();
        }

        // Load state from localStorage
        function loadState() {
            const saved = localStorage.getItem('mcpConfig');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    selectedPresets = new Set(data.selectedPresets || []);
                    customConfigs = data.customConfigs || [];
                    presetOverrides = data.presetOverrides || {};
                } catch (e) {
                    console.error('Failed to load saved state:', e);
                }
            }
        }

        // Save state to localStorage
        function saveState() {
            const data = {
                selectedPresets: Array.from(selectedPresets),
                customConfigs: customConfigs,
                presetOverrides: presetOverrides
            };
            localStorage.setItem('mcpConfig', JSON.stringify(data));
        }

        // Render preset list
        function renderPresets() {
            const container = document.getElementById('presetList');
            container.innerHTML = PRESETS.map(preset => `
                <div class="preset-item ${selectedPresets.has(preset.id) ? 'selected' : ''}" id="preset-${preset.id}">
                    <div class="preset-header">
                        <input type="checkbox" ${selectedPresets.has(preset.id) ? 'checked' : ''} onclick="event.stopPropagation(); togglePreset('${preset.id}')">
                        <span class="preset-name" onclick="togglePreset('${preset.id}')">${preset.name}</span>
                        <div class="preset-actions">
                            <button class="small secondary" onclick="event.stopPropagation(); editPreset('${preset.id}')">⚙️ 設定</button>
                        </div>
                    </div>
                    <div class="preset-description">${preset.description}</div>
                </div>
            `).join('');
        }

        // Toggle preset selection
        function togglePreset(id) {
            if (selectedPresets.has(id)) {
                selectedPresets.delete(id);
            } else {
                selectedPresets.add(id);
            }
            saveState();
            renderPresets();
            updateJsonOutput();
        }

        // Render custom configs
        function renderCustomConfigs() {
            const container = document.getElementById('customList');
            if (customConfigs.length === 0) {
                container.innerHTML = '<div class="empty-state">尚無自訂設定</div>';
                return;
            }

            container.innerHTML = customConfigs.map((config, index) => `
                <div class="custom-item">
                    <div class="custom-item-info">
                        <div class="custom-item-name">${escapeHtml(config.name)}</div>
                        ${config.description ? `<div style="font-size: 0.9em; color: #666;">${escapeHtml(config.description)}</div>` : ''}
                    </div>
                    <div class="custom-item-actions">
                        <button class="small secondary" onclick="editCustom(${index})">編輯</button>
                        <button class="small danger" onclick="deleteCustom(${index})">刪除</button>
                    </div>
                </div>
            `).join('');
        }

        // Update JSON output
        function updateJsonOutput() {
            const mcpServers = {};

            // Add selected presets
            selectedPresets.forEach(presetId => {
                const preset = PRESETS.find(p => p.id === presetId);
                if (preset) {
                    // Use override if exists, otherwise use default config
                    const config = presetOverrides[presetId] || preset.config;
                    mcpServers[preset.id] = config;
                }
            });

            // Add custom configs
            customConfigs.forEach(custom => {
                mcpServers[custom.name] = custom.config;
            });

            const output = {
                mcpServers: mcpServers
            };

            document.getElementById('jsonOutput').value = JSON.stringify(output, null, 2);
        }

        // Open add custom modal
        function openAddCustomModal() {
            editingCustomId = null;
            editingPresetId = null;
            document.getElementById('modalTitle').textContent = '新增自訂設定';
            document.getElementById('customForm').reset();
            document.getElementById('connectionType').value = 'stdio';
            updateConnectionTypeFields();
            document.getElementById('customName').disabled = false;
            document.getElementById('customDescription').disabled = false;
            document.getElementById('customModal').classList.add('show');
        }

        // Close custom modal
        function closeCustomModal() {
            document.getElementById('customModal').classList.remove('show');
            editingCustomId = null;
            editingPresetId = null;
            // Reset field states
            document.getElementById('customName').disabled = false;
            document.getElementById('customDescription').disabled = false;
        }

        // Update connection type fields visibility
        function updateConnectionTypeFields() {
            const type = document.getElementById('connectionType').value;
            document.getElementById('stdioFields').style.display = type === 'stdio' ? 'block' : 'none';
            document.getElementById('httpFields').style.display = type === 'http' ? 'block' : 'none';
            document.getElementById('sseFields').style.display = type === 'sse' ? 'block' : 'none';
        }

        // Edit preset config
        function editPreset(presetId) {
            editingPresetId = presetId;
            editingCustomId = null;
            const preset = PRESETS.find(p => p.id === presetId);
            if (!preset) return;

            const config = presetOverrides[presetId] || preset.config;
            
            document.getElementById('modalTitle').textContent = `設定 ${preset.name}`;
            document.getElementById('customName').value = preset.id;
            document.getElementById('customName').disabled = true;
            document.getElementById('customDescription').value = preset.description;
            document.getElementById('customDescription').disabled = true;

            loadConfigToForm(config);
            document.getElementById('customModal').classList.add('show');
        }

        // Load config to form
        function loadConfigToForm(config) {
            const type = config.type || 'stdio';
            document.getElementById('connectionType').value = type;
            updateConnectionTypeFields();

            if (type === 'stdio') {
                document.getElementById('stdioCommand').value = config.command || '';
                document.getElementById('stdioArgs').value = (config.args || []).join('\n');
                document.getElementById('stdioEnv').value = config.env ? JSON.stringify(config.env, null, 2) : '';
            } else if (type === 'http') {
                document.getElementById('httpUrl').value = config.url || '';
                document.getElementById('httpHeaders').value = config.headers ? JSON.stringify(config.headers, null, 2) : '';
            } else if (type === 'sse') {
                document.getElementById('sseUrl').value = config.url || '';
                document.getElementById('sseHeaders').value = config.headers ? JSON.stringify(config.headers, null, 2) : '';
            }

            const tools = config.tools;
            if (Array.isArray(tools) && tools.length === 1 && tools[0] === '*') {
                document.getElementById('customTools').value = '*';
            } else if (Array.isArray(tools)) {
                document.getElementById('customTools').value = JSON.stringify(tools);
            } else {
                document.getElementById('customTools').value = '*';
            }
        }

        // Build config from form
        function buildConfigFromForm() {
            const type = document.getElementById('connectionType').value;
            const config = { type };

            if (type === 'stdio') {
                config.command = document.getElementById('stdioCommand').value.trim();
                const argsText = document.getElementById('stdioArgs').value.trim();
                config.args = argsText ? argsText.split('\n').map(a => a.trim()).filter(a => a) : [];
                
                const envText = document.getElementById('stdioEnv').value.trim();
                if (envText) {
                    config.env = JSON.parse(envText);
                }
            } else if (type === 'http') {
                config.url = document.getElementById('httpUrl').value.trim();
                const headersText = document.getElementById('httpHeaders').value.trim();
                if (headersText) {
                    config.headers = JSON.parse(headersText);
                }
            } else if (type === 'sse') {
                config.url = document.getElementById('sseUrl').value.trim();
                const headersText = document.getElementById('sseHeaders').value.trim();
                if (headersText) {
                    config.headers = JSON.parse(headersText);
                }
            }

            // Handle tools
            const toolsText = document.getElementById('customTools').value.trim();
            if (toolsText === '*') {
                config.tools = ['*'];
            } else if (toolsText.startsWith('[')) {
                config.tools = JSON.parse(toolsText);
            } else {
                config.tools = ['*'];
            }

            return config;
        }

        // Edit custom config
        function editCustom(index) {
            editingCustomId = index;
            editingPresetId = null;
            const config = customConfigs[index];
            document.getElementById('modalTitle').textContent = '編輯自訂設定';
            document.getElementById('customName').value = config.name;
            document.getElementById('customName').disabled = false;
            document.getElementById('customDescription').value = config.description || '';
            document.getElementById('customDescription').disabled = false;
            loadConfigToForm(config.config);
            document.getElementById('customModal').classList.add('show');
        }

        // Delete custom config
        function deleteCustom(index) {
            if (confirm('確定要刪除這個自訂設定嗎？')) {
                customConfigs.splice(index, 1);
                saveState();
                renderCustomConfigs();
                updateJsonOutput();
            }
        }

        // Handle custom form submission
        document.getElementById('customForm').addEventListener('submit', function(e) {
            e.preventDefault();

            try {
                const config = buildConfigFromForm();

                if (editingPresetId !== null) {
                    // Saving preset override
                    presetOverrides[editingPresetId] = config;
                    saveState();
                    updateJsonOutput();
                    closeCustomModal();
                } else {
                    // Saving custom config
                    const name = document.getElementById('customName').value.trim();
                    const description = document.getElementById('customDescription').value.trim();

                    const newCustom = {
                        name: name,
                        description: description,
                        config: config
                    };

                    if (editingCustomId !== null) {
                        customConfigs[editingCustomId] = newCustom;
                    } else {
                        customConfigs.push(newCustom);
                    }

                    saveState();
                    renderCustomConfigs();
                    updateJsonOutput();
                    closeCustomModal();
                }

                // Re-enable fields in case they were disabled
                document.getElementById('customName').disabled = false;
                document.getElementById('customDescription').disabled = false;
            } catch (e) {
                let errorMsg = '設定錯誤';
                if (e.message.includes('JSON')) {
                    errorMsg += '：JSON 格式錯誤，請檢查 JSON 欄位的格式';
                } else {
                    errorMsg += '：' + e.message;
                }
                alert(errorMsg);
            }
        });

        // Update from JSON
        function updateFromJson() {
            const jsonText = document.getElementById('jsonOutput').value;
            try {
                const data = JSON.parse(jsonText);
                
                if (!data.mcpServers || typeof data.mcpServers !== 'object') {
                    throw new Error('JSON 必須包含 mcpServers 物件');
                }

                // Clear current selections
                selectedPresets.clear();
                presetOverrides = {};
                customConfigs = [];

                // Process each server config
                for (const [serverName, serverConfig] of Object.entries(data.mcpServers)) {
                    // Check if it's a preset
                    const preset = PRESETS.find(p => p.id === serverName);
                    if (preset) {
                        selectedPresets.add(serverName);
                        // Check if config is different from default
                        if (JSON.stringify(serverConfig) !== JSON.stringify(preset.config)) {
                            presetOverrides[serverName] = serverConfig;
                        }
                    } else {
                        // It's a custom config
                        customConfigs.push({
                            name: serverName,
                            description: '',
                            config: serverConfig
                        });
                    }
                }

                saveState();
                renderPresets();
                renderCustomConfigs();
                updateJsonOutput();
                alert('已從 JSON 更新設定！');
            } catch (e) {
                alert('JSON 格式錯誤：' + e.message);
            }
        }

        // Copy to clipboard
        function copyToClipboard() {
            const output = document.getElementById('jsonOutput').value;

            // Try modern clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(output).catch(err => {
                    console.error('Failed to copy:', err);
                    fallbackCopy(output);
                });
            } else {
                // Fallback for non-secure contexts
                fallbackCopy(output);
            }
        }

        // Fallback copy method
        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                // Using deprecated execCommand as fallback for older browsers and HTTP contexts
                // where navigator.clipboard is unavailable
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textarea);
        }

        // Export configuration
        function exportConfig() {
            const data = {
                selectedPresets: Array.from(selectedPresets),
                customConfigs: customConfigs
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mcp-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Import configuration
        function importConfig(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate data structure
                    if (typeof data !== 'object' || data === null) {
                        throw new Error('無效的設定檔格式');
                    }

                    // Validate selectedPresets is an array
                    if (data.selectedPresets && !Array.isArray(data.selectedPresets)) {
                        throw new Error('selectedPresets 必須是陣列');
                    }

                    // Validate customConfigs is an array
                    if (data.customConfigs && !Array.isArray(data.customConfigs)) {
                        throw new Error('customConfigs 必須是陣列');
                    }

                    // Validate each custom config has required fields
                    if (data.customConfigs) {
                        for (const config of data.customConfigs) {
                            if (!config.name || !config.config) {
                                throw new Error('自訂設定缺少必要欄位 (name 或 config)');
                            }
                        }
                    }

                    selectedPresets = new Set(data.selectedPresets || []);
                    customConfigs = data.customConfigs || [];
                    saveState();
                    renderPresets();
                    renderCustomConfigs();
                    updateJsonOutput();
                    alert('匯入成功！');
                } catch (err) {
                    let errorMsg = '匯入失敗';
                    if (err.message.includes('JSON')) {
                        errorMsg += '：檔案格式錯誤，請確認是有效的 JSON 檔案';
                    } else {
                        errorMsg += '：' + err.message;
                    }
                    alert(errorMsg);
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset file input
        }

        // Close modal when clicking outside
        document.getElementById('customModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeCustomModal();
            }
        });

        // Initialize on load
        init();
