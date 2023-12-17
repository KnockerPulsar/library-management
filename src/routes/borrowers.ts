import { Router, Request, Response } from 'express';
import { ModelStatic, Model } from 'sequelize';
import validator from 'email-validator';
import { borrowerIdExists, errorHandler } from '../utils';

type Borrower = ModelStatic<Model<any, any>>;
// Operations:
// 	- Add				POST: 		/borrowers
// 	- Update			PATCH: 		/borrowers
// 	- Delete			DELETE:		/borrowers
// 	- List all			GET:		/borrowers, no body

async function emailExists(Borrower: Borrower, email: string): Promise<boolean> {
   return (await Borrower.findOne({ where: { email }})) != null; 
}

async function checkEmail(Borrower: Borrower, email: string) {
    const valid = validator.validate(email);
    const exists = await emailExists(Borrower, email);

    return [ valid, exists ];
}

export default (Borrower: Borrower) => {
    const router = Router();

    router.post('/', async (request: Request, response: Response) => {
	const { name, email } = request.body;

	if(!(name && email )) {
	    response.status(400).send({ message: "Missing request parameters" });
	    return;
	}

	const [ valid, exists ] = await checkEmail(Borrower, email);

	if(!valid) {
	    response.status(400).send({ message: "Invalid email" });
	    return;
	}

	if(exists) {
	    response.status(400).send({ message: "Email already exists" });
	    return;
	}

	await Borrower.create({ name, email });
	response.status(201).send({ message: "Borrower added successfully" });
    });

    router.patch('/', async(request: Request, response: Response) => {
	const { name, email } = request.body;

	if(!(name && email )) {
	    response.status(400).send({ message: "Missing request parameters" });
	    return;
	}

	const [ valid, exists ] = await checkEmail(Borrower, email);

	if(!valid) {
	    response.status(400).send({ message: "Invalid email" });
	    return;
	}

	if(!exists) {
	    response.status(400).send({ message: "Email does not exist" });
	    return;
	}

	Borrower.update(
	    { name },
	    { where: { email } }
	);
	response.status(201).send({ message: "Borrower added successfully" });
    })

    router.delete('/', async(request: Request, response: Response) => {
	const { borrowerId } = request.body;

	if(!borrowerIdExists(Borrower, borrowerId)) {
	    response.status(400).send({ message: "Email does not exist" });
	    return;
	}

	Borrower.destroy({ where: { id: borrowerId } });
	response.status(200).send({ message: "Borrower deleted successfully" });
    });

    router.get('/', async (_: Request, response: Response) => {
	response.status(200).send(await Borrower.findAll());
    });

    router.use(errorHandler);

    return router;
}
