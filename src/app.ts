// Type definitions
interface PresetConfig {
    type: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    tools?: string[];
}

interface Preset {
    id: string;
    name: string;
    description: string;
    config: PresetConfig;
}

interface CustomConfig {
    name: string;
    description: string;
    config: PresetConfig;
}

interface SavedState {
    selectedPresets: string[];
    customConfigs: CustomConfig[];
    presetOverrides: Record<string, PresetConfig>;
}

interface McpServersOutput {
    mcpServers: Record<string, PresetConfig>;
}

// Preset configurations (will be replaced during build)
const PRESETS: Preset[] = [];

// State management
let selectedPresets = new Set<string>();
let customConfigs: CustomConfig[] = [];
let presetOverrides: Record<string, PresetConfig> = {}; // Store preset parameter overrides
let editingCustomId: number | null = null;
let editingPresetId: string | null = null;

// HTML escape function to prevent XSS
function escapeHtml(unsafe: string | undefined): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setFooterVersion(): void {
    const versionEl = document.getElementById('appVersion');
    if (!versionEl) return;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="app-version"]');
    const version = meta?.getAttribute('content')?.trim();

    if (!version || version === 'dev') {
        versionEl.hidden = true;
        return;
    }

    versionEl.textContent = `v${version}`;
    versionEl.hidden = false;
}

// Initialize
function init(): void {
    setFooterVersion();
    loadState();
    renderPresets();
    renderCustomConfigs();
    updateJsonOutput();
}

