import { Router, Request, Response } from 'express';
import { ModelStatic, Model, Op } from 'sequelize';
import { ISBNExists, errorHandler } from '../utils';

type Book = ModelStatic<Model<any, any>>;
// Operations:
// 	- Add: 						POST:	/books
// 	- Update					PATCH:	/books
// 	- Delete					DELETE: /books
// 	- List all 					GET: 	/books, no body
// 	- Search by title, author, or ISBN 		GET:	/books, optional title, author, or ISBN


function arePostParametersValid(ISBN: BigInt, title: string, author: string, quantity: number): boolean {
    return (
	ISBN
	&& isNaN(Number.parseInt(title))
	&& isNaN(Number.parseInt(author))
	&& !isNaN(quantity)
    );
}

function parseISBN(ISBNString: string): BigInt {
    return BigInt((ISBNString as string).replaceAll('-', ''));
}

export default (Book: Book) => {
    const router = Router();

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

	await Book.create({ ISBN: ISBNInteger, title, author, quantity, shelfLocation });
	response.status(201).send({ message: "Book added successfully" });
    });

    router.patch('/', async (request: Request, response: Response) => {
	const { ISBN, title, author, quantity, shelfLocation } = request.body;

	const ISBNInteger = parseISBN(ISBN);

	if(!(await ISBNExists(Book, ISBNInteger))) {
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

	Book.update(
	    updateFields,
	    { where: { ISBN: ISBNInteger } }
	);
	response.status(200).send({ message: "Book data updated successfully" });
    });

    router.delete('/', async (request: Request, response: Response) => {
	const ISBNInteger = parseISBN(request.body.ISBN);

	if(!(await ISBNExists(Book, ISBNInteger))) {
	    response.status(400).send({ message: "Book with the given ISBN does not exist"});
	    return;
	} 

	Book.destroy({ where: { ISBN: ISBNInteger } });
	response.status(200).send({ message: "Book deleted successfully" });
    });

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
