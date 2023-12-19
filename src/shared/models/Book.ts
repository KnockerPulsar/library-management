import { Sequelize, DataTypes, ModelStatic, Model } from 'sequelize'

export type Book = ModelStatic<Model<any, any>>;

// Book: { ISBN, title, author, quantity, shelf location }
export function bookSchema(sequelize: Sequelize) {
    return sequelize.define('Book', {
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
    }, {
	indexes: [
	    // Index for author
	    {
		using: 'btree',
		fields: ['author']
	    },

	    // Index for title
	    {
		using: 'btree',
		fields: ['title']
	    }
	]
    });
} 
