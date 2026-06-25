import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
app.use(express.json());

// ... [Insert your existing cache types, fetchCardSets(), /api/sets, and /api/scrape endpoint logic here] ...

// DO NOT call app.listen() when deploying on Vercel as a Serverless Function!
// Instead, export the express application:
export default app;