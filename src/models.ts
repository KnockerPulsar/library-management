import { Sequelize, DataTypes } from 'sequelize'

// Download postgres
// `sudo -u postgres -i`, default username on ubuntu is postgres
// psql
// \password
// write new password
// connection string is `postgres://username:password@host:port/database-name`
// username=postgres, password=password, host=localhost, port=5432, database-name=library-management

export function initDatabase(sequelize: Sequelize) {
    sequelize.authenticate()
    .then(() => console.log("Connected to postgres"))
    .catch((e) => console.log(`Failed to connect to postgres: ${e}`));


    // Book: { ISBN, title, author, quantity, shelf location }
    // Operations:
    // 	- Add: 						POST:	/books
    // 	- Update					PATCH:	/books
    // 	- Delete					DELETE: /books
    // 	- List all 					GET: 	/books, no body
    // 	- Search by title, author, or ISBN 		GET:	/books, optional title, author, or ISBN, error on combinations?
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

    return { Book };
}
