// Resource database file:
export let dbTemplate = `
import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';
// import models:

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'chic.sqlite',
    dialectOptions: {
        // Your sqlite3 options here
        // for instance, this is how you can configure the database opening mode:
        mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
      },
});

// const sequelize = new Sequelize("sqlite::memory:");
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