// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
import {ApolloServer} from "@apollo/server";
import {schema} from "./schema";
import CacheService from "./helpers/cacheService";
import {GraphQLError} from "graphql";
import {expressMiddleware} from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import express from 'express';
import * as http from "http";
import {ApolloServerPluginDrainHttpServer} from '@apollo/server/plugin/drainHttpServer';
import prisma from "./client";
import {expressJwtSecret} from "jwks-rsa";
import {expressjwt} from "express-jwt";
import {JwtPayload} from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            auth?: JwtPayload;
        }
    }
}


interface MyContext {
}

// Required logic for integrating with Express
const app = express();
app.use(expressjwt({
    // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint.
    // @ts-ignore
    secret: expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://tumi.eu.auth0.com/.well-known/jwks.json`
    }),
    credentialsRequired: false,
    // Validate the audience and the issuer.
    issuerBaseURL: 'https://tumi.eu.auth0.com',
    audience: 'esn.events',
    algorithms: ['RS256']
}))
// Our httpServer handles incoming requests to our Express app.
// Below, we tell Apollo Server to "drain" this httpServer,
// enabling our servers to shut down gracefully.
const httpServer = http.createServer(app);

const server = new ApolloServer<MyContext>({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({httpServer})],
});

async function startServer() {
    // Note you must call `server.start()` on the `ApolloServer`
// instance before passing the instance to `expressMiddleware`
    await server.start();

// Set up our Express middleware to handle CORS, body parsing,
// and our expressMiddleware function.
    app.use(
        '/',
        cors<cors.CorsRequest>(),
        bodyParser.json(),
        // expressMiddleware accepts the same arguments:
        // an Apollo Server instance and optional configuration options
        expressMiddleware(server, {
            context: async ({req, res}) => {
                let tenantName = req.headers['x-tumi-tenant'];
                if (Array.isArray(tenantName)) {
                    tenantName = tenantName[0];
                }
                let tenant;
                try {
                    tenant = await CacheService.getTenantFromShortName(tenantName ?? '');
                } catch (e) {
                    console.error(e);
                    console.log(tenantName);
                    console.log(req.headers.origin);
                    console.log(req.headers.host);
                    throw new GraphQLError('Tenant not found', {
                        extensions: {error: e},
                    });
                }
                if (req.auth) {
                    let user = await prisma.user.findUnique({
                        where: {
                            authId: req.auth.sub,
                        },
                        include: {
                            tenants: {where: {tenantId: tenant.id}},
                        },
                    });
                    if (user && !user.tenants.length) {
                        try {
                            user = await prisma.user.update({
                                where: {
                                    id: user.id,
                                },
                                data: {
                                    tenants: {
                                        create: {
                                            tenantId: tenant.id,
                                        },
                                    },
                                },
                                include: {
                                    tenants: {where: {tenantId: tenant.id}},
                                },
                            });
                        } catch (e) {
                            console.error(e);
                            user = await prisma.user.findUnique({
                                where: {
                                    authId: req.auth.sub,
                                },
                                include: {
                                    tenants: {where: {tenantId: tenant.id}},
                                },
                            });
                        }
                    }
                    return {tenant, user, userOfTenant: user?.tenants[0]};
                }
                return {tenant};
            },
        }),
    );

// Modified server startup
    await new Promise<void>((resolve) => httpServer.listen({port: 4000}, resolve));
    console.log(`🚀 Server ready at http://localhost:4000/`);
}

void startServer();
