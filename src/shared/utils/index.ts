import { Op } from 'sequelize';
import { Request, Response, NextFunction } from 'express';
import { Book } from '../models/Book';
import { Borrower } from '../models/Borrower';
import { Borrowing } from '../models/Borrowing';

export async function ISBNExists(Book: Book, ISBN: string): Promise<boolean> {
    return (await Book.findOne({ where: { ISBN }})) !== null; 
}

export async function borrowerIdExists(Borrower: Borrower, id: number) {
    return (await Borrower.findOne({ where: { id }})) !== null; 
}

export async function isAlreadyBorrowed(Borrowing: Borrowing, BorrowerId: number, BookISBN: BigInt) {
    return (await Borrowing.findOne({ where: { [Op.and]: [{ BorrowerId }, { BookISBN }] } }));
}

// Error handling function
// Returns a 500 code, instead of crashing the whole application
// Works with the help of express-async-errors
export async function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
    console.log(error.message);
    console.log(error.stack);
    response.status(500).send({ 'message': 'Server error!' }); 
}

export function parseISBN(ISBNString: string): string {
    return ISBNString.replaceAll('-', '');
}

