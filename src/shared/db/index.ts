import { Sequelize } from 'sequelize'

import { Book, bookSchema } from '../models/Book'
import { Borrower, borrowerSchema } from '../models/Borrower';
import { Borrowing, borrowingSchema } from '../models/Borrowing';

export interface DB {
    sequelize: Sequelize; 
    Book: Book; 
    Borrower: Borrower; 
    Borrowing: Borrowing;
};

export async function initDatabase(): Promise<DB> {
    const DB_USER = process.env.DB_USER;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_ADDRESS = process.env.DB_ADDRESS;
    const DB_PORT = process.env.DB_PORT;
    const DB_NAME = process.env.DB_NAME;

    const sequelize = new Sequelize(`postgres://${DB_USER}:${DB_PASSWORD}@${DB_ADDRESS}:${DB_PORT}/${DB_NAME}`);

    await sequelize.authenticate();
    console.log("Connected to postgres")

    const bookModel = bookSchema(sequelize);
    const borrowerModel = borrowerSchema(sequelize);
    const borrowingModel = borrowingSchema(sequelize, bookModel, borrowerModel);

    return { sequelize, Book: bookModel, Borrower: borrowerModel, Borrowing: borrowingModel };
}
