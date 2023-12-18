import { Sequelize, DataTypes } from 'sequelize'
import pg from 'pg';

import { bookSchema } from '../models/Book'
import { borrowerSchema } from '../models/Borrower';
import { borrowingSchema } from '../models/Borrowing';

export async function initDatabase() {
    const DB_USER = process.env.DB_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_ADDRESS = process.env.DB_ADDRESS;
    const DB_PORT = process.env.DB_PORT;
    const DB_NAME = process.env.DB_NAME;

    // https://medium.com/@aashisingh640/node-js-postgresql-create-database-if-it-doesnt-exist-1a93f38629ab
    const client = new pg.Client(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_ADDRESS}:${DB_PORT}`);
    await client.connect();
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);
    if (res.rowCount === 0) {
	console.log(`${DB_NAME} database not found, creating it.`);
	await client.query(`CREATE DATABASE "${DB_NAME}";`);
	console.log(`created database ${DB_NAME}`);
    } else {
	console.log(`${DB_NAME} database exists.`);
    }
    await client.end();

    const sequelize = new Sequelize(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_ADDRESS}:${DB_PORT}/${DB_NAME}`);

    await sequelize.authenticate();
    console.log("Connected to postgres")

    const bookModel = bookSchema(sequelize);
    const borrowerModel = borrowerSchema(sequelize);
    const borrowingModel = borrowingSchema(sequelize, bookModel, borrowerModel);

    return { sequelize, Book: bookModel, Borrower: borrowerModel, Borrowing: borrowingModel };
}
