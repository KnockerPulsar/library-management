import { Sequelize, DataTypes } from 'sequelize'

// Download postgres
// `sudo -u postgres -i`, default username on ubuntu is postgres
// psql
// \password
// write new password
// create database 'library-management'
// connection string is `postgres://username:password@host:port/database-name`
// username=postgres, password=password, host=localhost, port=5432, database-name=library-management


export function initDatabase(sequelize: Sequelize) {
    sequelize.authenticate()
    .then(() => console.log("Connected to postgres"))
    .catch((e) => console.log(`Failed to connect to postgres: ${e}`));


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
