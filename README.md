# Ficha 5 - ConspiraLab (Teorias da Conspiração com MongoDB e Login)

**Dados rápidos**

-   **Turma:** 12º ano de Informática de Gestão
-   **Conteúdo:** Node.js, Express, EJS, MongoDB, Mongoose, variáveis de ambiente (.env), sessões, cookies, autenticação com bcrypt
-   **Objetivo:** construir uma aplicação web chamada **ConspiraLab**, onde os utilizadores podem explorar teorias da conspiração, ler o detalhe de cada teoria e, após login, gerir o catálogo (CRUD) e adicionar comentários.
-   **Template:** o repositório de partida desta ficha já inclui a estrutura de pastas, o `package.json`, as vistas EJS, a pasta `public/` com o `style.css` e um script de seed em `scripts/seed.js`. Vais completar a lógica passo a passo ao longo deste guia.

    <br>

**Entrega:** submete o link do repositório GitHub com o teu código até à data limite **31 de Dezembro de 2025**.

<br>

![Imagem ilustrativa da página principal](./public/docs/home.png "A página principal da ConspiraLab, com lista de conspirações.") _Figura: Página principal da ConspiraLab_

<br>

## Índice

-   [Teórica](#teórica)
-   [Tutorial passo a passo](#tutorial-passo-a-passo)
-   [Exercícios](#exercícios)
-   [Créditos](#créditos)
-   [Changelog](#changelog)

---

## Teórica

### 1. Variáveis de ambiente e ficheiros `.env`

-   Uma **variável de ambiente** é um valor que vive _fora_ do código e que a aplicação lê em tempo de execução, por exemplo `process.env.PORT` ou `process.env.MONGODB_URI`.
-   Ideia chave:
    -   o **código** assume que certas variáveis existem (`process.env.ALGUMA_COISA`);
    -   os **valores reais** vivem num ficheiro `.env` (em desenvolvimento) ou nas definições do servidor (em produção).
-   Isto permite:
    -   alterar passwords e connection strings sem mudar código;
    -   ter configurações diferentes para desenvolvimento e produção;
    -   evitar meter segredos (passwords, tokens) no GitHub.

Exemplo de ficheiro `.env` típico desta ficha:

```dotenv
MONGODB_URI="mongodb+srv://UTILIZADOR:PASSWORD@cluster.mongodb.net/ficha5?appName=Fichas"
MONGODB_DB_NAME="ficha5"
SESSION_SECRET="frase_longa_dificil_de_adivinhar"
PORT=3000
```

-   Cada linha segue o formato `NOME=valor`, sem espaços à volta do `=`.
-   O pacote `dotenv` lê o `.env` e copia os valores para `process.env`.
-   Nesta ficha usamos a forma curta:

```js
// index.js
import "dotenv/config"; // carrega o .env automaticamente para process.env

// Depois podes usar as variáveis:
const PORT = process.env.PORT || 3000; // usa 3000 se não estiver definida no .env
```

Qualquer variável criada no `.env` fica disponível em `process.env`:

#### `.env` vs `.env.example`

-   Em projetos de equipa usamos normalmente:
    -   `.env.example` → ficheiro de exemplo com os **nomes** das variáveis e valores de demonstração;
    -   `.env` → ficheiro real, com os **valores verdadeiros** na tua máquina.
-   O `.env.example` entra no repositório; o `.env` não (fica no `.gitignore`).
-   Fluxo típico:
    1. `cp .env.example .env`
    2. Abrir `.env` e preencher os valores reais (MongoDB, secret, etc.).

Nesta ficha, se `MONGODB_URI` não estiver definida, a função `connectToDatabase` em `src/config/database.js` lança um erro explicativo para te lembrar de configurar o `.env`.

<br>

### 2. MongoDB — Introdução prática

> **Objetivo geral:** perceber o que é o MongoDB, como organiza dados em documentos e coleções, e como isso se liga ao que vamos fazer na Ficha 5 (teorias da conspiração).  
> **Nível:** 12.º ano (primeiro contacto “a sério” com bases de dados NoSQL).

---

#### 2.1) Porque é que precisamos de uma base de dados?

Nas outras fichas, os dados viviam:

-   num **array em memória**,
-   dentro de um ficheiro `.js`,
-   e desapareciam assim que o servidor era reiniciado.

Isto é giro para começar, mas tem vários problemas:

-   **Não é persistente** → sempre que o servidor reinicia, perdes tudo.
-   **Não escala** → se quisermos muitos dados, o ficheiro/array torna-se difícil de gerir.
-   **Não é partilhado** → não tens vários servidores a aceder ao mesmo “repositório” de dados.

Para resolver isto, usamos uma **base de dados**: um sistema pensado para guardar informação de forma **persistente**, **estruturada** e **segura**, mesmo que o servidor vá abaixo.

Na Ficha 5 vamos usar uma base de dados **MongoDB**, que é do tipo **NoSQL orientada a documentos**.

---

#### 2.2) Modelo relacional vs modelo de documentos (visão rápida)

Antes de falar do MongoDB, convém comparar com a ideia clássica de base de dados relacional (tipo MySQL, PostgreSQL, SQL Server).

##### 2.2.1 Modelo relacional (SQL)

-   Os dados são organizados em **tabelas**.
-   Cada tabela tem **linhas** (registos) e **colunas** (campos).
-   A estrutura é definida por um **esquema rígido** (schema): tipos de dados fixos por coluna.
-   Normalmente usas **SQL** para fazer queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, …).

Exemplo simplificado de tabela `teorias` (relacional):

| id  | titulo                     | resumo                         | complexidade | tags                     |
| --- | -------------------------- | ------------------------------ | ------------ | ------------------------ |
| 1   | Semáforos que leem emoções | Semáforos adaptam-se ao humor… | medium       | transito, ia, vigilancia |

##### 2.2.2 Modelo de documentos (NoSQL / MongoDB)

No MongoDB:

-   Os dados são organizados em **coleções** (collections), não em tabelas.
-   Cada registo é um **documento** no formato **JSON** (na prática BSON, já lá vamos).
-   A estrutura é **flexível**: diferentes documentos da mesma coleção podem ter campos diferentes.
-   Usas uma API própria (ou drivers em várias linguagens) para fazer operações.

Exemplo do mesmo registo em MongoDB (coleção `theories`):

```json
{
    "_id": "666f1234abcde00011223344",
    "title": "Semáforos que leem emoções",
    "slug": "semaforos-que-leem-emocoes",
    "summary": "Semáforos adaptam tempos ao humor da multidão.",
    "content": "Texto completo da teoria...",
    "complexityLevel": "medium",
    "tags": ["transito", "ia", "vigilancia"]
}
```

**Moral da história:**  
Em vez de pensarmos em tabelas e linhas, pensamos em **coleções** e **documentos JSON**.

---

### 2.3) O que é o MongoDB?

MongoDB é um sistema de base de dados NoSQL que:

-   Guarda dados em **documentos** (similar a JSON).
-   Agrupa documentos em **coleções** (collections).
-   Agrupa coleções em **bases de dados** (databases).
-   Pode estar instalado:
    -   numa máquina local,
    -   num servidor,
    -   ou num serviço na cloud (por exemplo **MongoDB Atlas**, que é o que vamos usar).

#### 2.3.1 MongoDB Atlas (o que usamos na Ficha 5)

Em vez de instalares o MongoDB no teu computador, vamos usar o **MongoDB Atlas**, que:

-   é um serviço online (na cloud),
-   permite criar um **cluster** gratuito (Free Tier),
-   dá-te uma **connection string** para o teu servidor Node.js se ligar.

Exemplo de connection string (parecido com o que vês no `.env`):

```bash
mongodb+srv://UTILIZADOR:PASSWORD@fichas.2ju12ca.mongodb.net/ficha5?appName=Fichas
```

Repara nas partes importantes:

-   `mongodb+srv://` → protocolo utilizado para clusters Atlas.
-   `UTILIZADOR:PASSWORD` → credenciais de acesso à base de dados.
-   `@fichas.2ju12ca.mongodb.net` → endereço do cluster (nome pode variar).
-   `/ficha5` → nome da base de dados por omissão.
-   `?appName=Fichas` → parâmetro opcional usado pela aplicação cliente.

---

### 2.4) Estrutura lógica no MongoDB

A hierarquia típica no MongoDB é:

1. **Cluster**
    - Conjunto de servidores onde os dados são guardados (na cloud, no Atlas).
2. **Database** (Base de dados)
    - Agrupamento lógico de coleções relacionadas.
    - Ex.: `ficha5`
3. **Collection** (Coleção)
    - Conjunto de documentos com um propósito semelhante.
    - Ex.: `theories`, `users`, `sessions`
4. **Document** (Documento)
    - Unidade base de dados em MongoDB (equivalente a uma “linha” numa tabela).
    - Formato JSON/BSON, com campos e valores.

Visualmente, para a Ficha 5:

```text
Cluster MongoDB Atlas
└── Base de dados: ficha5
    ├── Coleção: theories
    │   ├── Documento: { _id, title, slug, summary, content, complexityLevel, tags, comments, ... }
    │   └── Documento: { ... }
    ├── Coleção: users
    │   ├── Documento: { _id, email, displayName, passwordHash, role, ... }
    │   └── Documento: { ... }
    └── Coleção: sessions
        ├── Documento: { _id, session, expires }
        └── Documento: { ... }
```

Na prática, o que vamos fazer na ficha é:

-   ligar o Node.js a esta base de dados (`ficha5`),
-   ler/escrever documentos nas coleções `theories` e `users`,
-   deixar o `connect-mongo` tratar da coleção `sessions` para as sessões Express.

---

### 2.5) JSON, BSON e tipos de dados

Os documentos no MongoDB parecem **JSON**, mas são guardados internamente num formato chamado **BSON** (Binary JSON).

#### 2.5.1 JSON (o que já deves conhecer)

-   Formato textual (ficheiros `.json`).
-   Usa pares `chave: valor`.
-   Suporta tipos básicos:
    -   string, number, boolean, null,
    -   arrays,
    -   objetos.

Exemplo JSON válido:

```json
{
    "title": "Semáforos empath",
    "complexityLevel": "medium",
    "views": 12,
    "published": true,
    "tags": ["transito", "vigilancia"]
}
```

#### 2.5.2 BSON (o que o MongoDB usa por dentro)

-   É uma versão binária de JSON, optimizada para armazenamento e desempenho.
-   Permite tipos adicionais, como:
    -   `ObjectId` (tipo específico para `_id`),
    -   `Date` (datas),
    -   etc.

Na prática, quando vês documentos no Atlas, o formato é muito parecido com JSON, mas com algumas diferenças:

-   `_id` aparece como `ObjectId("...")`,
-   datas aparecem com um formato especial (ex.: `ISODate("2025-11-26T00:00:00Z")`).

Exemplo típico de documento de MongoDB no Atlas:

```js
{
  _id: ObjectId("67500b4cf2a123456789abcd"),
  title: "Semáforos que leem emoções",
  complexityLevel: "medium",
  tags: ["transito", "ia", "vigilancia"],
  createdAt: ISODate("2025-11-26T10:23:00.000Z")
}
```

---

### 2.6) Operações básicas (CRUD) em MongoDB

CRUD = **Create, Read, Update, Delete**.  
Vamos ver o equivalente em comandos típicos do MongoDB (como se estivesses numa consola `mongosh`).  
Nota: estes exemplos são **teóricos**, para perceber a lógica; na prática, vamos usar Mongoose no Node.js.

#### 2.6.1. Create (inserir documentos)

```js
// Inserir uma nova teoria
db.theories.insertOne({
    title: "Cafés que trocam açúcar por algoritmos",
    slug: "cafes-que-trocam-acucar-por-algoritmos",
    summary: "Os cafés começaram a cobrar em dados em vez de açúcar.",
    content: "Texto completo da teoria...",
    complexityLevel: "high",
    tags: ["consumo", "dados", "vigilancia"],
    comments: [],
});
```

#### 2.6.2. Read (ler documentos)

```js
// Listar todas as teorias
db.theories.find();

// Procurar teorias com complexidade "high"
db.theories.find({ complexityLevel: "high" });

// Procurar uma teoria pelo slug
db.theories.findOne({ slug: "cafes-que-trocam-acucar-por-algoritmos" });
```

#### 2.6.3. Update (atualizar documentos)

```js
// Atualizar o resumo de uma teoria
db.theories.updateOne(
    { slug: "cafes-que-trocam-acucar-por-algoritmos" },
    { $set: { summary: "Resumo atualizado da teoria." } }
);
```

#### 2.6.4. Delete (apagar documentos)

```js
// Apagar uma teoria
db.theories.deleteOne({
    slug: "cafes-que-trocam-acucar-por-algoritmos",
});
```

Na Ficha 5, estas operações CRUD vão ser feitas **a partir do Node.js**, usando **Mongoose** (que vamos estudar noutro ficheiro).  
Mas a lógica por trás é sempre esta: **criar, ler, atualizar, apagar documentos numa coleção**.

---

### 3. Mongoose: schemas, models e CRUD

O **Mongoose** é uma biblioteca para Node.js que facilita o trabalho com o MongoDB:

-   Permite definir **schemas** (esquemas) com a “forma” dos documentos.
    **schemas** são como “plantas” que dizem que campos um documento deve ter e que tipos de dados usar. Esses campos são depois mapeados para documentos na base de dados.
-   A partir dos schemas, cria **models** (classes) com métodos prontos:
    -   `find`, `findOne`, `findById`, `create`, `findByIdAndDelete`, etc.
-   Integra validações básicas (campos obrigatórios, enum, tamanhos mínimos…).

Na ficha usamos Mongoose sobretudo em:

-   `src/config/database.js` → ligação à base de dados (`mongoose.connect`).
-   `src/models/Theory.js` → schema/model para teorias.
-   `src/models/User.js` → schema/model para utilizadores.

---

#### Fluxo típico Mongoose + Express

1. A rota chega (por exemplo, `GET /teorias`).
2. O controlador usa o model para falar com a BD:
   `const theories = await Theory.find().sort({ createdAt: -1 }).lean();`
   Reparem que `Theory` é o model Mongoose. E esse modelo sabe como falar com a coleção `theories` na BD pois tem o seu esquema.
   Isso permite fazer queries de forma simples, sem escrever comandos MongoDB diretamente. Nós fazemos a pergunta ao modelo `Theory`, ele traduz isso de forma a falar com a BD e devolve os resultados.
3. O controlador chama `res.render("theories/list", { theories, ... })`.
4. A view EJS mostra os dados ao utilizador.

---

#### Boas práticas básicas com Mongoose

1. **Um ficheiro por model**

    - `User.js`, `Theory.js`, etc.
    - Facilita organização e reutilização.

2. **Não misturar lógica da BD com Express**

    - Rotas no sítio certo (`routes`).
    - Lógica de negócio nos `controllers`.
    - Ligação à BD em `config/database.js`.

3. **Validar dados à entrada**

    - Validações simples no controlador (campos obrigatórios, tamanhos mínimos).
    - Validações de estrutura no schema Mongoose.

4. **Usar try/catch nas operações assíncronas**

    - Qualquer chamada `await Model.find(...)`, `await Model.create(...)`, etc. deve estar num `try/catch`.
    - Em caso de erro, regista no `console` e mostra uma mensagem amigável ao utilizador.

5. **Usar `.lean()` quando só precisas de ler**

    - Torna as respostas um pouco mais rápidas e simples de passar às views.
    - O `.lean()` converte os documentos Mongoose em objetos JS simples. Isso é útil quando só precisas de ler os dados e não vais usar métodos Mongoose neles. Assim podes passar diretamente para as views EJS ou usar lógica diretamente em JS.

6. **Separar ambiente de desenvolvimento e produção**
    - Em projetos reais, as connection strings e nomes de BD podem ser diferentes.
    - Tudo configurado via `.env` (sem escrever passwords no código).

<br>

### 4. Autenticação, sessões, cookies e bcrypt

> Objetivo: perceber como funciona o **login** numa aplicação web com Express, como é que o servidor “se lembra” de quem está autenticado, porque é que usamos **cookies** e **sessões**, e como é que o **bcrypt** ajuda a guardar passwords de forma segura. No fim, vais conseguir perceber o que está a acontecer no código desta ficha.

Numa aplicação como o **ConspiraLab** (Ficha 5), temos duas grandes áreas:

-   **Zona pública**: qualquer pessoa pode aceder.
    -   Ex.: página de lista de teorias, detalhe de uma teoria.
-   **Zona privada / administração**: só alguns utilizadores podem aceder.
    -   Ex.: `/admin/teorias` para criar, editar e apagar teorias.

Para separar estas áreas, precisamos de **autenticar** utilizadores: confirmar quem são e, em alguns casos, que permissões têm (se são admin ou não).

Sem autenticação:

-   qualquer pessoa podia entrar na área de administração,
-   qualquer um podia editar/apagar teorias,
-   não sabíamos “quem comentou o quê”.

---

Nesta ficha introduzimos autenticação “a sério”... Mas ainda muito simples e básica:

-   **Autenticação** → provar quem és (login com email + password).
-   **Autorização** → decidir ao que tens acesso (rotas públicas vs admin).
-   **Sessões** → o servidor “lembra-se” de quem está autenticado entre pedidos.
-   **Cookies** → o browser guarda o ID da sessão e envia-o em cada pedido.
-   **bcrypt** → biblioteca para guardar passwords de forma segura (hash).

#### Porque é que precisamos de sessões?

-   HTTP é **stateless**: cada pedido é independente; o servidor não se lembra do anterior.
-   Depois de fazeres login, precisamos que o servidor saiba “quem és” em pedidos seguintes (`/admin/teorias`, `/teorias/:slug/comments`, etc.).
    Por exemplo, imagina que fazes login e depois vais a `/admin/teorias` para ver a lista de teorias. O servidor precisa de saber que és tu (utilizador autenticado) e não um visitante anónimo. E como o `/admin/teorias` é um pedido HTTP separado do login, o servidor não tem essa informação automaticamente uma vez que HTTP é stateless.
-   Solução:
    -   o servidor guarda dados da sessão (ex.: `{ userId, role }`) numa store (MongoDB);
    -   o browser guarda apenas um cookie com o **ID da sessão**;
    -   em cada pedido, o cookie é enviado e o `express-session` reconstrói `req.session`.

---

#### Mas... O que é um cookie? E uma sessão? E uma store? E como é que isto tudo funciona junto?

-   **Cookie**: pequeno ficheiro de texto guardado pelo browser, enviado em cada pedido ao servidor. Usado para guardar o ID da sessão (e outras coisas).
-   **Sessão**: dados guardados no servidor que representam o estado de um utilizador autenticado (ex.: `{ userId, role }`).
-   **Store**: local onde as sessões são guardadas no servidor (ex.: MongoDB, memória, ficheiro). No nosso caso usamos `connect-mongo` para guardar sessões no MongoDB.

Fluxo típico de autenticação com sessões e cookies:

1. O utilizador faz login com email + password.
2. O servidor valida as credenciais.
3. Se estiverem corretas, o servidor cria uma **sessão** (ex.: `{ userId: "123", role: "admin" }`) e guarda-a na **store** (MongoDB).
4. O servidor envia um **cookie** ao browser com o ID da sessão (ex.: `connect.sid=abcdef123456`).
5. O browser guarda o cookie, associando-o ao domínio do servidor.
6. Em pedidos seguintes (ex.: `/admin/teorias`), o browser envia o cookie com o ID da sessão.
7. O servidor lê o cookie, recupera a sessão da store (MongoDB) e popula `req.session` com os dados do utilizador.
8. A partir daí, sempre que o utilizador fizer pedidos, o servidor verifica `req.session` para saber quem é e que permissões tem.

---

#### Passwords, hashing e bcrypt

O que é uma password na realidade?

-   É um segredo que o utilizador conhece e que prova a sua identidade.

Mas, para o servidor reconhecer o segredo e saber a quem pertence, esse segredo tem que ser guardado de alguma forma segura e controlada.

Para isso usamos o hashing e a biblioteca **bcrypt**:

-   Hashing é um processo que transforma a password num valor fixo (hash) que não pode ser revertido para a password original. Ou seja, a partir do momento em que guardamos o hash, não conseguimos descobrir a password original.

Exemplo ilustrativo (não real):

-   Password: `"admin123"`
-   Hash: `"$2b$10$6sALgrw9JtJXIOY/..."`

-   bcrypt é uma biblioteca que implementa um algoritmo de hashing seguro, pensado especificamente para passwords. Ele adiciona “sal” (salt) e é lento o suficiente para dificultar ataques de força bruta.

E como funcionam em conjunto?

-   Primeiro, precisamos de perceber que nunca guardamos passwords em texto simples na base de dados. Isto é uma má prática de segurança, porque se a base de dados for comprometida, todas as passwords dos utilizadores ficariam expostas.

-   Em vez disso:

    -   Quando um utilizador cria uma conta ou altera a sua password, transformamos a password num **hash** usando bcrypt. Este hash é uma representação segura da password.

    -   Guardamos esse hash na base de dados, num campo como `passwordHash`.

    -   Quando o utilizador tenta fazer login, comparamos a password que ele escreveu com o hash guardado na base de dados usando `bcrypt.compare`. Esta função verifica se a password corresponde ao hash sem revelar a password original.

    -   O `bcrypt.compare` aplica o mesmo processo de hashing à password fornecida e compara o resultado com o hash armazenado. Se corresponderem, significa que a password está correta.

    -   Ou seja, no fundo estamos sempre a comparar hashes, nunca as passwords em si.

---

#### Proteger rotas com middlewares

O que é o `requireAuth`?

É um **middleware** que verifica se o utilizador está autenticado antes de deixar avançar para certas rotas.

Exemplo simplificado (o que tens na ficha):

```js
export function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}
```

Lógica:

-   Se `req.session.userId` **não** existir:
    -   o utilizador **não está autenticado** → redirecionamos para `/login`.
-   Se existir:
    -   chamamos `next()` → deixamos avançar para o controlador final.

### 5. Resumo rápido da teoria

-   Usa **variáveis de ambiente** e ficheiros `.env` para guardar segredos e configurações (BD, secrets, portas…).
-   Guarda dados persistentes numa base de dados **MongoDB**, organizada em documentos.
-   Usa **Mongoose** para definir schemas/models e fazer CRUD de forma mais simples.
-   Implementa **autenticação** com:
    -   sessões (`express-session` + `connect-mongo`);
    -   cookies de sessão no browser;
    -   passwords guardadas com `bcrypt`.
-   Protege rotas sensíveis com middlewares (`exigirAutenticacao`) e expõe o utilizador às views (`anexarUtilizadorAsViews`).

Estas ideias vão aparecer ao longo do tutorial na prática, quando fores ligando cada rota ao controlador, modelo e vista correspondente.

---

## Tutorial passo a passo

> **NOTA IMPORTANTE:**  
> O projeto da ficha já traz um **template** com:
>
> -   Vistas EJS completas em `src/views/`
> -   A pasta `public/` com `style.css`
> -   O `package.json` com dependências e scripts (`start`, `dev`, `seed`)
> -   A estrutura de pastas (`src/`, `scripts/`, etc.)
> -   O script de seed em `scripts/seed.js`
>
> Sempre que vires código indicado como “já vem no template”, isso significa que **já está no projeto inicial**, mas é incluído aqui para perceberes o que faz e onde se encaixa.

<br>

> **NOTA IMPORTANTE:**
> Ao longo deste tutorial vais ter que editar ficheiros e colocar código entre blocos de código já existentes.
> <br> O local exato onde colocar o código é indicado em cada passo através da explicação dada antes do bloco de código.
> <br> Além disso, **o local exato é marcado com o seguinte bloco de comentário**:

```js
/* ----------------------------------------------------

 🟡 🟡 ⬇ INSERIR AQUI A ** Função ** ⬇ 🟡 🟡

---------------------------------------------------- */
```

<br>

### 0) Preparação do template e ambiente

Ficheiros e pastas principais incluídos no template:

| Ficheiro/Pasta              | Descrição                                                                |
| --------------------------- | ------------------------------------------------------------------------ |
| `index.js`                  | Ponto de entrada do servidor (arranque, ligação à BD, `app.listen`).     |
| Pasta `src/`                | Código fonte da aplicação (configuração, modelos, controladores, rotas). |
| `src/app.js`                | Configuração da app Express (views, static, sessões, rotas, 404).        |
| Pasta `src/models/`         | Modelos Mongoose (`User.js`, `Theory.js`).                               |
| Pasta `src/routes/`         | Routers (`authRoutes.js`, `theoryRoutes.js`, `adminRoutes.js`).          |
| Pasta `src/views/`          | Vistas EJS (públicas, admin, partials, 404, 500).                        |
| Pasta `public/`             | Ficheiros estáticos (CSS, imagens, ícones).                              |
| `scripts/seed.js`           | Script de seed para criar utilizadores e teorias de exemplo.             |
| `package.json`              | Dependências e scripts npm.                                              |
| `.env.example` (se existir) | Exemplo de configuração das variáveis de ambiente.                       |

Passos iniciais:

1. Garante que tens Node.js 18+ e npm instalados.
2. Cria um repositório novo com base no template desta ficha:
    - GitHub Codespaces: botão **Code** > **Create codespace**.
    - VS Code local: `git clone <URL_DO_REPO_DA_TURMA>`, abrir pasta e instalar extensões sugeridas (JS/ESLint/EJS).
3. No terminal, dentro da pasta do projeto:

```bash
npm install
```

4. Copia o ficheiro de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

5. Abre o `.env` e confirma/ajusta:

    - `MONGODB_URI` → connection string para o teu cluster MongoDB Atlas.
    - `MONGODB_DB_NAME="ficha5"` (ou o nome dado pelo professor).
    - `SESSION_SECRET` → escolhe uma frase longa aleatória.
    - `PORT=3000` (ou outra livre).

6. Para testar que o arranque base funciona:

```bash
npm run dev
```

Abre `http://localhost:3000/` ou `http://localhost:3000/teorias`. Se o seed ainda não tiver sido corrido, podes ver uma página vazia ou mensagens de erro da BD (vamos tratar disso já a seguir).

---

## IMPLEMENTAÇÃO AINDA NÃO DISPONÍVEL

---

## Exercícios

Algumas ideias para treinar e explorar um pouco mais a aplicação:

1. **Filtrar teorias por nível de complexidade**

    - Adiciona à lista pública uma zona de filtro (por exemplo, links ou um `<select>`) que permita mostrar apenas teorias com `complexityLevel = "low"`, `"medium"` ou `"high"`.
    - Implementa uma rota que leia um parâmetro de query (`/teorias?level=high`) e adapte a query Mongoose (`Theory.find({ complexityLevel: level })`).

2. **Ordenação alternativa**

    - Cria um parâmetro de query `sort` (`/teorias?sort=oldest` ou `?sort=most-commented`).
    - Modifica `listarTeoriasPublicas` para, consoante o valor de `sort`, ordenar:
        - por `createdAt` ascendente (mais antigas primeiro);
        - por número de comentários (mais comentadas primeiro).

3. **Limitar comentários por teoria**

    - Adiciona ao schema de `Theory` (ou ao controlador) uma regra simples:
        - se uma teoria já tiver, por exemplo, mais de 50 comentários, não aceitar novos comentários e mostrar uma mensagem tipo “Limite de comentários atingido nesta teoria”.

4. **Mostrar “últimos comentários” na lista pública**

    - Na página de lista, para cada teoria, mostra o autor e um excerto do comentário mais recente (se existir).
    - Isto implica olhar para `t.comments` na vista `theories/list.ejs` e, se houver, mostrar apenas o último elemento do array.

5. **Desafio extra (opcional): registar novos utilizadores**
    - Cria um novo formulário `GET /registo` e `POST /registo`:
        - valida email, displayName e password;
        - gera o `passwordHash` com bcrypt;
        - cria um novo documento `User`.
    - Garante que não é possível criar dois utilizadores com o mesmo email.
    - Pensa bem na experiência de utilizador (mensagens de erro, redirecionamentos, etc.).

---

## Créditos

-   **Autor:** Professor de Informática de Gestão da EPMS
-   **Base do template:** projeto ConspiraLab (Node.js, Express, EJS, MongoDB, Mongoose, autenticação com sessões e bcrypt)

---

## Changelog

-   **V1.0 \| 2025-11-26**: versão inicial do guia de implementação da Ficha 5 (ConspiraLab) com teoria, tutorial passo a passo, exercícios e integração com o template fornecido.
