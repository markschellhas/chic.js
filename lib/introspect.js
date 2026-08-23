import fs from 'node:fs';
import path from 'node:path';
import pluralize from 'pluralize';

const SYSTEM_TABLES = new Set([
  '__chic_migrations',
  '__drizzle_migrations',
  'drizzle_migrations'
]);

const MANAGED_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'createdat', 'updatedat']);

const BOOLEAN_NAMES = /^(is_|has_|can_|published|active|enabled|visible|featured|locked|draft|verified|accepted|approved)/i;

function camel(value) {
  return value
    .replace(/[-_\s]+(.)?/g, (_, letter = '') => letter.toUpperCase())
    .replace(/^(.)/, (letter) => letter.toLowerCase());
}

function pascal(value) {
  const result = camel(value);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function snake(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function resourceNames(input) {
  const singular = camel(pluralize.singular(input));
  const plural = camel(pluralize.plural(singular));
  return {
    singular,
    plural,
    model: pascal(singular),
    table: snake(plural)
  };
}

export function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

export function parseTableList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => parseTableList(entry));
  return String(value).split(/[\s,]+/).map((entry) => entry.trim()).filter(Boolean);
}

export function isSystemTable(name) {
  const normalized = String(name || '').toLowerCase();
  return normalized.startsWith('sqlite_') || SYSTEM_TABLES.has(normalized);
}

export function normalizeDatabaseUrl(value) {
  let filename = String(value || '').trim();
  if ((filename.startsWith('"') && filename.endsWith('"')) || (filename.startsWith("'") && filename.endsWith("'"))) {
    filename = filename.slice(1, -1);
  }
  return filename.replace(/^file:/, '');
}

function readEnvFileValue(root, name) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (!line) return null;
  return line.slice(name.length + 1).trim();
}

export function resolveDatabasePath(root, override) {
  const candidate = override
    || process.env.DATABASE_URL
    || readEnvFileValue(root, 'DATABASE_URL')
    || (fs.existsSync(path.join(root, 'chic.db')) ? 'chic.db' : null);

  if (!candidate) {
    throw new Error(
      'No SQLite database found. Pass --database, set DATABASE_URL, or create chic.db in the project root.'
    );
  }

  const filename = normalizeDatabaseUrl(candidate);
  if (!filename) {
    throw new Error('DATABASE_URL is empty.');
  }
  const resolved = path.isAbsolute(filename) ? filename : path.resolve(root, filename);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Database file not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`Database path is not a file: ${resolved}`);
  }
  return resolved;
}

async function openSqlite(filePath) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(filePath);
  return {
    all(sql) {
      return db.prepare(sql).all();
    },
    close() {
      db.close();
    }
  };
}

export function declaredSqlType(sqlType) {
  return String(sqlType || '')
    .trim()
    .toLowerCase()
    .replace(/\s*\([\s\d,]+\)$/, '');
}

export function mapSqlType(sqlType, columnName = '', { foreignKey = false } = {}) {
  const name = String(columnName || '').toLowerCase();
  if (foreignKey || (/_id$/.test(name) && name !== 'id')) return 'references';

  const type = declaredSqlType(sqlType);
  if (['bool', 'boolean'].includes(type)) return 'boolean';
  if (type === 'date') return 'date';
  if (['datetime', 'timestamp', 'timestamptz'].includes(type)) return 'datetime';
  if (['json', 'jsonb'].includes(type)) return 'json';
  if (['real', 'float', 'double', 'numeric', 'decimal'].includes(type)) return 'float';
  if (['int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint'].includes(type) || type === '') {
    if (/_at$/.test(name)) return 'datetime';
    if (BOOLEAN_NAMES.test(name)) return 'boolean';
    return 'integer';
  }
  if (['text', 'clob', 'varchar', 'character', 'char', 'nchar', 'nvarchar', 'blob'].includes(type)
    || type.startsWith('varchar')
    || type.startsWith('character')
    || type.startsWith('varying')) {
    return 'string';
  }
  return 'string';
}

export function selectTableNames(allNames, { only = [], except = [] } = {}) {
  const available = allNames.map(String);
  const normalized = new Map(available.map((name) => [name.toLowerCase(), name]));
  const onlyList = parseTableList(only);
  const exceptList = new Set(parseTableList(except).map((name) => name.toLowerCase()));

  let selected;
  if (onlyList.length) {
    selected = onlyList.map((name) => {
      const match = normalized.get(name.toLowerCase());
      if (!match) {
        throw new Error(
          `Table "${name}" was not found in the database. Available: ${available.join(', ') || '(none)'}.`
        );
      }
      if (isSystemTable(match)) {
        throw new Error(`Table "${match}" is a system table and cannot be scaffolded.`);
      }
      return match;
    });
  } else {
    selected = available.filter((name) => !isSystemTable(name));
  }

  return selected.filter((name) => !exceptList.has(name.toLowerCase()) && !isSystemTable(name));
}

