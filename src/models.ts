import { Sequelize, DataTypes } from 'sequelize'
import pg from 'pg';

// Download postgres
// `sudo -u postgres -i`, default username on ubuntu is postgres
// psql
// \password
// write new password twice
// Set environment variables in the .env file
// Example: 
// 		DB_USER=postgres
// 		DB_PASSWORD=password
// 		DB_ADDRESS=localhost
// 		DB_PORT=5432
// 		DB_NAME=library-management


export async function initDatabase(process: any) {
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

    // Book: { ISBN, title, author, quantity, shelf location }
    const Book = sequelize.define('Book', {
	ISBN: {
	    type: DataTypes.BIGINT,
	    primaryKey: true,
	    validate: { notEmpty: true }
	},

	title: {
	    type: DataTypes.STRING,
	    allowNull: false,
	    validate: { notEmpty: true }
	},

	author: {
	    type: DataTypes.STRING,
	    allowNull: false,
	    validate: { notEmpty: true }
	},

	quantity: {
	    type: DataTypes.INTEGER,
	    allowNull: false,
	    validate: { notEmpty: true }
	},

	// ASSUMPTION: Arbitrary string
	// Shelf 2B, A2, 9S, etc...
	shelfLocation: {
	    type: DataTypes.STRING,
	    allowNull: false,
	    validate: { notEmpty: true }
	}
    });

    // Borrower: { ID, name, email, registered date }
    // registered date is automatically created by postgres (createdAt)
    const Borrower = sequelize.define('Borrower', {
	id: {
	    type: DataTypes.INTEGER, 
	    primaryKey: true,
	    autoIncrement: true,
	},

	name: {
	    type: DataTypes.STRING,
	    allowNull: false,
	    validate: { notEmpty: true }
	},

	email: {
	    type: DataTypes.STRING,
	    allowNull: false,
	    validate: { notEmpty: true }
	},
    });

    // 	- Extra borrower id - ISBN table (This borrower has borrowed these
    // 	books), with borrow (createdAt) and borrow durations.
    const Borrowing = sequelize.define('Borrowing', {
	BorrowerId: {
	    type: DataTypes.INTEGER,
	    references: {
		model: Borrower,
		key: 'id'
	    }
	},

	BookISBN: {
	    type: DataTypes.BIGINT,
	    references: {
		model: Book,
		key: 'ISBN'
	    }
	},

	dueDate: {
	    type: DataTypes.DATE,
	    allowNull: false,
	}
    }, {
	timestamps: false
    });

    Book.belongsToMany(Borrower, { through: Borrowing });
    Borrower.belongsToMany(Book, { through: Borrowing });

    return { sequelize, Book, Borrower, Borrowing };
}
