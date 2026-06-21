import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  // CORS configuration for local mock and production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto do edital não fornecido.' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Atue como um especialista em licitações públicas. Analise o edital abaixo e retorne um objeto JSON contendo os seguintes campos:

"objeto": Resumo sucinto do objeto.
"prazo_entrega": Prazo estipulado para entrega.
"exigencias_habilitacao": Lista das principais exigências técnicas.
"garantias": Valor ou tipo de garantia exigida.
"riscos": Quaisquer cláusulas de risco ou restrições severas.
Se uma informação não for encontrada, retorne "Não especificado".

Edital:
${text}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('Sem resposta da OpenAI.');
    }

    return res.status(200).json(JSON.parse(result));
  } catch (error: any) {
    console.error('Erro na análise de edital:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
