// server.js
import express from 'express';
import path from 'path';
import 'dotenv/config';
import commonRoutes from './routes/commonRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import stcRoutes from './routes/stcRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

const { PORT = 8887 } = process.env;

// const { PORT = 8887 } = process.env;
const app = express();

app.use(express.static("client"));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join("views"));

app.use(commonRoutes);
app.use(orderRoutes);
app.use(stcRoutes);
app.use(templateRoutes);

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});
