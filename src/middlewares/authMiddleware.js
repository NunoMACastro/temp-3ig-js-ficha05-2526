/**
 * src/middlewares/authMiddleware.js
 * ---------------------------------
 * Middlewares relacionados com autenticação e autorização.
 *
 * CONTEXTO:
 * - Na Ficha 2 não tinhas autenticação: qualquer utilizador podia aceder a todas
 *   as rotas, e os dados estavam em arrays em memória.
 * - Nesta Ficha 5 vamos ter dois tipos de utilizadores:
 *     - Visitante não autenticado → pode ver as teorias públicas.
 *     - Utilizador autenticado (por ex. admin) → além de ver, pode gerir teorias
 *       (CRUD) e comentar.
 *
 * PROBLEMA:
 * - Como é que o servidor “se lembra” de quem está autenticado entre pedidos?
 * - Como é que as views (EJS) sabem se há um utilizador logged in para mostrar
 *   ou esconder determinados botões/links?
 *
 * SOLUÇÃO (ALTA NÍVEL):
 * - Usamos sessões (configuradas em `app.js`) para guardar o `userId` depois
 *   de um login com sucesso.
 * - Neste ficheiro, os middlewares fazem duas coisas:
 *
 *   1) anexarUtilizadorAsViews
 *      - Lê o `req.session.userId`.
 *      - Se existir, vai buscar o utilizador à base de dados.
 *      - Guarda um objeto “seguro” (sem password) em `res.locals.currentUser`.
 *      - O EJS consegue aceder a `currentUser` em qualquer vista.
 *
 *   2) exigirAutenticacao
 *      - Verifica se existe `req.session.userId`.
 *      - Se não existir, o utilizador não está autenticado → redireciona para /login.
 *      - Se existir, deixa passar para o próximo middleware/rota (next()).
 *
 * IDEIAS IMPORTANTES PARA OS ALUNOS:
 * - `req.session` guarda informação persistente entre pedidos HTTP.
 * - `res.locals` é um “saco” de variáveis que passam automaticamente
 *   para todas as views EJS.
 * - Estes middlewares não sabem nada sobre HTML; limitam-se a preparar
 *   dados para que os controladores e as views funcionem.
 */

import User from "../models/User.js";

/**
 * Middleware que garante que uma rota só é acessível por utilizadores autenticados.
 *
 * FLUXO:
 * 1. Verifica se existe `req.session.userId`.
 * 2. Se NÃO existir:
 *      - Assume que não há ninguém autenticado.
 *      - Redireciona o utilizador para `/login`.
 * 3. Se existir:
 *      - Chama `next()` e deixa o pedido seguir para o controlador.
 *
 * EXEMPLO DE USO:
 * - Em `adminRoutes.js`, podemos fazer:
 *     router.get("/teorias", exigirAutenticacao, adminController.listarTeorias);
 *
 * @param {import("express").Request} req Objeto do pedido HTTP.
 * @param {import("express").Response} res Objeto da resposta HTTP.
 * @param {import("express").NextFunction} next Função para passar ao próximo middleware.
 */
export function exigirAutenticacao(req, res, next) {
    // Se a sessão não tiver userId, o utilizador não fez login.
    if (!req.session.userId) {
        // Poderíamos guardar a URL original para redirecionar depois do login,
        // mas para manter esta ficha simples, redirecionamos sempre para /login.
        return res.redirect("/login");
    }

    // Caso haja userId na sessão, deixamos o pedido continuar.
    next();
}

/**
 * Middleware que carrega o utilizador autenticado (se existir na sessão)
 * e o expõe às views através de `res.locals.currentUser`.
 *
 * PORQUÊ ESTE MIDDLEWARE?
 * - Queremos que qualquer vista EJS consiga saber:
 *     - Se há um utilizador autenticado (`currentUser` não é null).
 *     - Qual é o nome / email / role desse utilizador.
 * - Em vez de ir buscar o utilizador à BD em cada controlador, centralizamos
 *   esta lógica aqui.
 *
 * FLUXO:
 * 1. Inicializa `res.locals.currentUser` a `null` (por omissão, ninguém autenticado).
 * 2. Verifica se existe `req.session.userId`.
 *      - Se NÃO existir, chama `next()` e termina aqui.
 * 3. Se existir:
 *      - Faz `User.findById(req.session.userId)` para carregar o utilizador.
 *      - Se o utilizador for encontrado:
 *          - Cria um objeto “seguro” apenas com os campos necessários
 *            (id, displayName, email, role).
 *          - Atribui-o a `res.locals.currentUser`.
 *      - Se não for encontrado ou der erro, mantém `currentUser = null`.
 *
 * RESULTADO:
 * - Em qualquer ficheiro `.ejs` podemos fazer:
 *
 *     <% if (currentUser) { %>
 *       <p>Olá, <%= currentUser.displayName %>!</p>
 *     <% } else { %>
 *       <a href="/login">Login</a>
 *     <% } %>
 *
 * @param {import("express").Request} req Objeto do pedido HTTP (contém a sessão).
 * @param {import("express").Response} res Objeto da resposta (onde colocamos o currentUser).
 * @param {import("express").NextFunction} next Função para passar ao próximo middleware.
 */
export async function anexarUtilizadorAsViews(req, res, next) {
    // Por omissão, assumimos que não há utilizador autenticado.
    res.locals.currentUser = null;

    // Se não houver userId na sessão, não vale a pena ir à base de dados.
    if (!req.session.userId) {
        return next();
    }

    try {
        // Procurar o utilizador na BD.
        const user = await User.findById(req.session.userId);

        if (!user) {
            // Se o utilizador tiver sido apagado da BD entretanto,
            // limpamos a sessão para evitar estados “fantasma”.
            req.session.userId = undefined;
            req.session.role = undefined;
            return next();
        }

        // Construímos um objeto "seguro" para expor às views.
        // Não incluímos a passwordHash nem outros campos sensíveis.
        res.locals.currentUser = {
            id: user._id.toString(),
            displayName: user.displayName,
            email: user.email,
            role: user.role,
        };
    } catch (error) {
        console.error("Erro ao carregar utilizador da sessão:", error);
        // Em caso de erro, não bloqueamos a app — seguimos como anónimo.
        res.locals.currentUser = null;
    }

    // Continuar para o próximo middleware/rota.
    next();
}