// Load state from localStorage
function loadState(): void {
    const saved = localStorage.getItem('mcpConfig');
    if (saved) {
        try {
            const data: SavedState = JSON.parse(saved);
            selectedPresets = new Set(data.selectedPresets || []);
            customConfigs = data.customConfigs || [];
            presetOverrides = data.presetOverrides || {};
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
    }
}

// Save state to localStorage
function saveState(): void {
    const data: SavedState = {
        selectedPresets: Array.from(selectedPresets),
        customConfigs: customConfigs,
        presetOverrides: presetOverrides
    };
    localStorage.setItem('mcpConfig', JSON.stringify(data));
}

// Render preset list
function renderPresets(): void {
    const container = document.getElementById('presetList');
    if (!container) return;

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
function togglePreset(id: string): void {
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
function renderCustomConfigs(): void {
    const container = document.getElementById('customList');
    if (!container) return;

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
function updateJsonOutput(): void {
    const mcpServers: Record<string, PresetConfig> = {};

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

    const output: McpServersOutput = {
        mcpServers: mcpServers
    };

    const jsonOutputEl = document.getElementById('jsonOutput') as HTMLTextAreaElement;
    if (jsonOutputEl) {
        jsonOutputEl.value = JSON.stringify(output, null, 2);
    }
}

function stableStringify(value: any): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

function applyStateFromJsonText(jsonText: string): void {
    const data: McpServersOutput = JSON.parse(jsonText);

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
function openAddCustomModal(): void {
    editingCustomId = null;
    editingPresetId = null;
    const modalTitle = document.getElementById('modalTitle');
    const customForm = document.getElementById('customForm') as HTMLFormElement;
    const customName = document.getElementById('customName') as HTMLInputElement;
    const customDescription = document.getElementById('customDescription') as HTMLInputElement;
    const customModal = document.getElementById('customModal');

    if (modalTitle) modalTitle.textContent = '新增自訂設定';
    if (customForm) customForm.reset();

    // Set stdio as default for radio buttons
    const stdioRadio = document.querySelector<HTMLInputElement>('input[name="connectionType"][value="stdio"]');
    if (stdioRadio) stdioRadio.checked = true;

    updateConnectionTypeFields();

    if (customName) customName.disabled = false;
    if (customDescription) customDescription.disabled = false;
    if (customModal) customModal.classList.add('show');
}

// Close custom modal
function closeCustomModal(): void {
    const customModal = document.getElementById('customModal');
    const customName = document.getElementById('customName') as HTMLInputElement;
    const customDescription = document.getElementById('customDescription') as HTMLInputElement;

    if (customModal) customModal.classList.remove('show');
    editingCustomId = null;
    editingPresetId = null;

    // Reset field states
    if (customName) customName.disabled = false;
    if (customDescription) customDescription.disabled = false;
}

function isCustomModalOpen(): boolean {
    const customModal = document.getElementById('customModal');
    return customModal ? customModal.classList.contains('show') : false;
}

function saveCustomModal(): void {
    const form = document.getElementById('customForm') as HTMLFormElement;
    if (!form) return;

    if (typeof (form as any).requestSubmit === 'function') {
        (form as any).requestSubmit();
        return;
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// Update connection type fields visibility
function updateConnectionTypeFields(): void {
    const typeRadio = document.querySelector<HTMLInputElement>('input[name="connectionType"]:checked');
    const type = typeRadio?.value || 'stdio';

    const stdioFields = document.getElementById('stdioFields');
    const httpFields = document.getElementById('httpFields');
    const sseFields = document.getElementById('sseFields');

    if (stdioFields) stdioFields.style.display = type === 'stdio' ? 'block' : 'none';
    if (httpFields) httpFields.style.display = type === 'http' ? 'block' : 'none';
    if (sseFields) sseFields.style.display = type === 'sse' ? 'block' : 'none';
}

// Edit preset config
function editPreset(presetId: string): void {
    editingPresetId = presetId;
    editingCustomId = null;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const config = presetOverrides[presetId] || preset.config;

    const modalTitle = document.getElementById('modalTitle');
    const customName = document.getElementById('customName') as HTMLInputElement;
    const customDescription = document.getElementById('customDescription') as HTMLInputElement;
    const customModal = document.getElementById('customModal');

    if (modalTitle) modalTitle.textContent = `設定 ${preset.name}`;
    if (customName) {
        customName.value = preset.id;
        customName.disabled = true;
    }
    if (customDescription) {
        customDescription.value = preset.description;
        customDescription.disabled = true;
    }

    loadConfigToForm(config);
    if (customModal) customModal.classList.add('show');
}

// Load config to form
function loadConfigToForm(config: PresetConfig): void {
    const type = config.type || 'stdio';
    // Set the radio button for the connection type
    const radio = document.querySelector<HTMLInputElement>(`input[name="connectionType"][value="${type}"]`);
    if (radio) {
        radio.checked = true;
    }
    updateConnectionTypeFields();

    const stdioCommand = document.getElementById('stdioCommand') as HTMLInputElement;
    const stdioArgs = document.getElementById('stdioArgs') as HTMLTextAreaElement;
    const stdioEnv = document.getElementById('stdioEnv') as HTMLTextAreaElement;
    const httpUrl = document.getElementById('httpUrl') as HTMLInputElement;
    const httpHeaders = document.getElementById('httpHeaders') as HTMLTextAreaElement;
    const sseUrl = document.getElementById('sseUrl') as HTMLInputElement;
    const sseHeaders = document.getElementById('sseHeaders') as HTMLTextAreaElement;
    const customTools = document.getElementById('customTools') as HTMLTextAreaElement;

    if (type === 'stdio') {
        if (stdioCommand) stdioCommand.value = config.command || '';
        if (stdioArgs) stdioArgs.value = (config.args || []).join('\n');
        if (stdioEnv) stdioEnv.value = config.env ? JSON.stringify(config.env, null, 2) : '';
    } else if (type === 'http') {
        if (httpUrl) httpUrl.value = config.url || '';
        if (httpHeaders) httpHeaders.value = config.headers ? JSON.stringify(config.headers, null, 2) : '';
    } else if (type === 'sse') {
        if (sseUrl) sseUrl.value = config.url || '';
        if (sseHeaders) sseHeaders.value = config.headers ? JSON.stringify(config.headers, null, 2) : '';
    }

    const tools = config.tools;
    if (customTools) {
        if (Array.isArray(tools) && tools.length === 1 && tools[0] === '*') {
            customTools.value = '["*"]';
        } else if (Array.isArray(tools)) {
            customTools.value = JSON.stringify(tools);
        } else {
            customTools.value = '["*"]';
        }
    }
}

// Build config from form
function buildConfigFromForm(): PresetConfig {
    const typeRadio = document.querySelector<HTMLInputElement>('input[name="connectionType"]:checked');
    const type = typeRadio?.value || 'stdio';
    const config: PresetConfig = { type };

    const stdioCommand = document.getElementById('stdioCommand') as HTMLInputElement;
    const stdioArgs = document.getElementById('stdioArgs') as HTMLTextAreaElement;
    const stdioEnv = document.getElementById('stdioEnv') as HTMLTextAreaElement;
    const httpUrl = document.getElementById('httpUrl') as HTMLInputElement;
    const httpHeaders = document.getElementById('httpHeaders') as HTMLTextAreaElement;
    const sseUrl = document.getElementById('sseUrl') as HTMLInputElement;
    const sseHeaders = document.getElementById('sseHeaders') as HTMLTextAreaElement;
    const customTools = document.getElementById('customTools') as HTMLTextAreaElement;

    try {
        if (type === 'stdio') {
            config.command = stdioCommand?.value.trim() || '';
            if (!config.command) {
                throw new Error('命令欄位不可為空');
            }
            const argsText = stdioArgs?.value.trim() || '';
            config.args = argsText ? argsText.split('\n').map(a => a.trim()).filter(a => a) : [];

            const envText = stdioEnv?.value.trim() || '';
            if (envText) {
                config.env = JSON.parse(envText);
            }
        } else if (type === 'http') {
            config.url = httpUrl?.value.trim() || '';
            if (!config.url) {
                throw new Error('URL 欄位不可為空');
            }
            const headersText = httpHeaders?.value.trim() || '';
            if (headersText) {
                config.headers = JSON.parse(headersText);
            }
        } else if (type === 'sse') {
            config.url = sseUrl?.value.trim() || '';
            if (!config.url) {
                throw new Error('URL 欄位不可為空');
            }
            const headersText = sseHeaders?.value.trim() || '';
            if (headersText) {
                config.headers = JSON.parse(headersText);
            }
        }

        // Handle tools
        const toolsText = customTools?.value.trim() || '';
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
        const error = e as Error;
        throw new Error(error.message.includes('JSON') ? 'JSON 格式錯誤：' + error.message : error.message);
    }

    return config;
}

// Edit custom config
function editCustom(index: number): void {
    editingCustomId = index;
    editingPresetId = null;
    const config = customConfigs[index];

    const modalTitle = document.getElementById('modalTitle');
    const customName = document.getElementById('customName') as HTMLInputElement;
    const customDescription = document.getElementById('customDescription') as HTMLInputElement;
    const customModal = document.getElementById('customModal');

    if (modalTitle) modalTitle.textContent = '編輯自訂設定';
    if (customName) {
        customName.value = config.name;
        customName.disabled = false;
    }
    if (customDescription) {
        customDescription.value = config.description || '';
        customDescription.disabled = false;
    }

    loadConfigToForm(config.config);
    if (customModal) customModal.classList.add('show');
}

// Delete custom config
function deleteCustom(index: number): void {
    if (confirm('確定要刪除這個自訂設定嗎？')) {
        customConfigs.splice(index, 1);
        saveState();
        renderCustomConfigs();
        updateJsonOutput();
    }
}

// Handle custom form submission
const customForm = document.getElementById('customForm');
if (customForm) {
    customForm.addEventListener('submit', function(e) {
        e.preventDefault();

        try {
            const config = buildConfigFromForm();

            const customName = document.getElementById('customName') as HTMLInputElement;
            const customDescription = document.getElementById('customDescription') as HTMLInputElement;

            if (editingPresetId !== null) {
                // Saving preset override
                presetOverrides[editingPresetId] = config;
                saveState();
                updateJsonOutput();
                closeCustomModal();
            } else {
                // Saving custom config
                const name = customName?.value.trim() || '';
                const description = customDescription?.value.trim() || '';

                const newCustom: CustomConfig = {
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
            if (customName) customName.disabled = false;
            if (customDescription) customDescription.disabled = false;
        } catch (e) {
            const error = e as Error;
            let errorMsg = '設定錯誤';
            if (error.message.includes('JSON')) {
                errorMsg += '：JSON 格式錯誤，請檢查 JSON 欄位的格式';
            } else {
                errorMsg += '：' + error.message;
            }
            alert(errorMsg);
        }
    });
}

// Keyboard shortcuts for modal: Esc = cancel, Ctrl+Enter = save
document.addEventListener('keydown', function(e) {
    if (!isCustomModalOpen() || (e as any).isComposing) return;

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
const jsonOutput = document.getElementById('jsonOutput');
if (jsonOutput) {
    jsonOutput.addEventListener('input', function() {
        const textarea = this as HTMLTextAreaElement;
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
}

// Copy to clipboard
function copyToClipboard(): void {
    const output = (document.getElementById('jsonOutput') as HTMLTextAreaElement)?.value || '';

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
(window as any).copyPath = function(path: string, element: HTMLElement): void {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(path).then(() => {
            // Show visual feedback on the clicked element
            if (element) {
                element.classList.add('copied');
                setTimeout(() => {
                    element.classList.remove('copied');
                }, 500);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            fallbackCopy(path);
        });
    } else {
        fallbackCopy(path);
    }
}

// Fallback copy method
function fallbackCopy(text: string): void {
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
function exportConfig(): void {
    const data: SavedState = {
        selectedPresets: Array.from(selectedPresets),
        customConfigs: customConfigs,
        presetOverrides: presetOverrides
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
function importConfig(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target?.result as string);

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
            presetOverrides = data.presetOverrides || {};
            saveState();
            renderPresets();
            renderCustomConfigs();
            updateJsonOutput();
            alert('匯入成功！');
        } catch (err) {
            const error = err as Error;
            let errorMsg = '匯入失敗';
            if (error.message.includes('JSON')) {
                errorMsg += '：檔案格式錯誤，請確認是有效的 JSON 檔案';
            } else {
                errorMsg += '：' + error.message;
            }
            alert(errorMsg);
        }
    };
    reader.readAsText(file);
    target.value = ''; // Reset file input
}

// Copy code block content
(window as any).copyCodeBlock = function(): void {
    const codeBlock = document.querySelector('.notice-content pre code');
    if (!codeBlock) {
        console.error('Code block not found');
        return;
    }

    const text = codeBlock.textContent || '';

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-code-btn') as HTMLElement;
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

// Expose functions to global scope for inline event handlers
(window as any).togglePreset = togglePreset;
(window as any).openAddCustomModal = openAddCustomModal;
(window as any).closeCustomModal = closeCustomModal;
(window as any).editCustom = editCustom;
(window as any).deleteCustom = deleteCustom;
(window as any).editPreset = editPreset;
(window as any).updateConnectionTypeFields = updateConnectionTypeFields;
(window as any).copyToClipboard = copyToClipboard;
(window as any).exportConfig = exportConfig;
(window as any).importConfig = importConfig;
(window as any).saveCustomModal = saveCustomModal;

// Initialize on load
init();
