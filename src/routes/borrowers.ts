/**
 * @swagger
 * components:
 *   schemas:
 *     Borrower:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: number
 *           description: The id of the borrower, starts at 0 and is automatically incremented
 *         name:
 *           type: string
 *           description: The name of the borrower
 *         email:
 *           type: string
 *           description: The email of the borrower, must be unique
 *       example:
 *         id: 0
 *         name: F. Irst Euser
 *         email: first@euser.org
 */

import { Router, Request, Response } from 'express';
import validator from 'email-validator';
import { borrowerIdExists, errorHandler } from '../shared/utils';
import { Borrower } from '../shared/models/Borrower';


async function emailExists(Borrower: Borrower, email: string): Promise<boolean> {
   return (await Borrower.findOne({ where: { email }})) !== null; 
}

async function checkEmail(Borrower: Borrower, email: string) {
    const valid = validator.validate(email);
    const exists = await emailExists(Borrower, email);

    return [ valid, exists ];
}

export default (Borrower: Borrower) => {
    const router = Router();

    /**
     * @swagger
     * tags:
     *   name: Borrowers
     *   description: The borrower managing API
     * /borrowers:
     *   post:
     *     summary: Create a new borrower
     *     tags: [Borrowers]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Borrower'
     *     responses:
     *       201:
     *         description: The created borrower.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Borrower'
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
     *                     - Invalid email
     *                     - Email already exists
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

	const borrower = { name, email };
	await Borrower.create(borrower);
	response.status(201).send({ name, email });
    });

    /**
     * @swagger
     * tags:
     *   name: Borrowers
     *   description: The borrower managing API
     * /borrowers:
     *   patch:
     *     summary: Update a borrower
     *     tags: [Borrowers]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         description: The updated borrower.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Borrower'
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Missing request parameters 
     *                     - Invalid email
     *                     - Email does not exist
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

	const [_rowsUpdated, ...changed] = await Borrower.update(
	    { name },
	    { where: { email }, returning: true }
	);
	response.status(200).send(changed[0]);
    })

    /**
     * @swagger
     * tags:
     *   name: Borrowers
     *   description: The borrower managing API
     * /borrowers:
     *   delete:
     *     summary: Delete a borrower
     *     tags: [Borrowers]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *     responses:
     *       200:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Borrower deleted successfully
     *       400:
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   enum:
     *                     - Email does not exist
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
    router.delete('/', async(request: Request, response: Response) => {
	const { borrowerId } = request.body;

	if(!borrowerIdExists(Borrower, borrowerId)) {
	    response.status(400).send({ message: "Email does not exist" });
	    return;
	}

	Borrower.destroy({ where: { id: borrowerId } });
	response.status(204).send({ message: "Borrower deleted successfully" });
    });

    /**
     * @swagger
     * tags:
     *   name: Borrower
     *   description: The borrower managing API
     * /borrowers:
     *   get:
     *     summary: Get the data of all borrowers
     *     tags: [Borrowers]
     *     responses:
     *       200:
     *         description: The data of all borrowers
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: number
     *                   name:
     *                     type: string
     *                   email:
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
    router.get('/', async (_: Request, response: Response) => {
	response.status(200).send(await Borrower.findAll());
    });

    router.use(errorHandler);

    return router;
}
