import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize'

export type Borrower = ModelStatic<Model<any, any>>;

// Borrower: { ID, name, email, registered date }
// registered date is automatically created by postgres (createdAt)
export function borrowerSchema(sequelize: Sequelize) {
    return sequelize.define('Borrower', {
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
}
