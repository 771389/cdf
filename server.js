const express = require('express');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Chave secreta para gerar e verificar os tokens
const SECRET_KEY = process.env.SECRET_KEY || 'androidx&clubedosfilmes';

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());

// Middleware para verificar o token
const authMiddleware = expressJwt({
  secret: SECRET_KEY,
  algorithms: ['HS256']
}).unless({
  path: ['/login', '/routes/soma-total'] // Login e soma não exigem autenticação
});

// Rota para fazer login e gerar o token
app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario === 'vitor' && senha === 'spazio3132') {
    const token = jwt.sign({ usuario }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token });
  }

  return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
});

// Diretório onde os arquivos JSON estão armazenados
const routesPath = path.join(__dirname, 'routes');

// Variável para armazenar os arquivos JSON carregados
const jsonRoutes = {};

// Carregamento dinâmico dos arquivos JSON e criação das rotas
fs.readdirSync(routesPath).forEach(file => {
  if (file.endsWith('.json')) {
    const routeName = `/routes/${file.replace('.json', '')}`;
    const filePath = path.join(routesPath, file);
    const fileContent = require(filePath);

    jsonRoutes[routeName] = fileContent;

    // Criar rota para cada arquivo JSON
    app.get(routeName, (req, res) => res.json(fileContent));
    console.log(`Rota criada: GET ${routeName}`);
  }
});

// Rota para pesquisa de filmes
app.get('/routes/pesquisa', (req, res) => {
  const { movie_name, ano } = req.query; // Obtém os parâmetros de pesquisa 'movie_name' e 'ano'

  // Verifica se o arquivo allmovies está presente
  const allMovies = jsonRoutes['/routes/allmovies']; // Acessa o JSON de filmes carregado anteriormente

  if (!allMovies) {
    return res.status(404).json({ erro: 'Arquivo de filmes não encontrado.' });
  }

  let resultados = Object.values(allMovies);

  // Filtra os filmes com base no parâmetro 'movie_name' (se fornecido)
  if (movie_name) {
    resultados = resultados.filter(filme => {
      return filme.movie_name.toLowerCase().includes(movie_name.toLowerCase()); // Filtra pelos nomes dos filmes
    });
  }

  // Filtra os filmes com base no parâmetro 'ano' (se fornecido)
  if (ano) {
    resultados = resultados.filter(filme => {
      const filmeAno = new Date(filme.date_created).getFullYear(); // Extrai o ano da data de criação
      return filmeAno === parseInt(ano, 10); // Compara o ano
    });
  }

  // Verifica se encontrou filmes e exibe os resultados
  if (resultados.length > 0) {
    // Retorna os resultados com nome do filme e ano
    const filmesFiltrados = resultados.map(filme => {
      const filmeAno = new Date(filme.date_created).getFullYear(); // Extrai o ano
      return { movie_name: filme.movie_name, ano: filmeAno }; // Retorna o nome e o ano
    });

    return res.json(filmesFiltrados);
  } else {
    return res.status(404).json({ erro: 'Nenhum filme encontrado.' });
  }
});

// Rota para calcular a soma de todos os itens dentro da chave "servidores"
app.get('/routes/soma-total', (req, res) => {
  let somaTotal = 0;

  // Iterar sobre todos os arquivos JSON carregados
  Object.values(jsonRoutes).forEach(jsonData => {
    if (jsonData.servidores) {
      // Para cada arquivo JSON, contar o número de servidores
      somaTotal += Object.keys(jsonData.servidores).length;
    }
  });

  // Retornar o total de servidores contados
  res.json({
    somaTotal
  });
});

// Middleware para tratar erros
app.use((err, req, res, next) => {
  if (err.name === 'acesso negado, rala daqui') {
    return res.status(401).json({ erro: 'Token inválido ou não fornecido.' });
  }
  next(err);
});

// Inicia o servidor
app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));
