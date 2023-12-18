/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - ISBN
 *         - title
 *         - author
 *         - quantity
 *         - shelfLocation
 *       properties:
 *         ISBN:
 *           type: BigInteger
 *           description: The International standard book number (ISBN) of the book
 *         title:
 *           type: string
 *           description: The title of the book
 *         author:
 *           type: string
 *           description: The book author
 *         quantity:
 *           type: number
 *           description: How many books can be borrowed
 *         shelfLocation:
 *           type: string
 *           description: A string describing the location of the books
 *       example:
 *         ISBN: 978316148420
 *         title: History of hairbrushes
 *         author: Afro B. Rusher
 *         quantity: 12
 *         shelfLocation: A12
 */

import { Router, Request, Response } from 'express';
import { ModelStatic, Model, Op, Sequelize } from 'sequelize';
import { ISBNExists, errorHandler, parseISBN, borrowerIdExists, isAlreadyBorrowed } from '../utils';

type Book = ModelStatic<Model<any, any>>;
type Borrower = ModelStatic<Model<any, any>>;
type Borrowing = ModelStatic<Model<any, any>>;

type DB = {
    sequelize: Sequelize; 
    Book: Book; 
    Borrower: Borrower; 
    Borrowing: Borrowing;
};

function arePostParametersValid(ISBN: BigInt, title: string, author: string, quantity: number): boolean {
    return (
	ISBN
	&& isNaN(Number.parseInt(title))
	&& isNaN(Number.parseInt(author))
	&& !isNaN(quantity)
    );
}

