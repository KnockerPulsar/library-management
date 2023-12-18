import express, { Request, Response, NextFunction } from 'express';
import { initDatabase } from './models'

import booksRouter from './routes/books';
import borrowersRouter from './routes/borrowers';
import { errorHandler } from './utils'

require('express-async-errors');

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import 'dotenv/config';

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use((request: Request, _: Response, next: NextFunction) => {
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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

app.listen(process.env.SERVER_PORT, () => { console.log(`Listening at port ${process.env.SERVER_PORT}`) });

initDatabase(process).then((db) => {
    db.sequelize.sync().then(() => {
	app.use('/books', booksRouter(db));
	app.use('/borrowers', borrowersRouter(db.Borrower));

	app.get("/*", (_: Request, response: Response) => {
	    response.status(404).send({ message: "endpoint not found" });
	});
    })

    app.use(errorHandler);
});
