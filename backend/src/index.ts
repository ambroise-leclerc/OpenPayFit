import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, OpenPayFit Backend!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
