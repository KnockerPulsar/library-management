import express, { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize'
import { initDatabase } from './models'

import booksRouter from './routes/books';
import borrowersRouter from './routes/borrowers';
import { ISBNExists, borrowerIdExists, errorHandler, isAlreadyBorrowed } from './utils'
import { request } from 'http';


const SERVER_PORT = 6970;

const app = express();

const sequelize = new Sequelize('postgres://postgres:password@localhost:5432/library-management');
const db = initDatabase(sequelize);

app.use(express.json());
app.use(express.urlencoded());
app.use((request: Request, _: Response, next: any) => {
    console.log(`${request.url}: ${request.method}`);
    next();
});

app.listen(SERVER_PORT, () => { console.log(`Listening at port ${SERVER_PORT}`) });

db.sequelize.sync().then((_: any) => {

    app.use('/books', booksRouter(db.Book));
    app.use('/borrowers', borrowersRouter(db.Borrower));
    
    // 	- Borrow a book			POST:		/borrow
    app.post('/borrow', async (request: Request, response: Response) => {
	const { borrowerId, bookISBN, borrowDuration } = request.body;

	if(!borrowerId || !bookISBN || !borrowDuration) {
	    response.status(400).send({ message: "Invalid request parameters" });
	    return;
	}

	if(!(await borrowerIdExists(db.Borrower, borrowerId))) {
	    response.status(400).send({ message: "Invalid borrower id" });
	    return;
	}

	if(!(await ISBNExists(db.Book, bookISBN))) {
	    response.status(400).send({ message: "Invalid ISBN" });
	    return;
	}

	// Borrow duration unspecified, will assume 1, 7, and 30 days.
	if(!([1, 7, 30].includes(borrowDuration))) {
	    response.status(400).send({ message: "Invalid borrow duration" });
	    return;
	}

	if((await isAlreadyBorrowed(db.Borrowing, borrowerId, bookISBN))) {
	    response.status(400).send({ message: "Book already borrowed" });
	    return;
	}

	let dueDate = new Date();
	dueDate.setDate(dueDate.getDate() + borrowDuration);
	
	// For some reason, sequelize requires the keys of this table to have the first letter 
	// capitalized (for foreign keys at least). Not doing so will just duplicate the foreign
	// keys with capitalized names.
	await db.Borrowing.create({
	    BorrowerId: borrowerId, 
	    BookISBN: bookISBN, 
	    dueDate
	});
	response.status(200).send({ message: "Book borrowed successfully" });
    });

    // 	- Return a book			POST:		/return
    app.post('/return',  async (request: Request, response: Response) => {
	const { borrowerId, bookISBN } = request.body;

	if(!borrowerId || !bookISBN) {
	    response.status(400).send({ message: "Invalid request parameters" });
	    return;
	}

	if(!(await borrowerIdExists(db.Borrower, borrowerId))) {
	    response.status(400).send({ message: "Invalid borrower id" });
	    return;
	}

	if(!(await ISBNExists(db.Book, bookISBN))) {
	    response.status(400).send({ message: "Invalid ISBN" });
	    return;
	}

	if(!(await isAlreadyBorrowed(db.Borrowing, borrowerId, bookISBN))) {
	    response.status(400).send({ message: "Book with the given ISBN is not borrowed" });
	    return;
	}

	const BorrowerId = borrowerId;
	const BookISBN = bookISBN;
	await db.Borrowing.destroy({ where: { [Op.and]: [BorrowerId, BookISBN] } });
	response.status(200).send({ message: "Book returned successfully" });
    });

    // 	- List borrowed books		GET:		/borrowed
    app.get('/borrowed', async (request: Request, response: Response) => {
	const { borrowerId } = request.body;

	if(!borrowerId) {
	    response.status(400).send({ message: "Invalid request parameters" });
	    return;
	}

	if(!(await borrowerIdExists(db.Borrower, borrowerId))) {
	    response.status(400).send({ message: "Invalid borrower id" });
	    return;
	}

	response.status(200).send(await db.Borrowing.findAll({ where: { BorrowerId: borrowerId }}));
    });

    app.get('/overdue',  async (request: Request, response: Response) => {
	const today = (new Date());
	response.status(200).send(await db.Borrowing.findAll({ where: { dueDate: { [Op.lt]: today } } }));
    });

    app.get("/*", (_: Request, response: Response) => {
	response.status(404).send({ message: "endpoint not found" });
    })
})

app.use(errorHandler);
