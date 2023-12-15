import { Router, Request, Response } from 'express';
import { ModelCtor, Model, Op } from 'sequelize';

type Book = ModelCtor<Model<any, any>>;

async function exists(Book: Book, ISBNInteger: BigInt): Promise<boolean> {
   return (await Book.findOne({ where: { ISBN: ISBNInteger }})) != null; 
}

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

    router.post('/', async (request: Request, response: Response) => {
	const { ISBN, title, author, quantity, shelfLocation } = request.body;

	const ISBNInteger = BigInt((ISBN as string).replaceAll('-', ''));
	const ISBNExists = await exists(Book, ISBNInteger);
	const parametersValid = arePostParametersValid(ISBNInteger, title, author, quantity);

	if(!parametersValid) {
	    response.status(400).send({ message: "Invalid parameters" });
	    return;
	}

	if(ISBNExists) {
	    response.status(400).send({ message: "Book with the same ISBN already exists" });
	    return;
	}

	try {
	    await Book.create({ ISBN: ISBNInteger, title, author, quantity, shelfLocation });
	    response.status(201).send({ message: "Book added successfully" });
	} catch (error) {
	    response.status(500).send({ message: "Internal server error" });
	}     
    });

    router.patch('/', async (request: Request, response: Response) => {
	const { ISBN, title, author, quantity, shelfLocation } = request.body;

	const ISBNInteger = BigInt((ISBN as string).replaceAll('-', ''));
	const ISBNExists = await exists(Book, ISBNInteger);

	if(ISBNExists) {
	    try {
		Book.update(
		    { title, author, quantity, shelfLocation },
		    { where: { ISBN: ISBNInteger } }
		);
		response.status(200).send({ message: "Book data updated successfully" });
	    } catch (error) {
		response.status(500).send({ message: "Internal server error" });
	    }
	} else {
	    response.status(400).send({ message: "ISBN does not exist." });
	}
    });

    router.delete('/', async (request: Request, response: Response) => {
	const ISBNInteger = BigInt((request.body.ISBN as string).replaceAll('-', ''));
	const ISBNExists = await exists(Book, ISBNInteger);

	if(ISBNExists) {
	    Book.destroy({ where: { ISBN: ISBNInteger } });
	    response.status(200).send({ message: "Book deleted successfully" });
	} else {
	    response.status(400).send({ message: "Book with the given ISBN does not exist"});
	}
    });

    // ASSUMPTION: Can search with one or a combination of fields.
    router.get('/', async (request: Request, response: Response) => {
	const { ISBN, title, author } = request.body;

	if(!ISBN && !title && !author) {
	    response.status(200).send(await Book.findAll());
	    return;
	}

	const ISBNInteger = request.body.ISBN != undefined? 
	    BigInt((request.body.ISBN as string).replaceAll('-', ''))
	    : null;

	let queryFields = [];

	if(ISBNInteger) queryFields.push({ISBN: ISBNInteger});
	if(title) queryFields.push({title});
	if(author) queryFields.push({author});

	console.log(queryFields);

	response.status(200).send(await Book.findAll({ 
	    where: { [Op.or]: queryFields } 
	}));
    });

    return router;
};
