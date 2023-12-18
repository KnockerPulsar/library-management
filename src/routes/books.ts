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
import { ModelStatic, Model, Op } from 'sequelize';
import { ISBNExists, errorHandler, parseISBN } from '../utils';

type Book = ModelStatic<Model<any, any>>;

function arePostParametersValid(ISBN: BigInt, title: string, author: string, quantity: number): boolean {
    return (
	ISBN
	&& isNaN(Number.parseInt(title))
	&& isNaN(Number.parseInt(author))
	&& !isNaN(quantity)
    );
}

export default (Book: Book) => {
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
     *         description: Invalid parameters or book already exists
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

	if(await ISBNExists(Book, ISBNInteger)) {
	    response.status(400).send({ message: "Book with the same ISBN already exists" });
	    return;
	}

	const book = { ISBN: ISBNInteger, title, author, quantity, shelfLocation };
	await Book.create(book);
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

	if(!(await ISBNExists(Book, ISBN))) {
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

	const [ rowsUpdated, ...changed ] = await Book.update(
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
     *       204:
     *         description: The updated book.
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

	if(!(await ISBNExists(Book, ISBN))) {
	    response.status(400).send({ message: "ISBN does not exist"});
	    return;
	} 

	Book.destroy({ where: { ISBN } });
	response.status(204).send({ message: "Book deleted successfully" });
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
     *         description: The updated book.
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
	    response.status(200).send(await Book.findAll());
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

	response.status(200).send(await Book.findAll({ 
	    where: { [Op.or] : queryFields } 
	}));
    });

    // Use the error handler for this router
    router.use(errorHandler);

    return router;
};
