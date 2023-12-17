import { ModelStatic, Model, Op } from 'sequelize';
import { Request, Response } from 'express';

type Book = ModelStatic<Model<any, any>>;
type Borrower = ModelStatic<Model<any, any>>;
type Borrowing = ModelStatic<Model<any, any>>;

export async function ISBNExists(Book: Book, ISBNInteger: BigInt): Promise<boolean> {
   return (await Book.findOne({ where: { ISBN: ISBNInteger }})) != null; 
}

export async function borrowerIdExists(Borrower: Borrower, id: number) {
   return (await Borrower.findOne({ where: { id }})) != null; 
}

export async function isAlreadyBorrowed(Borrowing: Borrowing, BorrowerId: number, BookISBN: BigInt) {
    return (await Borrowing.findOne({ where: { [Op.and]: [{ BorrowerId }, { BookISBN }] } }));
}

// Error handling function
// Returns a 500 code, instead of crashing the whole application
// Works with the help of express-async-errors
export async function errorHandler(error: Error, _: Request, response: Response, next: any) {
    response.status(500).send({ 'message': 'Server error!' }); 
    next(error);
}
