import { realizarLogin, cadastrarUsuario } from '../services/authService.js';

export const login = async (req, res) => {
 try {
  const { email, senha } = req.body;

   // Validação básica de entrada
   if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
   }

  const dadosLogin = await realizarLogin(email, senha);
    return res.status(200).json(dadosLogin);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao realizar login.';
    const isInfraIssue =
      message.includes('Timeout ao buscar usuário no banco') ||
      message.includes('Erro no banco ao buscar usuário');
    return res.status(isInfraIssue ? 503 : 401).json({ erro: message });
  }
};

export const registrar = async (req, res) => {
 try {
  const { nome, email, senha, id_perfil } = req.body;
  
  if (!nome || !email || !senha || !id_perfil) {
   return res.status(400).json({ erro: 'Todos os campos são obrigatórios (nome, email, senha, id_perfil).' });
  }

  const novoUsuario = await cadastrarUsuario(nome, email, senha, id_perfil);

  return res.status(201).json({ 
   mensagem: 'Usuário cadastrado com sucesso!', 
   usuario: novoUsuario 
  });

  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
};