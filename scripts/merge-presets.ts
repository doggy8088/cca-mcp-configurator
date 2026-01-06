import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

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

/**
 * Validates a preset configuration
 */
function validatePreset(preset: any, filename: string): preset is Preset {
  const errors: string[] = [];

  // Check required fields
  if (!preset.id || typeof preset.id !== 'string') {
    errors.push(`Missing or invalid 'id' field`);
  }

  if (!preset.name || typeof preset.name !== 'string') {
    errors.push(`Missing or invalid 'name' field`);
  }

  if (!preset.description || typeof preset.description !== 'string') {
    errors.push(`Missing or invalid 'description' field`);
  }

  if (!preset.config || typeof preset.config !== 'object') {
    errors.push(`Missing or invalid 'config' field`);
  } else {
    const config = preset.config;

    // Validate config.type
    if (!config.type || typeof config.type !== 'string') {
      errors.push(`Missing or invalid 'config.type' field`);
    } else if (!['stdio', 'http', 'sse'].includes(config.type)) {
      errors.push(`Invalid 'config.type': must be 'stdio', 'http', or 'sse'`);
    }

    // Validate type-specific fields
    if (config.type === 'stdio') {
      if (!config.command || typeof config.command !== 'string') {
        errors.push(`Missing or invalid 'config.command' for stdio type`);
      }
      if (config.args && !Array.isArray(config.args)) {
        errors.push(`Invalid 'config.args': must be an array`);
      }
      if (config.env && typeof config.env !== 'object') {
        errors.push(`Invalid 'config.env': must be an object`);
      }
    } else if (config.type === 'http' || config.type === 'sse') {
      if (!config.url || typeof config.url !== 'string') {
        errors.push(`Missing or invalid 'config.url' for ${config.type} type`);
      }
      if (config.headers && typeof config.headers !== 'object') {
        errors.push(`Invalid 'config.headers': must be an object`);
      }
    }

    // Validate tools field
    if (config.tools && !Array.isArray(config.tools)) {
      errors.push(`Invalid 'config.tools': must be an array`);
    }
  }

  // Check if filename matches id
  const expectedFilename = `${preset.id}.json`;
  if (filename !== expectedFilename) {
    errors.push(
      `Filename '${filename}' does not match preset id '${preset.id}' (expected '${expectedFilename}')`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed for ${filename}:\n  - ${errors.join('\n  - ')}`);
  }

  return true;
}

/**
 * Loads and validates all preset files from the presets directory
 */
export function loadPresets(presetsDir: string): Preset[] {
  const presets: Preset[] = [];
  const files = readdirSync(presetsDir).filter((f) => f.endsWith('.json'));
  const seenIds = new Set<string>();

  for (const file of files) {
    const filepath = join(presetsDir, file);
    try {
      const content = readFileSync(filepath, 'utf-8');
      const preset = JSON.parse(content);

      // Validate the preset
      validatePreset(preset, file);

      // Check for duplicate IDs
      if (seenIds.has(preset.id)) {
        throw new Error(`Duplicate preset id '${preset.id}' found in ${file}`);
      }
      seenIds.add(preset.id);

      presets.push(preset);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error loading ${file}: ${error.message}`);
      }
      throw error;
    }
  }

  return presets;
}

/**
 * CLI entry point for validation
 */
if (import.meta.main) {
  try {
    const presetsDir = process.argv[2] || 'presets';
    console.log(`Validating presets in ${presetsDir}...`);

    const presets = loadPresets(presetsDir);

    console.log(`✅ All ${presets.length} preset(s) are valid:`);
    presets.forEach((p) => console.log(`  - ${p.id}: ${p.name}`));

    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Validation failed: ${error.message}`);
    } else {
      console.error(`❌ Validation failed:`, error);
    }
    process.exit(1);
  }
}
