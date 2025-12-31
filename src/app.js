        // Preset configurations
        const PRESETS = [
            {
                id: 'playwright',
                name: 'Playwright MCP',
                description: '瀏覽器自動化工具，可用於網頁測試和互動',
                config: {
                    type: 'local',
                    command: 'npx',
                    args: ['@playwright/mcp@latest', '--allowed-hosts', '*'],
                    tools: ['*']
                }
            },
            // {
            //     id: 'github',
            //     name: 'GitHub MCP',
            //     description: 'GitHub API 整合，可操作儲存庫、Issues、PR 等',
            //     config: {
            //         type: 'local',
            //         command: 'npx',
            //         args: ['-y', '@modelcontextprotocol/server-github'],
            //         env: {
            //             GITHUB_PERSONAL_ACCESS_TOKEN: '<YOUR_TOKEN>'
            //         },
            //         tools: ['*']
            //     }
            // },
            // {
            //     id: 'filesystem',
            //     name: 'Filesystem MCP',
            //     description: '檔案系統操作，讀寫檔案和目錄',
            //     config: {
            //         type: 'local',
            //         command: 'npx',
            //         args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
            //         tools: ['*']
            //     }
            // },
            {
                id: 'brave-search',
                name: 'Brave Search MCP',
                description: '網路搜尋功能，使用 Brave Search API',
                config: {
                    type: 'local',
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
                    type: 'local',
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
                    type: 'local',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/database.db'],
                    tools: ['*']
                }
            },
            // {
            //     id: 'fetch',
            //     name: 'Fetch MCP',
            //     description: 'HTTP 請求工具，可抓取網頁內容',
            //     config: {
            //         type: 'local',
            //         command: 'npx',
            //         args: ['-y', '@modelcontextprotocol/server-fetch'],
            //         tools: ['*']
            //     }
            // },
            // {
            //     id: 'git',
            //     name: 'Git MCP',
            //     description: 'Git 版本控制操作',
            //     config: {
            //         type: 'local',
            //         command: 'npx',
            //         args: ['-y', '@modelcontextprotocol/server-git'],
            //         tools: ['*']
            //     }
            // },
            {
                id: 'sequential-thinking',
                name: 'Sequential Thinking MCP',
                description: '增強推理能力，支援複雜思考過程',
                config: {
                    type: 'local',
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
                    type: 'local',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory'],
                    tools: ['*']
                }
            }
        ];

        // State management
        let selectedPresets = new Set();
        let customConfigs = [];
        let editingCustomId = null;

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
                } catch (e) {
                    console.error('Failed to load saved state:', e);
                }
            }
        }

        // Save state to localStorage
        function saveState() {
            const data = {
                selectedPresets: Array.from(selectedPresets),
                customConfigs: customConfigs
            };
            localStorage.setItem('mcpConfig', JSON.stringify(data));
        }

        // Render preset list
        function renderPresets() {
            const container = document.getElementById('presetList');
            container.innerHTML = PRESETS.map(preset => `
                <div class="preset-item ${selectedPresets.has(preset.id) ? 'selected' : ''}" id="preset-${preset.id}">
                    <div class="preset-header" onclick="togglePreset('${preset.id}')">
                        <input type="checkbox" ${selectedPresets.has(preset.id) ? 'checked' : ''} onclick="event.stopPropagation(); togglePreset('${preset.id}')">
                        <span class="preset-name">${preset.name}</span>
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
                    mcpServers[preset.id] = preset.config;
                }
            });

            // Add custom configs
            customConfigs.forEach(custom => {
                mcpServers[custom.name] = custom.config;
            });

            const output = {
                mcpServers: mcpServers
            };

            document.getElementById('jsonOutput').textContent = JSON.stringify(output, null, 2);
        }

        // Open add custom modal
        function openAddCustomModal() {
            editingCustomId = null;
            document.getElementById('modalTitle').textContent = '新增自訂設定';
            document.getElementById('customForm').reset();
            document.getElementById('customModal').classList.add('show');
        }

        // Close custom modal
        function closeCustomModal() {
            document.getElementById('customModal').classList.remove('show');
            editingCustomId = null;
        }

        // Edit custom config
        function editCustom(index) {
            editingCustomId = index;
            const config = customConfigs[index];
            document.getElementById('modalTitle').textContent = '編輯自訂設定';
            document.getElementById('customName').value = config.name;
            document.getElementById('customDescription').value = config.description || '';
            document.getElementById('customConfig').value = JSON.stringify(config.config, null, 2);
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

            const name = document.getElementById('customName').value.trim();
            const description = document.getElementById('customDescription').value.trim();
            const configText = document.getElementById('customConfig').value.trim();

            try {
                const config = JSON.parse(configText);

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
            } catch (e) {
                let errorMsg = 'JSON 格式錯誤';
                if (e.message.includes('Unexpected token')) {
                    errorMsg += '：語法錯誤，請檢查是否有缺少逗號、括號或引號';
                } else if (e.message.includes('Unexpected end')) {
                    errorMsg += '：JSON 不完整，請檢查是否有未關閉的括號';
                } else {
                    errorMsg += '：' + e.message;
                }
                alert(errorMsg);
            }
        });

        // Copy to clipboard
        function copyToClipboard() {
            const output = document.getElementById('jsonOutput').textContent;

            // Try modern clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(output).then(() => {
                    alert('已複製到剪貼簿！');
                }).catch(err => {
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
                alert('已複製到剪貼簿！');
            } catch (err) {
                console.error('Fallback copy failed:', err);
                alert('複製失敗，請手動複製');
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