function indexColumns(db, tableName) {
  const indexes = db.all(`PRAGMA index_list(${quoteIdent(tableName)})`);
  return indexes.map((index) => ({
    ...index,
    columns: db.all(`PRAGMA index_info(${quoteIdent(index.name)})`)
  }));
}

export function describeTable(db, name) {
  return {
    name,
    columns: db.all(`PRAGMA table_info(${quoteIdent(name)})`),
    foreignKeys: db.all(`PRAGMA foreign_key_list(${quoteIdent(name)})`),
    indexes: indexColumns(db, name)
  };
}

export function tableToScaffold(table) {
  const id = table.columns.find((column) => column.name.toLowerCase() === 'id');
  if (!id) {
    return { name: table.name, skipReason: `Table "${table.name}" has no id column.` };
  }
  if (!id.pk) {
    return { name: table.name, skipReason: `Table "${table.name}" id column is not a primary key.` };
  }
  const idType = declaredSqlType(id.type || 'integer');
  if (idType && !['int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint'].includes(idType)) {
    return { name: table.name, skipReason: `Table "${table.name}" id column must be an integer primary key.` };
  }

  const createdAt = table.columns.some((column) => ['created_at', 'createdat'].includes(column.name.toLowerCase()));
  const updatedAt = table.columns.some((column) => ['updated_at', 'updatedat'].includes(column.name.toLowerCase()));
  const foreignKeys = new Map(table.foreignKeys.map((entry) => [entry.from, entry]));
  const uniqueColumns = new Set();
  const indexedColumns = new Set();
  for (const index of table.indexes || []) {
    if ((index.columns || []).length !== 1) continue;
    const columnName = index.columns[0].name;
    if (index.unique) uniqueColumns.add(columnName);
    else if (index.origin === 'c') indexedColumns.add(columnName);
  }

  const fields = [];
  for (const column of table.columns) {
    if (MANAGED_COLUMNS.has(column.name.toLowerCase())) continue;
    const foreignKey = foreignKeys.get(column.name);
    const type = mapSqlType(column.type, column.name, { foreignKey: Boolean(foreignKey) });
    let fieldName = column.name;
    let reference = null;
    if (type === 'references') {
      fieldName = column.name.replace(/_id$/i, '');
      reference = resourceNames(foreignKey?.table || fieldName).plural;
    }
    const jsName = camel(fieldName);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(jsName)) {
      return {
        name: table.name,
        skipReason: `Table "${table.name}" column "${column.name}" is not a valid field name.`
      };
    }
    fields.push({
      name: jsName,
      column: column.name,
      type,
      required: Boolean(column.notnull),
      unique: uniqueColumns.has(column.name),
      index: indexedColumns.has(column.name) && !uniqueColumns.has(column.name),
      reference
    });
  }

  if (!fields.length) {
    return {
      name: table.name,
      skipReason: `Table "${table.name}" has no scaffoldable columns beyond id and timestamps.`
    };
  }

  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(table.name)) {
    return { name: table.name, skipReason: `Table "${table.name}" is not a valid Chic resource name.` };
  }

  return {
    name: table.name,
    resource: table.name,
    fields,
    createdAt,
    updatedAt
  };
}

export async function inspectDatabase(root, options = {}) {
  const filePath = resolveDatabasePath(root, options.database);
  const db = await openSqlite(filePath);
  try {
    const names = db.all(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .map((row) => row.name);
    return {
      path: filePath,
      tables: names.map((name) => describeTable(db, name))
    };
  } finally {
    db.close();
  }
}

export function prepareScaffoldTables(inspected, options = {}) {
  const selectedNames = selectTableNames(
    inspected.tables.map((table) => table.name),
    { only: options.only, except: options.except }
  );
  const selected = new Set(selectedNames);
  const prepared = [];
  const skipped = [];

  for (const table of inspected.tables) {
    if (!selected.has(table.name)) continue;
    const result = tableToScaffold(table);
    if (result.skipReason) {
      if (parseTableList(options.only).length) {
        throw new Error(result.skipReason);
      }
      skipped.push(result);
      continue;
    }
    prepared.push(result);
  }

  return { prepared, skipped, selectedNames };
}
