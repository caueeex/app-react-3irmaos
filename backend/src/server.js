import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} (acesse pela rede local com o IP desta máquina)`);
});