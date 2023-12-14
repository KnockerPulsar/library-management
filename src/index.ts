import express, { Request, Response } from 'express';
import { Sequelize } from 'sequelize'
import { initDatabase } from './models'
import booksRouter from './routes/books';

const SERVER_PORT = 6970;

const app = express();
const sequelize = new Sequelize('postgres://postgres:password@localhost:5432/library-management');

const { Book } = initDatabase(sequelize);

app.use(express.json());
app.use(express.urlencoded());
app.use((request: Request, response: Response, next: any) => {
    console.log(`${request.url}: ${request.method}`);
    next();
} );

app.listen(SERVER_PORT, () => { console.log(`Listening at port ${SERVER_PORT}`) });

sequelize.sync().then((_: any) => {
    app.use('/books', booksRouter(Book));

    app.get("/*", (request: Request, response: Response) => {
	response.send("Hello, seaman!");
    })

})

// Borrower: { ID, name, email, registered date }
// Operations:
// 	- Add				POST: 		/borrowers
// 	- Update			PATCH: 		/borrowers
// 	- Delete			DELETE:		/borrowers
// 	- List all			GET:		/borrowers, no body
//
// 	- Borrow a book			POST:		/borrow
// 	- Return a book			POST:		/return
// 	- List borrowed books		POST:		/borrowed

// Extra:
// 	- Need to keep track of due dates for books, list books that are overdue
// 	For a borrowed book, register the date it was borrowed on, let's assume a fixed return deadline of 1 month?
//
// 	- Extra borrower id - ISBN table (This borrower has borrowed these books), with borrow and due dates.

