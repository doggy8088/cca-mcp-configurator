        // Preset configurations
        const PRESETS = [
            {
                id: 'playwright',
                name: 'Playwright MCP',
                // Note: HTML in description is safe as it's hardcoded, not user input
                description: '瀏覽器自動化工具，可用於網頁測試和互動 (<a href="https://github.com/microsoft/playwright-mcp" target="_blank" rel="noopener noreferrer">官方 Repo</a>)',
                config: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['@playwright/mcp@latest', '--viewport-size', '1280x720', '--allowed-hosts', '*'],
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

        function setFooterVersion() {
            const versionEl = document.getElementById('appVersion');
            if (!versionEl) return;

            const meta = document.querySelector('meta[name="app-version"]');
            const version = meta?.getAttribute('content')?.trim();

            if (!version || version === 'dev') {
                versionEl.hidden = true;
                return;
            }

            versionEl.textContent = `v${version}`;
            versionEl.hidden = false;
        }

        // Initialize
        function init() {
            setFooterVersion();
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

        function stableStringify(value) {
            if (value === null || typeof value !== 'object') return JSON.stringify(value);
            if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
            const keys = Object.keys(value).sort();
            return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
        }

        function applyStateFromJsonText(jsonText) {
            const data = JSON.parse(jsonText);

            if (!data.mcpServers || typeof data.mcpServers !== 'object' || Array.isArray(data.mcpServers)) {
                throw new Error('JSON 必須包含 mcpServers 物件');
            }

            selectedPresets.clear();
            presetOverrides = {};
            customConfigs = [];

            for (const [serverName, serverConfig] of Object.entries(data.mcpServers)) {
                const preset = PRESETS.find(p => p.id === serverName);
                if (preset) {
                    selectedPresets.add(serverName);
                    if (stableStringify(serverConfig) !== stableStringify(preset.config)) {
                        presetOverrides[serverName] = serverConfig;
                    }
                } else {
                    customConfigs.push({
                        name: serverName,
                        description: '',
                        config: serverConfig
                    });
                }
            }
        }

        // Open add custom modal
        function openAddCustomModal() {
            editingCustomId = null;
            editingPresetId = null;
            document.getElementById('modalTitle').textContent = '新增自訂設定';
            document.getElementById('customForm').reset();
            // Set stdio as default for radio buttons
            document.querySelector('input[name="connectionType"][value="stdio"]').checked = true;
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

        function isCustomModalOpen() {
            return document.getElementById('customModal').classList.contains('show');
        }

        function saveCustomModal() {
            const form = document.getElementById('customForm');
            if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
                return;
            }
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

        // Update connection type fields visibility
        function updateConnectionTypeFields() {
            const type = document.querySelector('input[name="connectionType"]:checked').value;
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
            // Set the radio button for the connection type
            const radio = document.querySelector(`input[name="connectionType"][value="${type}"]`);
            if (radio) {
                radio.checked = true;
            }
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
                document.getElementById('customTools').value = '["*"]';
            } else if (Array.isArray(tools)) {
                document.getElementById('customTools').value = JSON.stringify(tools);
            } else {
                document.getElementById('customTools').value = '["*"]';
            }
        }

        // Build config from form
        function buildConfigFromForm() {
            const type = document.querySelector('input[name="connectionType"]:checked').value;
            const config = { type };

            try {
                if (type === 'stdio') {
                    config.command = document.getElementById('stdioCommand').value.trim();
                    if (!config.command) {
                        throw new Error('命令欄位不可為空');
                    }
                    const argsText = document.getElementById('stdioArgs').value.trim();
                    config.args = argsText ? argsText.split('\n').map(a => a.trim()).filter(a => a) : [];
                    
                    const envText = document.getElementById('stdioEnv').value.trim();
                    if (envText) {
                        config.env = JSON.parse(envText);
                    }
                } else if (type === 'http') {
                    config.url = document.getElementById('httpUrl').value.trim();
                    if (!config.url) {
                        throw new Error('URL 欄位不可為空');
                    }
                    const headersText = document.getElementById('httpHeaders').value.trim();
                    if (headersText) {
                        config.headers = JSON.parse(headersText);
                    }
                } else if (type === 'sse') {
                    config.url = document.getElementById('sseUrl').value.trim();
                    if (!config.url) {
                        throw new Error('URL 欄位不可為空');
                    }
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
                    if (!Array.isArray(config.tools)) {
                        throw new Error('工具欄位必須是陣列格式');
                    }
                } else {
                    config.tools = ['*'];
                }
            } catch (e) {
                throw new Error(e.message.includes('JSON') ? 'JSON 格式錯誤：' + e.message : e.message);
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

        // Keyboard shortcuts for modal: Esc = cancel, Ctrl+Enter = save
        document.addEventListener('keydown', function(e) {
            if (!isCustomModalOpen() || e.isComposing) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                closeCustomModal();
                return;
            }

            if (
                e.key === 'Enter' &&
                (e.ctrlKey || e.metaKey) &&
                !e.shiftKey &&
                !e.altKey
            ) {
                e.preventDefault();
                saveCustomModal();
            }
        });

        // Auto-apply when user edits JSON
        document.getElementById('jsonOutput').addEventListener('input', function() {
            const textarea = this;
            try {
                applyStateFromJsonText(textarea.value);
                textarea.classList.remove('is-invalid');
                saveState();
                renderPresets();
                renderCustomConfigs();
            } catch (e) {
                textarea.classList.add('is-invalid');
            }
        });

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

        // Copy path to clipboard
        window.copyPath = function(path) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(path).then(() => {
                    // Show visual feedback using event target
                    const codeElements = document.querySelectorAll('.copyable-path');
                    codeElements.forEach(el => {
                        if (el.textContent === path) {
                            el.classList.add('copied');
                            setTimeout(() => {
                                el.classList.remove('copied');
                            }, 500);
                        }
                    });
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    fallbackCopy(path);
                });
            } else {
                fallbackCopy(path);
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

        // Copy code block content
        window.copyCodeBlock = function() {
            const codeBlock = document.querySelector('.notice-content pre code');
            if (!codeBlock) {
                console.error('Code block not found');
                return;
            }
            
            const text = codeBlock.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.querySelector('.copy-code-btn');
                if (!btn) {
                    console.error('Copy button not found');
                    return;
                }
                
                const originalHTML = btn.innerHTML;
                
                // Show success feedback
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                btn.style.color = '#28a745';
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('複製失敗，請手動複製');
            });
        };

        // Initialize on load
        init();
