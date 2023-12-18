import { Sequelize, DataTypes, ModelStatic, Model } from "sequelize";
import { Book } from './Book';
import { Borrower } from './Borrower';

export function borrowingSchema(sequelize: Sequelize, bookModel: Book, borrowerModel: Borrower) {
    // 	- Extra borrower id - ISBN table (This borrower has borrowed these
    // 	books), with borrow (createdAt) and borrow durations.
    const borrowingModel = sequelize.define('Borrowing', {
	BorrowerId: {
	    type: DataTypes.INTEGER,
	    references: {
		model: borrowerModel,
		key: 'id'
	    }
	},

	BookISBN: {
	    type: DataTypes.BIGINT,
	    references: {
		model: bookModel,
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

    bookModel.belongsToMany(borrowerModel, { through: borrowingModel });
    borrowerModel.belongsToMany(bookModel, { through: borrowingModel });

    return borrowingModel;
}

export type Borrowing = ModelStatic<Model<any, any>>;