export default (db: DB) => {
    const router = Router();

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books:
     *   post:
     *     summary: Create a new book
     *     tags: [Books]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Book'
     *     responses:
     *       201:
     *         description: The created book.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Book'
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Invalid parameters
     *                     - Book with the same ISBN already exists
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.post('/', async (request: Request, response: Response) => {
	const { ISBN, title, author, quantity, shelfLocation } = request.body;

	const ISBNInteger = parseISBN(ISBN);
	const parametersValid = arePostParametersValid(ISBNInteger, title, author, quantity);

	if(!parametersValid) {
	    response.status(400).send({ message: "Invalid parameters" });
	    return;
	}

	if(await ISBNExists(db.Book, ISBNInteger)) {
	    response.status(400).send({ message: "Book with the same ISBN already exists" });
	    return;
	}

	const book = { ISBN: ISBNInteger, title, author, quantity, shelfLocation };
	await db.Book.create(book);
	response.status(201).send(book);
    });

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books:
     *   patch:
     *     summary: Update a book's data
     *     tags: [Books]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Book'
     *     responses:
     *       200:
     *         description: The updated book.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Book'
     *       400:
     *         description: No fields given to update or ISBN does not exist
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - ISBN does not exist.
     *                     - No fields given to update
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.patch('/', async (request: Request, response: Response) => {
	const { ISBN, title, author, quantity, shelfLocation } = request.body;

	if(!(await ISBNExists(db.Book, ISBN))) {
	    response.status(400).send({ message: "ISBN does not exist." });
	    return;
	}

	let updateFields: any = {}
	if(title) updateFields.title = title;
	if(author) updateFields.author = author;
	if(quantity) updateFields.quantity = quantity;
	if(shelfLocation) updateFields.shelfLocation = shelfLocation;

	if(Object.keys(updateFields).length == 0)  {
	    response.status(400).send({ message: "No fields given to update" });
	    return;
	}

	const [ _rowsUpdated, ...changed ] = await db.Book.update(
	    updateFields,
	    { where: { ISBN }, returning: true},
	);

	// Since we update one object by ISBN (primary key), only one record will be changed
	response.status(200).send(changed[0]);
    });

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books:
     *   delete:
     *     summary: Delete a book
     *     tags: [Books]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               ISBN:
     *                 type: number
     *                 example: 978316148420
     *     responses:
     *       200:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Book deleted successfully
     *       400:
     *         description: No fields given to update or ISBN does not exist
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: ISBN does not exist.
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.delete('/', async (request: Request, response: Response) => {
	const ISBN = request.body.ISBN;

	if(!(await ISBNExists(db.Book, ISBN))) {
	    response.status(400).send({ message: "ISBN does not exist"});
	    return;
	} 

	db.Book.destroy({ where: { ISBN } });
	response.status(200).send({ message: "Book deleted successfully" });
    });

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books:
     *   get:
     *     summary: Get the data of all or a specific set of books
     *     tags: [Books]
     *     requestBody:
     *       required: false
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               ISBN:
     *                 type: number
     *                 example: 978316148420
     *               title:
     *                 type: string
     *                 example: A guide on how to groom your snail
     *               author:
     *                 type: string
     *                 example: Knot A. Snail
     *     responses:
     *       200:
     *         description: The data of the requested books.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   ISBN:
     *                     type: number
     *                   title:
     *                     type: string
     *                   author:
     *                     type: string
     *                   quantity:
     *                     type: integer
     *                   shelfLocation:
     *                     type: string
     *                   createdAt:
     *                     type: string
     *                     format: date-time
     *                   updatedAt:
     *                     type: string
     *                     format: date-time
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    // ASSUMPTION: Can search with one or a combination of fields.
    router.get('/', async (request: Request, response: Response) => {
	const { ISBN, title, author } = request.body;

	if(!ISBN && !title && !author) {
	    response.status(200).send(await db.Book.findAll());
	    return;
	}

	const ISBNInteger = 
	    request.body.ISBN != undefined? 
		parseISBN(request.body.ISBN)
		: null;

	let queryFields = [];

	if(ISBNInteger) queryFields.push({ISBN: ISBNInteger});
	if(title) queryFields.push({title});
	if(author) queryFields.push({author});

	response.status(200).send(await db.Book.findAll({ 
	    where: { [Op.or] : queryFields } 
	}));
    });
    
    
    /**
     * @swagger
     * /books/borrowed:
     *   post:
     *     summary: Borrow a book
     *     tags: [Books]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               bookISBN:
     *                 type: number
     *                 example: 978316148420
     *               borrowerId:
     *                 type: number
     *                 example: 42
     *     responses:
     *       200:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Book successfully borrowed
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Invalid requestt parameters
     *                     - Invalid borrower id
     *                     - Invalid ISBN
     *                     - Invalid borrow duration
     *                     - Book already borrowed
     *                     - Book out of stock
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.post('/borrowed', async (request: Request, response: Response) => {
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

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books/borrowed:
     *   delete:
     *     summary: Return a borrowed book
     *     tags: [Books]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               ISBN:
     *                 type: number
     *                 example: 978316148420
     *               borrowerId:
     *                 type: number
     *                 example: 68
     *     responses:
     *       200:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Book returned successfully
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Invalid request parameters
     *                     - Invalid borrower id
     *                     - Invalid ISBN
     *                     - Book with the given ISBN is not borrowed 
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.delete('/borrowed',  async (request: Request, response: Response) => {
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

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books/borrowed:
     *   get:
     *     summary: Get the data of all or a specific set of borrowed books
     *     tags: [Books]
     *     requestBody:
     *       required: yes
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               borrowerId:
     *                 type: number
     *                 example: 978316148420
     *     responses:
     *       200:
     *         description: The data of the requested books.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   BookISBN:
     *                     type: number
     *                   dueDate:
     *                     type: string
     *                     format: date-time
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Invalid request parameters
     *                     - Invalid borrower id
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.get('/borrowed', async (request: Request, response: Response) => {
	const { borrowerId } = request.body;

	if(!borrowerId) {
	    response.status(400).send({ message: "Invalid request parameters" });
	    return;
	}

	if(!(await borrowerIdExists(db.Borrower, borrowerId))) {
	    response.status(400).send({ message: "Invalid borrower id" });
	    return;
	}


	response
	    .status(200)
	    .send(await db.Borrowing.findAll({ 
		where: { BorrowerId: borrowerId },
		attributes: [ 'BookISBN', 'dueDate' ] 
	    }));
    });

    /**
     * @swagger
     * tags:
     *   name: Books
     *   description: The book managing API
     * /books/overdue:
     *   get:
     *     summary: Get the ISBNs of all overdue books, their borrower ids, and the due date
     *     tags: [Books]
     *     responses:
     *       200:
     *         description: The data of all overdue books, their borrower ids, and the due date
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   BorrowerId:
     *                     type: number
     *                   BookISBN:
     *                     type: number
     *                   dueDate:
     *                     type: string
     *                     format: date-time
     *       500:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Server error!
     */
    router.get('/overdue',  async (_request: Request, response: Response) => {
	const today = (new Date());
	response.status(200).send(await db.Borrowing.findAll({ where: { dueDate: { [Op.lt]: today } } }));
    });

    // Use the error handler for this router
    router.use(errorHandler);

    return router;
};
