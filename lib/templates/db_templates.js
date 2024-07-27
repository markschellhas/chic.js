// Resource database file:
export let dbTemplate = `
// Database configuration:
import dbConfig from './database_config.json';
let environment = dbConfig.env;
// Using sequelize ORM. See https://sequelize.org/master/manual/getting-started.html
// for more information.
import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';

// import models:


// create database connection:
const sequelize = new Sequelize({
    dialect: dbConfig.db[environment].dialect,
    storage: dbConfig.db[environment].database,
    dialectOptions: {
        // Your sqlite3 options here
        // for instance, this is how you can configure the database opening mode:
        mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
      },
});

//  catch error if db connection fails
try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}
sequelize.sync();

// define resources:

export {}
`;