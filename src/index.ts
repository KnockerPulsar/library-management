import express, { Request, Response } from 'express';
import { Op } from 'sequelize'
import { initDatabase } from './models'

import booksRouter from './routes/books';
import borrowersRouter from './routes/borrowers';
import { ISBNExists, borrowerIdExists, errorHandler, isAlreadyBorrowed, parseISBN } from './utils'

require('express-async-errors');

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import 'dotenv/config';

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use((request: Request, _: Response, next: any) => {
    console.log(`${request.url}: ${request.method}`);
    next();
});

const swaggerJsdocOptions = {
    failOnErrors: true,
    definition: {
	openapi: "3.1.0",
	info: {
	    title: "Library management API with Swagger",
	    version: "0.1.0",
	    description: "This is a simple CRUD API application made with Express and documented with Swagger",
	},
	servers: [ { url: `http://localhost:${process.env.SERVER_PORT}`, }, ],
    },
	apis: ["./src/routes/*.ts"],
};

const specs = swaggerJsdoc(swaggerJsdocOptions);
console.log(specs);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

app.listen(process.env.SERVER_PORT, () => { console.log(`Listening at port ${process.env.SERVER_PORT}`) });

initDatabase(process).then((db) => {
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

	    const row = (await db.Book.findByPk(bookISBN, { attributes: ['ISBN', 'quantity'] }))!;
	    const quantity: number = row!.get('quantity') as number;

	    if(quantity == 0) {
		response.status(400).send({ message: "Book out of stock" });
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
	    row.set('quantity', quantity - 1);
	    await row.save();

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
	    await db.Book.increment({ quantity: +1 }, { where: { ISBN: BookISBN } });
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
	});
    })

    app.use(errorHandler);
});
