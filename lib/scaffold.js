import fsp from 'fs/promises';
import { join } from 'path';
import { createAPIRoutes, createController, createFormComponent, createRoutePages, getRootDir, readDBConfig, requireLocalPackage, setFieldType, setORMFieldType, writeDeleteButtonComponent } from './functions.js';
import { singularize } from './helpers.js';
import { destroyButtonTemplate } from './templates/component_templates.js';

// Convert snake_case to CamelCase
function snakeCaseToCamelCase(input) {
  return input.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

// Capitalize the first letter
function capitalize(val) {
  return val.charAt(0).toUpperCase() + val.slice(1);
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fsp.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fsp.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

async function scaffoldFromDatabase() {
  let chicDbConfig;
  let rootDir = getRootDir();
  // Connection configuration
  let dbConfig = {};
  let connection;
  let allTables = {};

  const modelDirectory = join(rootDir, 'src', 'lib', 'models');
  const dBConfigFileDirectory = join(rootDir, 'src', 'lib', 'db');
  const dBConfigFilePath = join(dBConfigFileDirectory, 'db.js');

  try {
    chicDbConfig = await readDBConfig();
    console.log('chicDbConfig:', chicDbConfig);
  } catch (err) {
    throw new Error('Error reading database_config.json', err);
  }

  try {
    
    await ensureDirectoryExists(modelDirectory);
    await ensureDirectoryExists(dBConfigFileDirectory);
    
    // Check database type:
    switch (chicDbConfig.dialect) {
      case 'sqlite':
        dbConfig.database = chicDbConfig.database;
        try {
          allTables = await getTablesAndColumnsFromSqlite(dbConfig);
          console.log('Sqlite tables:', allTables);
        } catch (error) {
          console.error('Error connecting to the database:', error);
          return;
        }

        break;
      case 'mysql':
        dbConfig.host = chicDbConfig.host;
        dbConfig.user = chicDbConfig.user;
        dbConfig.password = chicDbConfig.password;
        dbConfig.database = chicDbConfig.database;

        allTables = await getTablesAndColumnsFromMysql(dbConfig);
        console.log('Tables:', allTables);
        break;

      default:
        throw new Error('Unsupported database type:', chicDbConfig.dialect);
        break;
    }


    console.log('All tables:', allTables);
    // Write JSON file
    await fsp.writeFile(join(modelDirectory, 'tables.json'), JSON.stringify(allTables, null, 2));

    // Generate model.js files for Sequelize and update db.js
    for (const [tName, cols] of Object.entries(allTables)) {
      const modelName = snakeCaseToCamelCase(tName);
      const singularModelName = singularize(modelName);
      const filePath = join(modelDirectory, `${singularModelName}Model.js`);
      let allFieldsString = "";
      cols.map(col => {
        allFieldsString += col.Field + ":" + setFieldType(col.Type) + " ";
      });
      const fields = cols.map(col => {
        let primaryKey = '';
        if (col.Key === 'PRI') {
          primaryKey = `, primaryKey: true`;
          if (col.Extra.includes('auto_increment')) {
            primaryKey += `, autoIncrement: true`;
          }
        }
        return `        ${col.Field}: { type: DataTypes.${setORMFieldType(col.Type)}${primaryKey} },\n`;
      }).join('');

      console.log('Fields:', fields);

      const modelContent = `// ${singularModelName} model:\nconst ${singularModelName}Model = function(sequelize, DataTypes) {\n    return sequelize.define('${singularModelName}', {\n${fields}    },\n    {\n      sequelize,\n      tableName: '${tName}',\n      timestamps: false,\n    })\n  }\n  \nexport { ${singularModelName}Model }`;

      try {

        await fsp.writeFile(filePath, modelContent);
        console.log(`${singularModelName} model generated\n- ${filePath}`);
      } catch (error) {
        console.log('Error writing model file:', error);
      }
      console.log(`${singularModelName} model generated\n- ${filePath}`);

      // ADD MODEL TO DB FILE:
      const modelImportLine = `import { ${singularModelName}Model } from '../models/${singularModelName}Model.js';`;
      const modelSetupLine = `const ${singularModelName} = ${singularModelName}Model(sequelize, Sequelize);`;
      let fileContent = await fsp.readFile(dBConfigFilePath, 'utf8');
      let lines = fileContent.split('\n');
      let lastImportIndex = lines.lastIndexOf(lines.find(line => line.trim().startsWith('// import models')));
      let lastModelSetupIndex = lines.lastIndexOf(lines.find(line => line.trim().startsWith('// define resources')));
      // Insert new lines
      lines.splice(lastImportIndex + 1, 0, modelImportLine);
      lines.splice(lastModelSetupIndex + 2, 0, modelSetupLine);
      // Find the line starting with 'export {' and modify it
      let index = lines.findIndex(line => line.startsWith('export {'));
      if (index !== -1) {
        lines[index] = lines[index].replace('{', `{ ${singularModelName}, `);
      }

      // Write the modified content back to the ORM setup file
      await fsp.writeFile(dBConfigFilePath, lines.join('\n'));
      // CREATE THE CONTROLLER
      await createController(modelName);
      // CREATE THE FORM
      await createFormComponent(modelName, ['new', '[id]/edit'], allFieldsString);
      // CREATE THE ROUTES
      await createRoutePages(singularModelName, ['', 'new', '[id]', '[id]/edit'], allFieldsString);
      // CREATE THE API ROUTES
      createAPIRoutes(modelName, ['', '[id]']);
      writeDeleteButtonComponent(destroyButtonTemplate);
    }

  } catch (err) {
    console.error('Error during database operations:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
async function getTablesAndColumnsFromMysql(dbConfig) {
  const mysql = await requireLocalPackage('mysql2/promise');
  let allTables = {};
  let connection = await mysql.createConnection(dbConfig);
  const [tables] = await connection.query("SHOW TABLES");

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const tableName = table[`Tables_in_${dbConfig.database}`];
    const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
    allTables[tableName] = columns.map(({ Field, Type, Key, Extra }) => ({
      Field, Type, Key, Extra
    }));
  }
  connection.end();
  return allTables;
}
async function getTablesAndColumnsFromSqlite(dbConfig) {
  const sqlite3 = await requireLocalPackage('sqlite3');
  console.log('here');

  const db = new sqlite3.Database(dbConfig.database);

  try {
    console.log('Connected to the SQLite database.');
    console.log('Fetching tables...');

    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
        if (err) reject(err);
        else resolve(tables);
      });
    });

    console.log('Table count:', tables.length);

    let allTables = {};

    for (const table of tables) {
      if (table.name === 'sqlite_sequence') continue;

      console.log('Table name:', table.name);

      const columns = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table.name});`, (err, columns) => {
          if (err) reject(err);
          else resolve(columns);
        });
      });

      allTables[table.name] = columns.map(({ name, type, pk, notnull, dflt_value }) => ({
        Field: name,
        Type: type,
        Key: pk ? 'PRI' : '',
        Extra: notnull ? 'NOT NULL' : dflt_value ? `DEFAULT ${dflt_value}` : ''
      }));
    }

    return allTables;
  } finally {
    await new Promise((resolve) => db.close(resolve));
    console.log('Closed the database connection.');
  }
}

async function getTablesAndColumnsFromPostgres(dbConfig) {
  const { Client } = await requireLocalPackage('pg');
  const client = new Client(dbConfig);
  await client.connect();
  let allTables = {};

  try {
    // Query to get the list of tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tables = tablesResult.rows;

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i].table_name;

      // Query to get the columns of the table
      const columnsResult = await client.query(`
        SELECT column_name AS Field, data_type AS Type, 
               CASE WHEN column_key = 'PRI' THEN 'PRI' ELSE '' END AS Key, 
               is_nullable AS is_nullable, column_default AS dflt_value
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);

      allTables[tableName] = columnsResult.rows.map(({ field, type, key, is_nullable, dflt_value }) => ({
        Field: field,
        Type: type,
        Key: key,
        Extra: is_nullable === 'NO' ? 'NOT NULL' : dflt_value ? `DEFAULT ${dflt_value}` : ''
      }));
    }
  } catch (err) {
    console.error('Error fetching tables and columns', err);
  } finally {
    await client.end();
  }

  return allTables;
}

export { scaffoldFromDatabase };
